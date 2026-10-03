import { buildTypeCatalog } from './types.mjs';
import { sanitizeColor, resolveEntityColor } from './colors.mjs';
import { escHtml, escAttr } from './escape.mjs';
import { foldText } from './text.mjs';
import { t } from './i18n.mjs';
import { toggleEntitySelection, matchesSearch, matchesType, matchesEntities, countTypes, visibleTypeKeys } from './filters.mjs';
import { resolveTile } from './tiles.mjs';
import { SVG_PHONE, SVG_NO_RESULTS, SVG_FULLSCREEN_ENTER, SVG_FULLSCREEN_EXIT, SVG_HINT } from './icons.mjs';
import { autocompleteMethods } from './map-autocomplete.mjs';
import { carouselMethods } from './map-carousel.mjs';
import { markersMethods } from './map-markers.mjs';
import { parsePlaceParam, findPlaceByParam, findPlaceById, placeLinkValue, withPlaceParam } from './deep-link.mjs';

const $ = window.jQuery;

class MappedPlacesMap {
    constructor(container) {
        this.$container = $(container);
        this.mapId      = this.$container.attr('id');
        this.map        = null;
        this.markers    = null;
        this.markerMap  = {};
        this._markerCache = {};

        // Cache-based data management
        this.allPlaces      = [];
        this.filteredPlaces  = [];
        this.typeCatalog            = {};
        this.searchTerm             = '';
        this.activeFilter           = '';

        // Galerie/carrousel : cache des galeries par place.id pour éviter
        // de refetcher /etablissement/{id} à chaque ouverture de popup.
        this._galleryCache          = {};

        // Pastilles d'entités : { slug: true } pour chaque entité isolée.
        // Objet vide = aucun filtre, toutes les entités visibles.
        this.activeEntities          = {};

        // Geolocation state
        this.userLocation = null;
        this.userMarker   = null;
        this.userCircle   = null;

        // Timers and handlers
        this._searchTimer = null;
        this._escHandler  = null;

        // Cycle de vie : l'editeur Elementor peut detruire l'instance
        // pendant que la requete de donnees est encore en vol. On garde
        // de quoi l'annuler et de quoi ignorer les callbacks tardifs.
        this._destroyed   = false;
        this._dataRequest = null;

        // Configuration from data attributes
        this.config = {
            centerLat:  parseFloat(this.$container.data('center-lat')) || 0,
            centerLng:  parseFloat(this.$container.data('center-lng')) || 0,
            zoom:       parseInt(this.$container.data('zoom'))         || 8,
            tileStyle:  this.$container.data('tile-style')             || 'positron',
            // Sans ajustement, centre et zoom du réglage restent en place.
            fitBounds:  String(this.$container.data('fit-bounds')) !== 'false',
        };

        this.init();
    }

    /* ============================================================ */
    /*  INIT                                                         */
    /* ============================================================ */

    init() {
        this.initMap();
        this.initMarkerCluster();
        this.bindEvents();
        this.initControls();
        this.loadAllData();
    }

    /* ============================================================ */
    /*  MAP INIT                                                     */
    /* ============================================================ */

    initMap() {
        var mapCanvas = this.$container.find('.mapl-map-canvas')[0];

        this.map = L.map(mapCanvas, {
            center:          [this.config.centerLat, this.config.centerLng],
            zoom:            this.config.zoom,
            scrollWheelZoom: true,
            zoomControl:     false,
            maxZoom:         19,
        });

        // Boutons de zoom en bas à droite pour libérer le coin haut
        // (où sont les pastilles d'entités flottantes).
        L.control.zoom({ position: 'bottomright' }).addTo(this.map);

        const vectorReady = (typeof L.maplibreGL === 'function');
        const tile = resolveTile(this.config.tileStyle, vectorReady);

        if (tile.type === 'vector') {
            this.addVectorBasemap(tile);
            return;
        }

        this.addRasterBasemap(tile);
    }

