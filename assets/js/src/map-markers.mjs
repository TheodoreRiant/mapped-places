/**
 * Méthodes de MappedPlacesMap : Marqueurs, clusters, popup et position de l'utilisateur.
 * Ajoutées au prototype par map.mjs.
 */
import { resolveTypeConfig } from './types.mjs';
import { DEFAULT_COLOR, resolveEntityColor } from './colors.mjs';
import { syncMarkerCache } from './marker-cache.mjs';
import { escHtml, escAttr, safeUrl, prettyUrl } from './escape.mjs';
import { managerLabel, formatAddress } from './text.mjs';
import { t } from './i18n.mjs';
import { SVG_PHONE_14, SVG_LOCATION, SVG_CLOCK, SVG_GLOBE, SVG_ACCESS } from './icons.mjs';

const markersMethods = {
    initMarkerCluster() {
        this.markers = L.markerClusterGroup({
            chunkedLoading:       true,
            spiderfyOnMaxZoom:    true,
            showCoverageOnHover:  false,
            zoomToBoundsOnClick:  true,
            maxClusterRadius:     50,
            animate:              true,
            animateAddingMarkers: true,
            iconCreateFunction: function(cluster) {
                var count = cluster.getChildCount();
                var size  = 'small';
                if (count > 10) size = 'medium';
                if (count > 50) size = 'large';

                var dims = { small: 40, medium: 48, large: 56 };
                var d    = dims[size];

                // Constellation de pastilles colorées par entité : une
                // pastille par établissement enfant (plafonnée à MAX_DOTS),
                // puis un indicateur "+N" pour les enfants restants. Permet
                // de visualiser l'étendue d'un coup d'œil au dézoom (#5).
                var MAX_DOTS = 8;
                var children = cluster.getAllChildMarkers();
                var shown    = Math.min(children.length, MAX_DOTS);
                var dots     = '';
                for (var i = 0; i < shown; i++) {
                    var color = (children[i] && children[i].entityColor)
                        ? children[i].entityColor
                        : DEFAULT_COLOR;
                    dots += '<span class="mapl-cluster-dot" style="background:' + color + '"></span>';
                }
                var remaining = count - shown;
                if (remaining > 0) {
                    dots += '<span class="mapl-cluster-more">+' + remaining + '</span>';
                }

                // Accessibilité : le nombre total reste lisible via title/aria-label.
                var label = escAttr(t('clusterLabel', count));

                return L.divIcon({
                    html:      '<div class="mapl-cluster mapl-cluster-' + size + '" title="' + label + '" aria-label="' + label + '">'
                             + '<span class="mapl-cluster-dots">' + dots + '</span>'
                             + '</div>',
                    className: 'mapl-cluster-icon',
                    iconSize:  L.point(d, d),
                });
            },
        });

        this.map.addLayer(this.markers);
    },

    /**
     * Resolves the configuration for a given type string from the
     * type catalog sent by the API (pin icon when unknown).
     *
     * @param {string} type - Raw type string from data
     * @returns {{ color: string, label: string, svgPath: string }}
     */
    getTypeConfig(type) {
        return resolveTypeConfig(this.typeCatalog, type, DEFAULT_COLOR);
    },

    /**
     * Marqueur d'un lieu : icône, popup et écouteur de clic. Construit une
     * seule fois par lieu (voir renderMarkers et syncMarkerCache).
     *
     * @param {Object} place
     * @returns {L.Marker}
     */
    createMarker(place) {
        var self = this;
        var marker = L.marker([place.lat, place.lng], {
            icon: self.createMarkerIcon(place),
        });

        marker.bindPopup(self.createPopupContent(place), {
            maxWidth:  380,
            maxHeight: 400,
            className: 'mapl-popup',
            autoPan:   true,
            // Padding haut/gauche large pour que le popup ne se glisse
            // jamais sous les pastilles d'entités flottantes en haut
            // ni sous le bouton fullscreen. Padding bas plus court car
            // pas d'obstacle.
            autoPanPaddingTopLeft:     L.point(20, 110),
            autoPanPaddingBottomRight: L.point(20, 80),
        });

        marker.placeId = place.id;

        // Couleur d'entité attachée au marqueur : au dézoom, le cluster
        // s'en sert pour afficher une petite pastille colorée par
        // établissement plutôt qu'un simple chiffre (objectif #5).
        var placeType   = (place.types && place.types[0]) ? place.types[0] : '';
        marker.entityColor = resolveEntityColor(place, self.getTypeConfig(placeType).color);

        // Marker click -> highlight the corresponding sidebar card and keep
        // the address bar URL in sync with the selected place.
        marker.on('click', function() {
            self.selectPlaceCard(place.id);
            self.syncUrlToPlace(place);
        });
        return marker;
    },

    /**
     * Affiche les marqueurs des lieux filtrés, construits une fois par lieu
     * puis réaffichés : un filtre ne refait ni icône, ni popup, ni écouteurs
     * (cache vidé quand la liste des lieux est rechargée).
     */
    renderMarkers() {
        var self       = this;
        var markerList = [];

        var synced = syncMarkerCache(this._markerCache || {}, this.filteredPlaces, this.createMarker.bind(this));
        this._markerCache = synced.cache;
        markerList = synced.markers;

        this.markers.clearLayers();
        this.markerMap = {};
        markerList.forEach(function(marker) {
            self.markerMap[marker.placeId] = marker;
        });

        this.markers.addLayers(markerList);

        // Fit bounds to show all markers (unless geolocation is active
        // or the page keeps its own centre and zoom)
        if (this.config.fitBounds && markerList.length > 0 && !this.userLocation) {
            var bounds = this.markers.getBounds();
            if (bounds.isValid()) {
                this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
            }
        }

        // Re-add user location marker if present
        if (this.userLocation) {
            this.addUserLocationMarker();
        }
    },

    /**
     * Creates a custom map pin icon using SVG and the type color.
     *
     * @param {Object} place - Etablissement data object
     * @returns {L.DivIcon}
     */
    createMarkerIcon(place) {
        var type   = (place.types && place.types[0]) ? place.types[0] : '';
        var config = this.getTypeConfig(type);
        var entityColor = resolveEntityColor(place, config.color);
        var w = 40;
        var h = 52;

        return L.divIcon({
            html: '<div class="mapl-marker" data-id="' + place.id + '">'
                + '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 52" class="mapl-pin-svg">'
                + '<path d="M20 0C11 0 4 7 4 16c0 12 16 27 16 27s16-15 16-27C36 7 29 0 20 0z" fill="' + entityColor + '" stroke="#fff" stroke-width="1.5"/>'
                + '<circle cx="20" cy="16" r="5" fill="#fff" />'
                + '</svg>'
                + '</div>',
            className:  'mapl-marker-icon',
            iconSize:   [w, h],
            iconAnchor: [w / 2, h],
            popupAnchor:[0, -h - 2],
        });
    },

    /**
     * Creates complete HTML content for a marker popup.
     * Includes type badges, title, address, phone, and link button.
     *
     * @param {Object} place - Etablissement data object
     * @returns {string} HTML string
     */
    createPopupContent(place) {
        var title  = place.title || '';
        var type   = (place.types && place.types[0]) ? place.types[0] : '';
        var config = this.getTypeConfig(type);
        var entityColor = resolveEntityColor(place, config.color);
        var fullAddr = formatAddress(place);

        var html = '<div class="mapl-popup-content" data-place-id="' + place.id + '">';

        // Image / Galerie : placeholder shimmer si galerie attendue
        // (le carrousel est injecté en popupopen via fetch detail).
        if (place.gallery_count > 0) {
            html += '<div class="mapl-popup-image-placeholder"></div>';
        } else if (place.thumbnail) {
            html += '<div class="mapl-popup-image"><img src="' + escAttr(place.thumbnail) + '" alt="' + escAttr(title) + '" loading="lazy" /></div>';
        } else {
            // Aucune photo (ni galerie ni image à la une) : placeholder générique
            html += this.renderImagePlaceholder();
        }

        html += '<div class="mapl-popup-body">';

        // Badges: entity (solid colored) + type (outline/light)
        html += '<div class="mapl-popup-badges">';
        if (place.entity && place.entity.name) {
            html += '<span class="mapl-popup-entity-badge" style="background:' + entityColor + ';color:#fff">' + escHtml(place.entity.name) + '</span>';
        }
        if (type) {
            html += '<span class="mapl-popup-type-badge" style="color:#555;background:#f0f0f0;border:1px solid #ddd">' + escHtml(config.label) + '</span>';
        }
        html += '</div>';

        // Title
        html += '<h3 class="mapl-popup-title">' + escHtml(title) + '</h3>';

        // Mission / description complete
        var mission = place.description || place.excerpt || '';
        if (mission) {
            html += '<p class="mapl-popup-desc">' + escHtml(mission) + '</p>';
        }

        // Personnes : rôle + nom, dans l'ordre saisi. Repli sur l'ancien
        // champ « manager » (noms seuls) pour les données non migrées.
        if (place.people && place.people.length) {
            var separator = (mappedPlacesConfig.i18n && mappedPlacesConfig.i18n.roleSeparator) || ': ';
            place.people.forEach(function (person) {
                html += '<p class="mapl-popup-manager">'
                    + (person.role ? '<strong>' + escHtml(person.role) + escHtml(separator) + '</strong>' : '')
                    + escHtml(person.name) + '</p>';
            });
        } else if (place.manager) {
            html += '<p class="mapl-popup-manager"><strong>'
                + escHtml(managerLabel(place.manager, mappedPlacesConfig.i18n))
                + '</strong>' + escHtml(place.manager) + '</p>';
        }

        // Nombre de personnes soutenues (stored in excerpt)
        if (place.excerpt && place.description && place.excerpt !== place.description) {
            html += '<p class="mapl-popup-nombre"><strong>' + escHtml(t('audience')) + '</strong> ' + escHtml(place.excerpt) + '</p>';
        }

        // Info block
        html += '<div class="mapl-popup-info">';

        if (fullAddr) {
            html += '<p class="mapl-popup-address">' + SVG_LOCATION + '<span>' + escHtml(fullAddr) + '</span></p>';
        }

        if (place.phone) {
            html += '<p class="mapl-popup-phone">' + SVG_PHONE_14 + '<a href="tel:' + escAttr(place.phone) + '">' + escHtml(place.phone) + '</a></p>';
        }

        if (place.email) {
            html += '<p class="mapl-popup-email"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><a href="mailto:' + escAttr(place.email) + '">' + escHtml(place.email) + '</a></p>';
        }

        if (place.services && place.services.length) {
            html += '<p class="mapl-popup-services"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg><span>' + escHtml(place.services.join(', ')) + '</span></p>';
        }

        // Horaires, site web et accessibilite : renseignes dans l'admin
        // mais jamais affiches jusqu'a la 2.7.5. N'apparaissent que si le
        // champ est rempli, donc rien ne change pour une fiche vide.
        if (place.opening_hours) {
            html += '<p class="mapl-popup-hours">' + SVG_CLOCK
                 + '<span>' + escHtml(place.opening_hours) + '</span></p>';
        }

        if (place.accessibility && place.accessibility.length) {
            html += '<p class="mapl-popup-access">' + SVG_ACCESS
                 + '<span>' + escHtml(place.accessibility.join(', ')) + '</span></p>';
        }

        var siteWeb = safeUrl(place.website);
        if (siteWeb) {
            html += '<p class="mapl-popup-website">' + SVG_GLOBE
                 + '<a href="' + escAttr(siteWeb) + '" target="_blank" rel="noopener noreferrer">'
                 + escHtml(prettyUrl(siteWeb)) + '</a></p>';
        }

        if (place.distance) {
            html += '<p class="mapl-popup-distance"><strong>' + place.distance + ' km</strong></p>';
        }

        html += '</div>';
        html += '</div>';
        html += '</div>';
        return html;
    },

    /**
     * Highlights or un-highlights a marker on the map when hovering
     * over a sidebar card.
     *
     * @param {number}  id     - Etablissement ID
     * @param {boolean} active - Whether to add or remove highlight
     */
    highlightMarker(id, active) {
        var marker = this.markerMap[id];
        if (!marker) return;

        var el = marker.getElement();
        if (!el) return;

        var pin = el.querySelector('.mapl-marker');
        if (!pin) return;

        if (active) {
            pin.style.transform = 'translateY(-5px) scale(1.15)';
            pin.style.filter    = 'drop-shadow(0 8px 14px rgba(0,0,0,0.35))';
        } else {
            pin.style.transform = '';
            pin.style.filter    = '';
        }
    },

    /**
     * Requests the browser geolocation and centers the map on the
     * user's position, then reloads markers with proximity sorting.
     */
    handleGeolocation() {
        var self = this;
        var $btn = this.$container.find('.mapl-geoloc-btn');

        if (!navigator.geolocation) {
            var errorMsg = t('geolocUnavailable');
            this.showToast(errorMsg);
            return;
        }

        $btn.addClass('loading');

        navigator.geolocation.getCurrentPosition(
            function(position) {
                self.userLocation = {
                    lat: position.coords.latitude,
                    lng: position.coords.longitude,
                };
                self.map.setView([self.userLocation.lat, self.userLocation.lng], 11);
                self.addUserLocationMarker();
                self.renderAll();
                $btn.removeClass('loading');
            },
            function() {
                var errorMsg = t('geolocError');
                self.showToast(errorMsg);
                $btn.removeClass('loading');
            },
            { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
        );
    },

    /**
     * Adds a pulsing blue marker at the user's location.
     */
    addUserLocationMarker() {
        this.removeUserLocationMarker();

        if (!this.userLocation) return;

        this.userMarker = L.marker(
            [this.userLocation.lat, this.userLocation.lng],
            {
                icon: L.divIcon({
                    html:      '<div class="mapl-user-marker"></div>',
                    className: 'mapl-user-marker-icon',
                    iconSize:  [20, 20],
                    iconAnchor:[10, 10],
                }),
            }
        ).addTo(this.map);

        this.userCircle = L.circle(
            [this.userLocation.lat, this.userLocation.lng],
            {
                radius:      50000, // 50 km default
                color:       DEFAULT_COLOR,
                fillColor:   DEFAULT_COLOR,
                fillOpacity: 0.08,
                weight:      1.5,
                dashArray:   '6 4',
            }
        ).addTo(this.map);
    },

    /**
     * Removes the user location marker and circle from the map.
     */
    removeUserLocationMarker() {
        if (this.userMarker) {
            this.map.removeLayer(this.userMarker);
            this.userMarker = null;
        }
        if (this.userCircle) {
            this.map.removeLayer(this.userCircle);
            this.userCircle = null;
        }
    },
};

export { markersMethods };