    /**
     * Fond RASTER classique (L.tileLayer).
     */
    addRasterBasemap(tile) {
        const options = {
            attribution: tile.attribution,
            maxZoom:     tile.maxZoom,
        };
        if (tile.subdomains) {
            options.subdomains = tile.subdomains;
        }

        L.tileLayer(tile.url, options).addTo(this.map);
    }

    /**
     * Fond VECTORIEL rendu via maplibre-gl-leaflet (Plan IGN epure/gris).
     *
     * maplibre-gl-leaflet ne repeint pas la carte GL au premier rendu
     * (canvas blanc tant qu'on n'a pas interagi) : son _update appelle un
     * gl.update() qui n'existe plus dans maplibre recent. La vue/transform
     * GL est pourtant deja correcte - il suffit de forcer un repaint
     * (resize + triggerRepaint) au chargement. En mode embarque, la boucle
     * de rendu ne demarre pas (les evenements 'load'/'idle' GL ne se
     * declenchent jamais) et la carte GL peut ne pas etre prete a l'init.
     * On la recupere donc PARESSEUSEMENT a chaque tick et on repeint
     * jusqu'a ce que le style soit charge, puis quelques repaints de plus
     * pour peindre les tuiles, avec un plafond de securite.
     */
    addVectorBasemap(tile) {
        const glLayer = L.maplibreGL({
            style:       tile.url,
            attribution: tile.attribution,
        }).addTo(this.map);

        if (this.map.attributionControl && tile.attribution) {
            this.map.attributionControl.addAttribution(tile.attribution);
        }

        var ticks = 0, afterStyle = 0;
        var iv = setInterval(function () {
            ticks++;
            var gm = glLayer.getMaplibreMap ? glLayer.getMaplibreMap() : null;
            if (gm) {
                try {
                    gm.resize();
                    if (typeof gm.triggerRepaint === 'function') { gm.triggerRepaint(); }
                } catch (e) { // eslint-disable-line no-unused-vars
                    // Carte MapLibre déjà retirée (widget détruit) : rien à redessiner.
                }
                if (gm.isStyleLoaded && gm.isStyleLoaded()) { afterStyle++; }
            }
            if (afterStyle >= 6 || ticks >= 50) { clearInterval(iv); }
        }, 300);
    }

    /* ============================================================ */
    /*  MARKER CLUSTER - modern white style                          */
    /* ============================================================ */

    /* ============================================================ */
    /*  EVENT BINDINGS                                               */
    /* ============================================================ */

    bindEvents() {
        var self = this;

        /* ---- Search: desktop sidebar ---- */
        this.$container.on('input', '.mapl-sidebar-header .mapl-search-input', function() {
            self.onSearch($(this).val(), 'desktop');
        });
        this.$container.on('click', '.mapl-sidebar-header .mapl-search-btn', function() {
            var val = self.$container.find('.mapl-sidebar-header .mapl-search-input').val();
            self.onSearch(val, 'desktop');
        });
        this.$container.on('keypress', '.mapl-sidebar-header .mapl-search-input', function(e) {
            if (e.which === 13) {
                self.onSearch($(this).val(), 'desktop');
            }
        });

        /* ---- Search: mobile toolbar ---- */
        this.$container.on('input', '.mapl-mobile-toolbar .mapl-search-input', function() {
            self.onSearch($(this).val(), 'mobile');
        });
        this.$container.on('click', '.mapl-mobile-toolbar .mapl-search-btn', function() {
            var val = self.$container.find('.mapl-mobile-toolbar .mapl-search-input').val();
            self.onSearch(val, 'mobile');
        });
        this.$container.on('keypress', '.mapl-mobile-toolbar .mapl-search-input', function(e) {
            if (e.which === 13) {
                self.onSearch($(this).val(), 'mobile');
            }
        });

        /* ---- Filter dropdown: desktop ---- */
        this.$container.on('change', '.mapl-sidebar-header .mapl-filter-select', function() {
            self.onFilter($(this).val(), 'desktop');
        });

        /* ---- Filter dropdown: mobile ---- */
        this.$container.on('change', '.mapl-mobile-toolbar .mapl-filter-select', function() {
            self.onFilter($(this).val(), 'mobile');
        });

        /* ---- Establishment card click ---- */
        this.$container.on('click', '.mapl-place-card', function(e) {
            // Do not fire card click when user clicks a phone link
            if ($(e.target).closest('.mapl-place-phone').length) return;
            var id = parseInt($(this).data('id'), 10);
            self.focusPlace(id);
        });

        /* ---- Establishment card hover -> highlight marker ---- */
        this.$container.on('mouseenter', '.mapl-place-card', function() {
            var id = parseInt($(this).data('id'), 10);
            self.highlightMarker(id, true);
        });
        this.$container.on('mouseleave', '.mapl-place-card', function() {
            var id = parseInt($(this).data('id'), 10);
            self.highlightMarker(id, false);
        });

        /* ---- Entity pills: isoler / ajouter / retirer une entité ---- */
        this.$container.on('click', '.mapl-entity-pill', function() {
            var slug = String($(this).attr('data-entity'));
            self.activeEntities = toggleEntitySelection(self.activeEntities, slug);
            self.syncEntityPills();
            self.renderAll();
        });

        /* ---- Entity pills: « Tout afficher » ---- */
        this.$container.on('click', '.mapl-entity-reset', function() {
            self.activeEntities = {};
            self.syncEntityPills();
            self.renderAll();
        });

        /* ---- Geolocation ---- */
        this.$container.on('click', '.mapl-geoloc-btn', function() {
            self.handleGeolocation();
        });

        /* ---- Autocomplete: live suggestions (scoped to active search row) ---- */
        this.$container.on('input', '.mapl-search-input', function() {
            var $input = $(this);
            var $row   = $input.closest('.mapl-search-row');
            var val    = $input.val();
            clearTimeout(self._acTimer);
            self._acTimer = setTimeout(function() {
                self.renderAutocompleteSuggestions(val, $row);
            }, 200);
        });

        /* ---- Autocomplete: click a suggestion ---- */
        this.$container.on('click', '.mapl-autocomplete-item', function() {
            self.selectSuggestion($(this).data('place-id'));
        });

        /* ---- Autocomplete: keyboard navigation ---- */
        this.$container.on('keydown', '.mapl-search-input', function(e) {
            var $row      = $(this).closest('.mapl-search-row');
            var $dropdown = $row.find('.mapl-autocomplete-results');
            if (!$dropdown.length || $dropdown.is('[hidden]')) return;

            if (e.key === 'ArrowDown')      { e.preventDefault(); self.navigateAutocomplete(1, $row); }
            else if (e.key === 'ArrowUp')   { e.preventDefault(); self.navigateAutocomplete(-1, $row); }
            else if (e.key === 'Enter') {
                // Pick the highlighted item, or fall back to the first suggestion
                var $target = $dropdown.find('.mapl-autocomplete-item.is-highlighted').first();
                if (!$target.length) {
                    $target = $dropdown.find('.mapl-autocomplete-item').first();
                }
                if ($target.length) {
                    e.preventDefault();
                    self.selectSuggestion($target.data('place-id'));
                }
            }
            else if (e.key === 'Escape') { self.closeAutocomplete(); }
        });

        /* ---- Autocomplete: close on outside click ---- */
        $(document).on('click.maplAC_' + this.mapId, function(e) {
            if (!$(e.target).closest('.mapl-search-row').length) {
                self.closeAutocomplete();
            }
        });

        /* ---- Carrousel : lazy-fetch de la galerie à l'ouverture du popup ---- */
        this.map.on('popupopen', function(e) {
            var $node    = $(e.popup._contentNode);
            var $content = $node.find('.mapl-popup-content');
            var placeId   = parseInt($content.data('place-id'), 10);
            if (!placeId) return;

            if (self._galleryCache[placeId]) {
                self.injectGalleryIntoPopup($node, self._galleryCache[placeId]);
                return;
            }

            // Annuler tout fetch galerie encore en cours pour éviter
            // qu'une réponse en retard n'injecte une mauvaise galerie.
            if (self._galleryXHR && self._galleryXHR.readyState !== 4) {
                self._galleryXHR.abort();
            }

            self._galleryXHR = $.ajax({
                url:    mappedPlacesConfig.restUrl + 'places/' + placeId,
                method: 'GET',
                success: function(response) {
                    self._galleryCache[placeId] = response.gallery || [];
                    self.injectGalleryIntoPopup($node, self._galleryCache[placeId]);
                },
                error: function(xhr, status) {
                    if (status === 'abort') return;
                    self.injectGalleryIntoPopup($node, []);
                },
            });
        });
    }

    /* ============================================================ */
    /*  CONTROLS: FULLSCREEN, MOBILE DRAWER, ESC                     */
    /* ============================================================ */

    initControls() {
        var self = this;

        /* ---- Fullscreen toggle ---- */
        this.$container.on('click', '.mapl-fullscreen-btn', function() {
            self.toggleFullscreen();
        });

        /* ---- Mobile sidebar toggle ---- */
        this.$container.on('click', '.mapl-sidebar-toggle', function() {
            self.toggleDrawer();
        });

        /* ---- Drawer handle (tap to close) ---- */
        this.$container.on('click', '.mapl-drawer-handle', function() {
            self.closeDrawer();
        });

        /* ---- ESC key: exit fullscreen ---- */
        this._escHandler = function(e) {
            if (e.key === 'Escape' && self.$container.hasClass('mapl-fullscreen')) {
                self.exitFullscreen();
            }
        };
        $(document).on('keydown.maplmap_' + this.mapId, this._escHandler);
    }

    /* ============================================================ */
    /*  FULLSCREEN                                                   */
    /* ============================================================ */

    toggleFullscreen() {
        if (this.$container.hasClass('mapl-fullscreen')) {
            this.exitFullscreen();
        } else {
            this.enterFullscreen();
        }
    }

    enterFullscreen() {
        this.$container.addClass('mapl-fullscreen');
        $('body').addClass('mapl-body-fullscreen');

        var $btn = this.$container.find('.mapl-fullscreen-btn');
        $btn.attr('aria-label', t('exitFullscreen'));
        $btn.html(SVG_FULLSCREEN_EXIT);

        var map = this.map;
        setTimeout(function() { map.invalidateSize(); }, 50);
    }

    exitFullscreen() {
        this.$container.removeClass('mapl-fullscreen');
        $('body').removeClass('mapl-body-fullscreen');

        var $btn = this.$container.find('.mapl-fullscreen-btn');
        $btn.attr('aria-label', t('enterFullscreen'));
        $btn.html(SVG_FULLSCREEN_ENTER);

        var map = this.map;
        setTimeout(function() { map.invalidateSize(); }, 50);
    }

    /* ============================================================ */
    /*  MOBILE DRAWER                                                */
    /* ============================================================ */

    toggleDrawer() {
        var $sidebar = this.$container.find('.mapl-map-sidebar');
        var $toggle  = this.$container.find('.mapl-sidebar-toggle span');
        var isOpen   = $sidebar.hasClass('mapl-drawer-open');

        if (isOpen) {
            $sidebar.removeClass('mapl-drawer-open');
            $toggle.text(t('filters'));
            this.$container.find('.mapl-sidebar-toggle')
                .attr('aria-label', t('openFilters'));
        } else {
            $sidebar.addClass('mapl-drawer-open');
            $toggle.text(t('close'));
            this.$container.find('.mapl-sidebar-toggle')
                .attr('aria-label', t('closeFilters'));
        }
    }

    closeDrawer() {
        var $sidebar = this.$container.find('.mapl-map-sidebar');
        if ($sidebar.hasClass('mapl-drawer-open')) {
            $sidebar.removeClass('mapl-drawer-open');
            this.$container.find('.mapl-sidebar-toggle span')
                .text(t('filters'));
        }
    }

    /* ============================================================ */
    /*  DATA LOADING - single request, cache everything              */
    /* ============================================================ */

    /**
     * Loads all etablissements once at startup and populates
     * the local cache. All subsequent filtering is done client-side.
     */
    loadAllData() {
        var self = this;
        this.showLoading(true);

        this._dataRequest = $.ajax({
            url:     mappedPlacesConfig.restUrl + 'places',
            method:  'GET',
            // Route publique : pas de nonce. Périmé (page en cache HTML
            // depuis plus de 24 h), il ferait répondre 403 à WordPress.
            success: function(response) {
                if (self._destroyed) return;

                self.typeCatalog           = buildTypeCatalog(response.types);
                self._markerCache          = {}; // nouvelle liste : marqueurs à reconstruire
                self.allPlaces     = response.places || [];
                self.filteredPlaces = self.allPlaces.slice();
                self.buildEntityPills();
                self.renderAll();
                self.showLoading(false);
                self.applyDeepLinkSelection();
            },
            error: function(xhr, status) {
                // Requête annulée par destroy() : rien à signaler.
                if (self._destroyed || status === 'abort') return;
                self.showLoading(false);
                self.showToast(t('loadError'));
            },
        });
    }

    /* ============================================================ */
    /*  SEARCH & FILTER                                              */
    /* ============================================================ */

    /**
     * Debounced search handler. Syncs inputs between desktop and
     * mobile, then re-renders everything client-side.
     *
     * @param {string} val    - Search input value
     * @param {string} source - 'desktop' or 'mobile'
     */
    onSearch(val, source) {
        var self = this;
        clearTimeout(this._searchTimer);
        this._searchTimer = setTimeout(function() {
            self.searchTerm = val.trim();

            // Sync the other search input
            if (source === 'desktop') {
                self.$container.find('.mapl-mobile-toolbar .mapl-search-input').val(val);
            } else {
                self.$container.find('.mapl-sidebar-header .mapl-search-input').val(val);
            }

            self.renderAll();
        }, 200);
    }

    /* ============================================================ */
    /*  AUTOCOMPLETE                                                 */
    /* ============================================================ */

    /* ============================================================ */
    /*  CARROUSEL (v2.6)                                             */
    /* ============================================================ */

    /**
     * Filter dropdown handler. Syncs dropdowns between desktop and
     * mobile, then re-renders everything client-side.
     *
     * @param {string} val    - Selected filter value (type key or '')
     * @param {string} source - 'desktop' or 'mobile'
     */
    onFilter(val, source) {
        this.activeFilter = val;

        // Sync the other dropdown
        if (source === 'desktop') {
            this.$container.find('.mapl-mobile-toolbar .mapl-filter-select').val(val);
        } else {
            this.$container.find('.mapl-sidebar-header .mapl-filter-select').val(val);
        }

        this.renderAll();
    }

    /**
     * Returns the filtered subset of allPlaces based
     * on the current search, type filter and entity selection.
     *
     * @returns {Array} Filtered etablissements
     */
    getFiltered() {
        var type = this.activeFilter;
        return this.getFacetBase().filter(function(e) {
            return matchesType(e, type);
        });
    }

    /**
     * Établissements retenus par tous les filtres sauf le type : base des
     * compteurs du filtre « Types ».
     *
     * @returns {Array}
     */
    getFacetBase() {
        var q         = foldText((this.searchTerm || '').trim());
        var selection = this.activeEntities;
        return this.allPlaces.filter(function(e) {
            return matchesSearch(e, q) && matchesEntities(e, selection);
        });
    }

    /**
     * Rebuild the type dropdowns (desktop + mobile) with faceted counts:
     * each type shows how many results it would give with the current
     * search and entity selection. Types at 0 are hidden, except the
     * selected one, which stays selected.
     */
    updateTypeCounts() {
        var base     = this.getFacetBase();
        var counts   = countTypes(base);
        var selected = this.activeFilter;
        var allLabel = t('filterAll');

        var options = '<option value="">' + escHtml(allLabel) + ' (' + base.length + ')</option>';
        var self = this;
        visibleTypeKeys(counts, Object.keys(this.typeCatalog), selected).forEach(function(k) {
            options += '<option value="' + escAttr(k) + '">'
                + escHtml(self.getTypeConfig(k).label) + ' (' + (counts[k] || 0) + ')</option>';
        });

        this.$container.find('.mapl-filter-select').html(options).val(selected);
    }

    /**
     * Builds the floating entity filter pills from the cached data.
     * Extracts unique entities and injects pills into the map wrapper.
     * All entities start visible (neutral state, no pill selected).
     */
    buildEntityPills() {
        var entities = {};
        this.allPlaces.forEach(function(e) {
            if (e.entity && e.entity.slug && e.entity.name) {
                if (!entities[e.entity.slug]) {
                    entities[e.entity.slug] = {
                        name:  e.entity.name,
                        color: sanitizeColor(e.entity.color),
                    };
                }
            }
        });

        var slugs = Object.keys(entities);
        if (!slugs.length) return;

        // Ne garder de la sélection courante que les entités encore présentes
        var current = this.activeEntities;
        this.activeEntities = slugs.reduce(function(next, slug) {
            if (current[slug] === true) next[slug] = true;
            return next;
        }, {});

        var hint     = t('entityHint');
        var resetTxt = t('entityReset');

        // Build pills HTML, précédées d'une phrase guide pour rendre
        // le filtrage par entité plus intuitif.
        var html = '<div class="mapl-entity-section">'
            + '<p class="mapl-entity-hint">'
            + SVG_HINT
            + '<span>' + escHtml(hint) + '</span>'
            + '<button type="button" class="mapl-entity-reset" hidden>'
            + escHtml(resetTxt)
            + '</button>'
            + '</p>'
            + '<div class="mapl-entity-pills">';
        slugs.forEach(function(slug) {
            var ent = entities[slug];
            html += '<button type="button" class="mapl-entity-pill" aria-pressed="false" '
                + 'data-entity="' + escAttr(slug) + '" '
                + 'style="--pill-color:' + ent.color + '">'
                + '<span class="mapl-entity-pill-dot"></span>'
                + escHtml(ent.name)
                + '</button>';
        });
        html += '</div></div>';

        // Idempotent : retirer une ancienne section avant d'injecter
        this.$container.find('.mapl-entity-section').remove();
        this.$container.find('.mapl-map-canvas').before(html);
        this.syncEntityPills();
    }

    /**
     * Reflect the entity selection on the pills: selected pills stay
     * filled (aria-pressed), the others turn to outline while a selection
     * exists. « Tout afficher » only shows when a filter is active.
     */
    syncEntityPills() {
        var selection    = this.activeEntities;
        var hasSelection = Object.keys(selection).length > 0;

        this.$container.find('.mapl-entity-pill').each(function() {
            var selected = selection[String($(this).attr('data-entity'))] === true;
            $(this)
                .toggleClass('is-selected', selected)
                .toggleClass('inactive', hasSelection && !selected)
                .attr('aria-pressed', selected ? 'true' : 'false');
        });

        this.$container.find('.mapl-entity-reset').prop('hidden', !hasSelection);
    }

    /* ============================================================ */
    /*  RENDER ALL                                                   */
    /* ============================================================ */

    /**
     * Master render function. Recomputes the filtered list, then
     * re-renders markers, establishment cards, and the results count.
     */
    renderAll() {
        // Filet pour tous les callbacks asynchrones (recherche, filtres,
        // geolocalisation) qui pourraient survivre a la destruction.
        if (this._destroyed || !this.markers) return;

        this.filteredPlaces = this.getFiltered();
        this.updateTypeCounts();
        this.renderMarkers();
        this.renderPlaceList();
        this.$container.find('.mapl-results-count').text(this.filteredPlaces.length);
    }

    /* ============================================================ */
    /*  TYPE CONFIG HELPER                                           */
    /* ============================================================ */

    /* ============================================================ */
    /*  MARKERS                                                      */
    /* ============================================================ */

    /* ============================================================ */
    /*  POPUP                                                        */
    /* ============================================================ */

    /* ============================================================ */
    /*  ESTABLISHMENT LIST (sidebar cards)                           */
    /* ============================================================ */

    /**
     * Renders the establishment card list in the sidebar.
     * Each card shows: type icon, name, type badge, city, phone.
     */
    renderPlaceList() {
        var $list = this.$container.find('.mapl-place-list');
        var self  = this;

        $list.empty();

        if (this.filteredPlaces.length === 0) {
            var noResultsText = escHtml(t('noResults'));

            $list.html(
                '<div class="mapl-no-results">'
                + SVG_NO_RESULTS
                + '<p>' + noResultsText + '</p>'
                + '</div>'
            );
            return;
        }

        // Fiches assemblées puis insérées en une fois (un seul recalcul de mise en page).
        var cards = this.filteredPlaces.map(function(place) {
            var typeStr  = (place.types && place.types[0]) ? place.types[0] : '';
            var config   = self.getTypeConfig(typeStr);
            var entityColor = resolveEntityColor(place, config.color);
            var cityStr = place.city || '';

            // Phone link (with stopPropagation to prevent card click)
            var phoneHtml = '';
            if (place.phone) {
                phoneHtml = '<a href="tel:' + escAttr(place.phone) + '" class="mapl-place-phone" onclick="event.stopPropagation()">'
                    + SVG_PHONE
                    + escHtml(place.phone)
                    + '</a>';
            }

            var managerHtml = place.manager
                ? '<div class="mapl-place-manager">' + escHtml(place.manager) + '</div>'
                : '';

            var cardHtml = '<div class="mapl-place-card" data-id="' + place.id + '"'
                + ' data-lat="' + (place.lat || '') + '"'
                + ' data-lng="' + (place.lng || '') + '"'
                + ' role="listitem" tabindex="0">'
                + '<div class="mapl-place-icon" style="background:' + entityColor + '12;color:' + entityColor + '">'
                + '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'
                + config.svgPath
                + '</svg>'
                + '</div>'
                + '<div class="mapl-place-info">'
                + '<div class="mapl-place-name">' + escHtml(place.title) + '</div>'
                + '<div class="mapl-place-meta">'
                + '<span class="mapl-place-type" style="background:' + entityColor + '18;color:' + entityColor + '">' + escHtml(config.label) + '</span>'
                + '<span class="mapl-place-city">' + escHtml(cityStr) + '</span>'
                + '</div>'
                + managerHtml
                + phoneHtml
                + '</div>'
                + '</div>';

            return cardHtml;
        });
        $list.html(cards.join(''));
    }

    /* ============================================================ */
    /*  INTERACTIONS: FOCUS & HIGHLIGHT                              */
    /* ============================================================ */

    /**
     * Focuses on an establishment: highlights the card in the sidebar,
     * zooms to the marker, and opens its popup.
     *
     * @param {number} id - Etablissement ID
     */
    focusPlace(id) {
        this.selectPlaceCard(id);
        this.closeDrawer();
        this.syncUrlToPlace(findPlaceById(this.allPlaces, id));

        var marker = this.markerMap[id];
        if (!marker) return;

        // L'autoPan du popup (autoPanPaddingTopLeft) garantit que le popup
        // ne se glisse pas sous les pastilles d'entités flottantes.
        this.markers.zoomToShowLayer(marker, function() {
            marker.openPopup();
        });
    }

    /**
     * Surligne la fiche sélectionnée dans la liste latérale et la fait
     * défiler dans le champ de vue si besoin. Partagé par le clic sur une
     * fiche (focusPlace), le clic sur un marqueur (map-markers.mjs) et la
     * sélection par lien profond (applyDeepLinkSelection).
     *
     * @param {number} id - Etablissement ID
     */
    selectPlaceCard(id) {
        this.$container.find('.mapl-place-card').removeClass('active');
        var $card = this.$container.find('.mapl-place-card[data-id="' + id + '"]');
        $card.addClass('active');

        if ($card.length) {
            var $list = this.$container.find('.mapl-place-list');
            if ($list.length) {
                $list.animate({
                    scrollTop: $list.scrollTop() + $card.position().top - 60
                }, 300);
            }
        }
    }

    /* ============================================================ */
    /*  DEEP LINK (?place=<slug-ou-id>)                              */
    /* ============================================================ */

    /**
     * Sélectionne, au premier chargement, la fiche demandée par le
     * paramètre `place` de l'URL : centre la carte dessus, ouvre sa popup,
     * surligne sa ligne dans la liste. Les filtres actifs (recherche, type,
     * entités) sont réinitialisés avant : un filtre par défaut ne doit
     * jamais masquer la fiche demandée.
     *
     * Une fiche absente, dépubliée ou sans coordonnées ne figure pas dans
     * le cache chargé par loadAllData() : rien ne casse, un message discret
     * signale juste qu'elle est introuvable.
     */
    applyDeepLinkSelection() {
        if (this._destroyed) return;

        var param = parsePlaceParam(window.location.search);
        if (!param) return;

        var place = findPlaceByParam(this.allPlaces, param);
        if (!place) {
            this.showToast(t('placeNotFound'));
            return;
        }

        this.searchTerm      = '';
        this.activeFilter    = '';
        this.activeEntities  = {};
        this.$container.find('.mapl-search-input').val('');
        this.syncEntityPills();
        this.renderAll();
        this.focusPlace(place.id);
    }

    /**
     * Remplace l'URL affichée par celle de la fiche sélectionnée
     * (history.replaceState : jamais d'entrée d'historique empilée), pour
     * que l'URL de la barre d'adresse reste toujours correcte et copiable.
     *
     * @param {Object|null} place
     */
    syncUrlToPlace(place) {
        if (!place || typeof window.history === 'undefined' || !window.history.replaceState) return;

        var url = withPlaceParam(window.location.href, placeLinkValue(place));
        if (url !== window.location.href) {
            window.history.replaceState(window.history.state, '', url);
        }
    }

    /* ============================================================ */
    /*  GEOLOCATION                                                  */
    /* ============================================================ */

    /* ============================================================ */
    /*  LOADING INDICATOR                                            */
    /* ============================================================ */

    /**
     * Shows or hides the loading overlay on the map canvas.
     *
     * @param {boolean} show - Whether to show or hide the loader
     */
    showLoading(show) {
        this.$container.find('.mapl-map-loading').toggle(show);
    }

    /**
     * Shows a temporary toast notification inside the map container.
     *
     * @param {string} message - Message to display
     */
    showToast(message) {
        var $toast = $('<div class="mapl-toast" role="status">' + escHtml(message) + '</div>');
        this.$container.append($toast);
        setTimeout(function() { $toast.addClass('mapl-toast-visible'); }, 10);
        setTimeout(function() {
            $toast.removeClass('mapl-toast-visible');
            setTimeout(function() { $toast.remove(); }, 300);
        }, 4000);
    }

    /* ============================================================ */
    /*  CLEANUP                                                      */
    /* ============================================================ */

    /**
     * Detaches all event handlers. Called when the widget is
     * destroyed (e.g., by Elementor live editor).
     */
    destroy() {
        this._destroyed = true;

        // Sans cet abort, la reponse arrive apres la destruction et son
        // callback travaille sur une instance videe (this.markers === null).
        if (this._dataRequest && typeof this._dataRequest.abort === 'function') {
            this._dataRequest.abort();
            this._dataRequest = null;
        }

        $(document).off('keydown.maplmap_' + this.mapId);
        $(document).off('.maplAC_' + this.mapId);
        this.$container.off();

        if (this.map) {
            this.map.remove();
            this.map = null;
        }

        this.markers    = null;
        this.markerMap  = {};
        this._markerCache = {};
        this._escHandler = null;
    }
}

// Méthodes réparties par thème (fichiers map-*.mjs).
Object.assign(MappedPlacesMap.prototype, autocompleteMethods, carouselMethods, markersMethods);

export { MappedPlacesMap };
