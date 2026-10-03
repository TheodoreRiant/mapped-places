/* Built by tools/build-js.js from assets/js/src/: edit the modules, then run npm run build:js. */
(() => {
  // assets/js/src/types.mjs
  var PIN_PATH = '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>';
  function typeKey(name) {
    return String(name === void 0 || name === null ? "" : name).toLowerCase().trim();
  }
  function buildTypeCatalog(types) {
    var catalog = {};
    (types || []).forEach(function(t2) {
      if (!t2 || !t2.name) return;
      var key = typeKey(t2.name);
      if (key && !catalog[key]) {
        catalog[key] = { label: t2.label || t2.name, svgPath: t2.path || PIN_PATH };
      }
    });
    return catalog;
  }
  function resolveTypeConfig(catalog, type, color) {
    var entry = type ? catalog[typeKey(type)] : null;
    return {
      color,
      label: entry ? entry.label : String(type || "").trim(),
      svgPath: entry ? entry.svgPath : PIN_PATH
    };
  }

  // assets/js/src/colors.mjs
  var COLOR_RE = /^(#(?:[0-9a-fA-F]{3,4}|[0-9a-fA-F]{6}|[0-9a-fA-F]{8})|rgba?\([^)]*\))$/;
  var DEFAULT_COLOR = typeof mappedPlacesConfig !== "undefined" && COLOR_RE.test(mappedPlacesConfig.defaultColor || "") ? mappedPlacesConfig.defaultColor : "currentColor";
  function sanitizeColor(value, fallback) {
    var fb = fallback || DEFAULT_COLOR;
    if (typeof value !== "string") return fb;
    var v = value.trim();
    return COLOR_RE.test(v) ? v : fb;
  }
  function resolveEntityColor(place, typeColor) {
    var entityColor = place && place.entity && place.entity.color;
    return sanitizeColor(entityColor || typeColor, typeColor);
  }

  // assets/js/src/escape.mjs
  var HTML_ENTITIES = { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" };
  function escHtml(s) {
    if (s === void 0 || s === null) return "";
    return String(s).replace(/[&<>"']/g, function(c) {
      return HTML_ENTITIES[c];
    });
  }
  function escAttr(s) {
    return escHtml(s);
  }
  function safeUrl(url) {
    if (!url) return "";
    var value = String(url).trim();
    if (/^https?:\/\//i.test(value)) return value;
    if (/^[\w.-]+\.[a-z]{2,}(\/|$)/i.test(value)) return "https://" + value;
    return "";
  }
  function prettyUrl(url) {
    return String(url || "").replace(/^https?:\/\//i, "").replace(/\/$/, "");
  }

  // assets/js/src/text.mjs
  function foldChar(c) {
    var lower = c.toLowerCase();
    if (lower.normalize) {
      lower = lower.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    }
    return lower.replace(/[\u2018\u2019\u02bc\u2032`]/g, "'");
  }
  function foldText(s) {
    return Array.from(String(s === void 0 || s === null ? "" : s)).map(foldChar).join("");
  }
  function highlightMatch(text, query) {
    if (!text) return "";
    var q = foldText(String(query || "").trim());
    if (!q) return escHtml(text);
    var chars = Array.from(text);
    var folded = "";
    var origin = [];
    chars.forEach(function(c, i) {
      var f = foldChar(c);
      for (var k = 0; k < f.length; k++) origin.push(i);
      folded += f;
    });
    var idx = folded.indexOf(q);
    if (idx === -1) return escHtml(text);
    var from = origin[idx];
    var to = origin[idx + q.length - 1] + 1;
    while (to < chars.length && foldChar(chars[to]) === "") to++;
    return escHtml(chars.slice(0, from).join("")) + "<mark>" + escHtml(chars.slice(from, to).join("")) + "</mark>" + escHtml(chars.slice(to).join(""));
  }
  function managerLabel(value, i18n) {
    var labels = i18n || {};
    var plural = String(value || "").indexOf(",") !== -1;
    return (plural ? labels.managers : labels.manager) || "";
  }
  function containsWord(text, word) {
    var t2 = foldText(text);
    var w = foldText(word).trim();
    if (!w) return false;
    var from = 0;
    var idx;
    while ((idx = t2.indexOf(w, from)) !== -1) {
      var before = idx === 0 ? "" : t2.charAt(idx - 1);
      var after = t2.charAt(idx + w.length);
      if (!/[a-z0-9]/.test(before) && !/[a-z0-9]/.test(after)) return true;
      from = idx + 1;
    }
    return false;
  }
  function formatAddress(place) {
    var address = String(place && place.address || "").trim();
    var parts = address ? [address] : [];
    [place && place.postal_code, place && place.city].forEach(function(value) {
      var v = String(value || "").trim();
      if (v && !containsWord(address, v)) parts.push(v);
    });
    return parts.join(", ");
  }

  // assets/js/src/i18n.mjs
  function formatText(template, args) {
    var i = 0;
    return String(template || "").replace(/%(?:(\d+)\$)?[sd]/g, function(match, position) {
      var index = position ? parseInt(position, 10) - 1 : i++;
      return args[index] !== void 0 ? String(args[index]) : "";
    });
  }
  function t(key) {
    var i18n = typeof mappedPlacesConfig !== "undefined" && mappedPlacesConfig.i18n || {};
    return formatText(i18n[key], Array.prototype.slice.call(arguments, 1));
  }

  // assets/js/src/filters.mjs
  function toggleEntitySelection(selection, slug) {
    var current = selection || {};
    var next = {};
    Object.keys(current).forEach(function(key) {
      if (key !== slug && current[key] === true) next[key] = true;
    });
    if (current[slug] !== true) next[slug] = true;
    return next;
  }
  function matchesSearch(e, q) {
    if (!q) return true;
    var inText = function(v) {
      return !!v && foldText(v).indexOf(q) !== -1;
    };
    var inList = function(list) {
      return !!list && list.some(inText);
    };
    return inText(e.title) || inText(e.city) || inText(e.address) || !!e.postal_code && e.postal_code.indexOf(q) !== -1 || inList(e.types) || inList(e.services);
  }
  function matchesType(e, type) {
    if (!type) return true;
    return !!e.types && e.types.some(function(t2) {
      return t2.toLowerCase().trim() === type;
    });
  }
  function matchesEntities(e, selection) {
    if (!Object.keys(selection || {}).length) return true;
    var slug = e.entity && e.entity.slug ? e.entity.slug : null;
    return !slug || selection[slug] === true;
  }
  function countTypes(data) {
    var counts = {};
    data.forEach(function(e) {
      var seen = {};
      (e.types || []).forEach(function(rawType) {
        var t2 = rawType.toLowerCase().trim();
        if (t2 && !seen[t2]) {
          seen[t2] = true;
          counts[t2] = (counts[t2] || 0) + 1;
        }
      });
    });
    return counts;
  }
  function visibleTypeKeys(counts, knownOrder, selected) {
    var others = Object.keys(counts).concat(selected ? [selected] : []).filter(function(k, i, all) {
      return knownOrder.indexOf(k) === -1 && all.indexOf(k) === i;
    }).sort(function(a, b) {
      return a.localeCompare(b, "fr");
    });
    return knownOrder.concat(others).filter(function(k) {
      return counts[k] > 0 || !!selected && k === selected;
    });
  }

  // assets/js/src/tiles.mjs
  var FALLBACK_TILE = {
    id: "osm",
    type: "raster",
    url: "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
    subdomains: "abc",
    maxZoom: 19
  };
  function readTileProvider(config, id) {
    if (!config || !config.providers || !id) return null;
    const provider = config.providers[id];
    if (!provider || !provider.available || !provider.url) return null;
    return {
      id,
      type: provider.type || "raster",
      url: provider.url,
      attribution: provider.attribution || "",
      subdomains: provider.subdomains || "",
      maxZoom: provider.maxZoom || FALLBACK_TILE.maxZoom
    };
  }
  function resolveTile(pageStyle, vectorReady) {
    const config = window.mappedPlacesConfig && window.mappedPlacesConfig.tiles || null;
    if (!config) return FALLBACK_TILE;
    const wanted = config.forced || pageStyle;
    let tile = readTileProvider(config, wanted);
    if (tile && tile.type === "vector" && !vectorReady) {
      tile = null;
    }
    if (!tile) {
      tile = readTileProvider(config, config.fallback);
    }
    return tile || FALLBACK_TILE;
  }

  // assets/js/src/icons.mjs
  var SVG_PHONE = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.14 12a19.79 19.79 0 01-3.07-8.67A2 2 0 013.05 1.11L6.1 1a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L7.09 8.9a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0121 16.18z"/></svg>';
  var SVG_PHONE_14 = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 014.14 12a19.79 19.79 0 01-3.07-8.67A2 2 0 013.05 1.11L6.1 1a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L7.09 8.9a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0121 16.18z"/></svg>';
  var SVG_LOCATION = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/></svg>';
  var SVG_NO_RESULTS = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.35-4.35"/></svg>';
  var SVG_FULLSCREEN_ENTER = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
  var SVG_FULLSCREEN_EXIT = '<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 14 10 14 10 20"/><polyline points="20 10 14 10 14 4"/><line x1="14" y1="10" x2="21" y2="3"/><line x1="3" y1="21" x2="10" y2="14"/></svg>';
  var SVG_CLOCK = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>';
  var SVG_GLOBE = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/><path d="M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z"/></svg>';
  var SVG_ACCESS = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="4" r="2"/><path d="M19 13h-6l-1-4H7"/><path d="M9 9v6l-2 5"/><path d="M13 13l3 7"/></svg>';
  var SVG_HINT = '<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 3l7.07 16.97 2.51-7.39 7.39-2.51L3 3z"/><path d="M13 13l6 6"/></svg>';

  // assets/js/src/map-autocomplete.mjs
  var $ = window.jQuery;
  var autocompleteMethods = {
    /**
     * Render autocomplete suggestions in the search row that triggered the
     * input. Falls back to the focused search row when no row is provided.
     *
     * @param {string} query - Current search input value
     * @param {jQuery} $row  - Optional .mapl-search-row jQuery wrapper
     */
    renderAutocompleteSuggestions(query, $row) {
      var self = this;
      if (!$row || !$row.length) {
        $row = self.$container.find(".mapl-search-input:focus").closest(".mapl-search-row");
        if (!$row.length) return;
      }
      var $dropdown = $row.find(".mapl-autocomplete-results");
      var $input = $row.find(".mapl-search-input");
      if (!query || query.trim().length < 2) {
        self._closeDropdown($dropdown, $input);
        return;
      }
      var q = foldText(query.trim());
      var matches = self.allPlaces.filter(function(e) {
        return foldText(e.title).indexOf(q) !== -1 || foldText(e.city).indexOf(q) !== -1;
      }).slice(0, 8);
      if (matches.length === 0) {
        $dropdown.html('<div class="mapl-autocomplete-empty" role="status">' + escHtml(t("noResults")) + "</div>").attr("hidden", false);
        $input.attr("aria-expanded", "true").removeAttr("aria-activedescendant");
        self._acIndex = -1;
        return;
      }
      var listboxId = $dropdown.attr("id") || "mapl-ac";
      var itemsHtml = matches.map(function(place) {
        var typeStr = place.types && place.types[0] ? place.types[0] : "";
        return '<div class="mapl-autocomplete-item" role="option" id="' + listboxId + "-item-" + place.id + '" data-place-id="' + place.id + '" aria-selected="false"><div class="mapl-ac-title">' + highlightMatch(place.title || "", query) + '</div><div class="mapl-ac-meta">' + highlightMatch(place.city || "", query) + (typeStr ? " · " + escHtml(typeStr) : "") + "</div></div>";
      }).join("");
      $dropdown.html(itemsHtml).attr("hidden", false);
      $input.attr("aria-expanded", "true").removeAttr("aria-activedescendant");
      self._acIndex = -1;
    },
    /**
     * Move highlight up (-1) or down (1) within the visible dropdown.
     *
     * @param {number} direction - -1 (up) or 1 (down)
     * @param {jQuery} $row      - Optional .mapl-search-row jQuery wrapper
     */
    navigateAutocomplete(direction, $row) {
      if (!$row || !$row.length) {
        $row = this.$container.find(".mapl-search-input:focus").closest(".mapl-search-row");
        if (!$row.length) return;
      }
      var $dropdown = $row.find(".mapl-autocomplete-results:not([hidden])");
      var $items = $dropdown.find(".mapl-autocomplete-item");
      if ($items.length === 0) return;
      this._acIndex = (this._acIndex + direction + $items.length) % $items.length;
      $items.removeClass("is-highlighted").attr("aria-selected", "false");
      var $current = $items.eq(this._acIndex).addClass("is-highlighted").attr("aria-selected", "true");
      $row.find(".mapl-search-input").attr("aria-activedescendant", $current.attr("id"));
      var el = $current[0];
      if (el && el.scrollIntoView) el.scrollIntoView({ block: "nearest" });
    },
    selectSuggestion(placeId) {
      var id = parseInt(placeId, 10);
      if (!id) return;
      this.closeAutocomplete();
      this.$container.find(".mapl-search-input").val("");
      this.searchTerm = "";
      this.renderAll();
      this.focusPlace(id);
    },
    closeAutocomplete() {
      var self = this;
      this.$container.find(".mapl-autocomplete-results").each(function() {
        var $dropdown = $(this);
        var $input = $dropdown.closest(".mapl-search-row").find(".mapl-search-input");
        self._closeDropdown($dropdown, $input);
      });
    },
    _closeDropdown($dropdown, $input) {
      $dropdown.attr("hidden", true).empty();
      $input.attr("aria-expanded", "false").removeAttr("aria-activedescendant");
      this._acIndex = -1;
    }
  };

  // assets/js/src/carousel.mjs
  function buildCarouselHtml(images, labels) {
    var l = labels || {};
    if (!images || images.length === 0) return "";
    if (images.length === 1) {
      var img = images[0];
      var url = img.large && img.large.url || img.medium && img.medium.url || "";
      return '<div class="mapl-popup-image"><img src="' + escAttr(url) + '" alt="' + escAttr(img.alt) + '" loading="lazy" /></div>';
    }
    var total = images.length;
    var slidesHtml = images.map(function(img2, i) {
      var url2 = img2.large && img2.large.url || img2.medium && img2.medium.url || "";
      var srcAttr = i === 0 ? 'src="' + escAttr(url2) + '"' : 'src="" data-src="' + escAttr(url2) + '"';
      return '<div class="mapl-carousel-slide" role="group" aria-roledescription="slide" aria-label="' + escAttr(formatText(l.slideOf, [i + 1, total])) + '" aria-hidden="' + (i !== 0) + '"><img ' + srcAttr + ' alt="' + escAttr(img2.alt) + '" loading="lazy" /></div>';
    }).join("");
    var dotsHtml = images.map(function(_, i) {
      return '<button type="button" class="mapl-carousel-dot' + (i === 0 ? " is-active" : "") + '" role="tab" aria-selected="' + (i === 0) + '" data-slide="' + i + '" aria-label="' + escAttr(formatText(l.goToSlide, [i + 1])) + '"></button>';
    }).join("");
    return '<div class="mapl-carousel" role="region" aria-label="' + escAttr(l.gallery) + '" aria-roledescription="' + escAttr(l.carousel) + '" tabindex="0"><div class="mapl-carousel-track" data-current="0" style="transform: translateX(0%)">' + slidesHtml + '</div><button type="button" class="mapl-carousel-prev" aria-label="' + escAttr(l.previousPhoto) + '"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg></button><button type="button" class="mapl-carousel-next" aria-label="' + escAttr(l.nextPhoto) + '"><svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg></button><div class="mapl-carousel-counter" aria-live="polite">1 / ' + total + '</div><div class="mapl-carousel-dots" role="tablist">' + dotsHtml + "</div></div>";
  }

  // assets/js/src/map-carousel.mjs
  var $2 = window.jQuery;
  var carouselMethods = {
    /**
     * Construire le slot image « placeholder » affiché lorsqu'un
     * établissement n'a AUCUNE photo (ni galerie ni image à la une).
     * Réutilise la classe .mapl-popup-image avec un modificateur
     * pour styler le rendu générique.
     *
     * @returns {string}
     */
    renderImagePlaceholder() {
      var base = window.mappedPlacesConfig && mappedPlacesConfig.pluginUrl ? mappedPlacesConfig.pluginUrl : "";
      var src = base + "assets/images/placeholder.svg";
      return '<div class="mapl-popup-image mapl-popup-image--placeholder"><img src="' + src + '" alt="' + escAttr(t("photoPlaceholder")) + '" loading="lazy" /></div>';
    },
    /**
     * Construire le HTML d'un carrousel (voir buildCarouselHtml).
     *
     * @param {Array} images
     * @returns {string}
     */
    renderCarousel(images) {
      return buildCarouselHtml(images, {
        slideOf: t("slideOf"),
        goToSlide: t("goToSlide"),
        gallery: t("gallery"),
        carousel: t("carousel"),
        previousPhoto: t("previousPhoto"),
        nextPhoto: t("nextPhoto")
      });
    },
    /**
     * Initialiser les interactions d'un carrousel inséré dans un popup
     * Leaflet : navigation clavier, swipe tactile, lazy-load de la slide
     * courante et suivante.
     *
     * @param {HTMLElement} rootNode Conteneur du popup
     */
    initCarousel(rootNode) {
      var $carousel = $2(rootNode).find(".mapl-carousel");
      if (!$carousel.length) return;
      var $track = $carousel.find(".mapl-carousel-track");
      var $slides = $carousel.find(".mapl-carousel-slide");
      var $dots = $carousel.find(".mapl-carousel-dot");
      var $counter = $carousel.find(".mapl-carousel-counter");
      var total = $slides.length;
      if (total <= 1) return;
      var state = { index: 0 };
      function ensureImageLoaded(idx) {
        var $img = $slides.eq(idx).find("img");
        if ($img.data("src") && !$img.attr("src")) {
          $img.attr("src", $img.data("src")).removeAttr("data-src");
        }
      }
      function goTo(i) {
        i = (i + total) % total;
        state.index = i;
        $track.css("transform", "translateX(-" + i * 100 + "%)").attr("data-current", i);
        $slides.attr("aria-hidden", "true").eq(i).attr("aria-hidden", "false");
        $dots.removeClass("is-active").attr("aria-selected", "false").eq(i).addClass("is-active").attr("aria-selected", "true");
        $counter.text(i + 1 + " / " + total);
        ensureImageLoaded(i);
        ensureImageLoaded((i + 1) % total);
      }
      $carousel.off(".carousel");
      $carousel.on("click.carousel", ".mapl-carousel-prev", function(e) {
        e.stopPropagation();
        goTo(state.index - 1);
      });
      $carousel.on("click.carousel", ".mapl-carousel-next", function(e) {
        e.stopPropagation();
        goTo(state.index + 1);
      });
      $carousel.on("click.carousel", ".mapl-carousel-dot", function(e) {
        e.stopPropagation();
        goTo(parseInt($2(this).data("slide"), 10));
      });
      $carousel.on("keydown.carousel", function(e) {
        if (e.key === "ArrowLeft") {
          e.preventDefault();
          goTo(state.index - 1);
        } else if (e.key === "ArrowRight") {
          e.preventDefault();
          goTo(state.index + 1);
        }
      });
      var trackEl = $track[0];
      if (trackEl) {
        var startX = 0, startTime = 0;
        trackEl.addEventListener("touchstart", function(e) {
          e.stopPropagation();
          startX = e.changedTouches[0].clientX;
          startTime = Date.now();
        }, { passive: true });
        trackEl.addEventListener("touchmove", function(e) {
          e.stopPropagation();
        }, { passive: true });
        trackEl.addEventListener("touchend", function(e) {
          e.stopPropagation();
          var dx = e.changedTouches[0].clientX - startX;
          var dt = Date.now() - startTime;
          if (Math.abs(dx) > 40 && dt < 500) {
            goTo(state.index + (dx < 0 ? 1 : -1));
          }
        }, { passive: true });
      }
    },
    /**
     * Injecter le carrousel dans le popup ouvert : remplace le
     * placeholder shimmer par le markup carrousel et l'initialise.
     * Fallback sur thumbnail si la galerie est vide ou fetch échoué.
     *
     * @param {jQuery} $node    Le contenu du popup
     * @param {Array}  gallery  Array d'images (peut être vide)
     */
    injectGalleryIntoPopup($node, gallery) {
      var $placeholder = $node.find(".mapl-popup-image-placeholder");
      if (!$placeholder.length) return;
      if (gallery && gallery.length > 0) {
        $placeholder.replaceWith(this.renderCarousel(gallery));
        this.initCarousel($node[0]);
        return;
      }
      var placeId = parseInt($node.find(".mapl-popup-content").data("place-id"), 10);
      var place = this.allPlaces.find(function(e) {
        return e.id === placeId;
      });
      if (place && place.thumbnail) {
        $placeholder.replaceWith('<div class="mapl-popup-image"><img src="' + escAttr(place.thumbnail) + '" alt="' + escAttr(place.title) + '" loading="lazy" /></div>');
      } else {
        $placeholder.replaceWith(this.renderImagePlaceholder());
      }
    }
  };

  // assets/js/src/marker-cache.mjs
  function syncMarkerCache(cache, places, create) {
    var next = Object.assign({}, cache);
    var markers = [];
    places.forEach(function(place) {
      if (!place.lat || !place.lng) return;
      if (!next[place.id]) {
        next[place.id] = create(place);
      }
      markers.push(next[place.id]);
    });
    return { cache: next, markers };
  }

  // assets/js/src/map-markers.mjs
  var markersMethods = {
    initMarkerCluster() {
      this.markers = L.markerClusterGroup({
        chunkedLoading: true,
        spiderfyOnMaxZoom: true,
        showCoverageOnHover: false,
        zoomToBoundsOnClick: true,
        maxClusterRadius: 50,
        animate: true,
        animateAddingMarkers: true,
        iconCreateFunction: function(cluster) {
          var count = cluster.getChildCount();
          var size = "small";
          if (count > 10) size = "medium";
          if (count > 50) size = "large";
          var dims = { small: 40, medium: 48, large: 56 };
          var d = dims[size];
          var MAX_DOTS = 8;
          var children = cluster.getAllChildMarkers();
          var shown = Math.min(children.length, MAX_DOTS);
          var dots = "";
          for (var i = 0; i < shown; i++) {
            var color = children[i] && children[i].entityColor ? children[i].entityColor : DEFAULT_COLOR;
            dots += '<span class="mapl-cluster-dot" style="background:' + color + '"></span>';
          }
          var remaining = count - shown;
          if (remaining > 0) {
            dots += '<span class="mapl-cluster-more">+' + remaining + "</span>";
          }
          var label = escAttr(t("clusterLabel", count));
          return L.divIcon({
            html: '<div class="mapl-cluster mapl-cluster-' + size + '" title="' + label + '" aria-label="' + label + '"><span class="mapl-cluster-dots">' + dots + "</span></div>",
            className: "mapl-cluster-icon",
            iconSize: L.point(d, d)
          });
        }
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
        icon: self.createMarkerIcon(place)
      });
      marker.bindPopup(self.createPopupContent(place), {
        maxWidth: 380,
        maxHeight: 400,
        className: "mapl-popup",
        autoPan: true,
        // Padding haut/gauche large pour que le popup ne se glisse
        // jamais sous les pastilles d'entités flottantes en haut
        // ni sous le bouton fullscreen. Padding bas plus court car
        // pas d'obstacle.
        autoPanPaddingTopLeft: L.point(20, 110),
        autoPanPaddingBottomRight: L.point(20, 80)
      });
      marker.placeId = place.id;
      var placeType = place.types && place.types[0] ? place.types[0] : "";
      marker.entityColor = resolveEntityColor(place, self.getTypeConfig(placeType).color);
      marker.on("click", function() {
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
      var self = this;
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
      if (this.config.fitBounds && markerList.length > 0 && !this.userLocation) {
        var bounds = this.markers.getBounds();
        if (bounds.isValid()) {
          this.map.fitBounds(bounds, { padding: [50, 50], maxZoom: 14 });
        }
      }
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
      var type = place.types && place.types[0] ? place.types[0] : "";
      var config = this.getTypeConfig(type);
      var entityColor = resolveEntityColor(place, config.color);
      var w = 40;
      var h = 52;
      return L.divIcon({
        html: '<div class="mapl-marker" data-id="' + place.id + '"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 40 52" class="mapl-pin-svg"><path d="M20 0C11 0 4 7 4 16c0 12 16 27 16 27s16-15 16-27C36 7 29 0 20 0z" fill="' + entityColor + '" stroke="#fff" stroke-width="1.5"/><circle cx="20" cy="16" r="5" fill="#fff" /></svg></div>',
        className: "mapl-marker-icon",
        iconSize: [w, h],
        iconAnchor: [w / 2, h],
        popupAnchor: [0, -h - 2]
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
      var title = place.title || "";
      var type = place.types && place.types[0] ? place.types[0] : "";
      var config = this.getTypeConfig(type);
      var entityColor = resolveEntityColor(place, config.color);
      var fullAddr = formatAddress(place);
      var html = '<div class="mapl-popup-content" data-place-id="' + place.id + '">';
      if (place.gallery_count > 0) {
        html += '<div class="mapl-popup-image-placeholder"></div>';
      } else if (place.thumbnail) {
        html += '<div class="mapl-popup-image"><img src="' + escAttr(place.thumbnail) + '" alt="' + escAttr(title) + '" loading="lazy" /></div>';
      } else {
        html += this.renderImagePlaceholder();
      }
      html += '<div class="mapl-popup-body">';
      html += '<div class="mapl-popup-badges">';
      if (place.entity && place.entity.name) {
        html += '<span class="mapl-popup-entity-badge" style="background:' + entityColor + ';color:#fff">' + escHtml(place.entity.name) + "</span>";
      }
      if (type) {
        html += '<span class="mapl-popup-type-badge" style="color:#555;background:#f0f0f0;border:1px solid #ddd">' + escHtml(config.label) + "</span>";
      }
      html += "</div>";
      html += '<h3 class="mapl-popup-title">' + escHtml(title) + "</h3>";
      var mission = place.description || place.excerpt || "";
      if (mission) {
        html += '<p class="mapl-popup-desc">' + escHtml(mission) + "</p>";
      }
      if (place.people && place.people.length) {
        var separator = mappedPlacesConfig.i18n && mappedPlacesConfig.i18n.roleSeparator || ": ";
        place.people.forEach(function(person) {
          html += '<p class="mapl-popup-manager">' + (person.role ? "<strong>" + escHtml(person.role) + escHtml(separator) + "</strong>" : "") + escHtml(person.name) + "</p>";
        });
      } else if (place.manager) {
        html += '<p class="mapl-popup-manager"><strong>' + escHtml(managerLabel(place.manager, mappedPlacesConfig.i18n)) + "</strong>" + escHtml(place.manager) + "</p>";
      }
      if (place.excerpt && place.description && place.excerpt !== place.description) {
        html += '<p class="mapl-popup-nombre"><strong>' + escHtml(t("audience")) + "</strong> " + escHtml(place.excerpt) + "</p>";
      }
      html += '<div class="mapl-popup-info">';
      if (fullAddr) {
        html += '<p class="mapl-popup-address">' + SVG_LOCATION + "<span>" + escHtml(fullAddr) + "</span></p>";
      }
      if (place.phone) {
        html += '<p class="mapl-popup-phone">' + SVG_PHONE_14 + '<a href="tel:' + escAttr(place.phone) + '">' + escHtml(place.phone) + "</a></p>";
      }
      if (place.email) {
        html += '<p class="mapl-popup-email"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg><a href="mailto:' + escAttr(place.email) + '">' + escHtml(place.email) + "</a></p>";
      }
      if (place.services && place.services.length) {
        html += '<p class="mapl-popup-services"><svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z"/></svg><span>' + escHtml(place.services.join(", ")) + "</span></p>";
      }
      if (place.opening_hours) {
        html += '<p class="mapl-popup-hours">' + SVG_CLOCK + "<span>" + escHtml(place.opening_hours) + "</span></p>";
      }
      if (place.accessibility && place.accessibility.length) {
        html += '<p class="mapl-popup-access">' + SVG_ACCESS + "<span>" + escHtml(place.accessibility.join(", ")) + "</span></p>";
      }
      var siteWeb = safeUrl(place.website);
      if (siteWeb) {
        html += '<p class="mapl-popup-website">' + SVG_GLOBE + '<a href="' + escAttr(siteWeb) + '" target="_blank" rel="noopener noreferrer">' + escHtml(prettyUrl(siteWeb)) + "</a></p>";
      }
      if (place.distance) {
        html += '<p class="mapl-popup-distance"><strong>' + place.distance + " km</strong></p>";
      }
      html += "</div>";
      html += "</div>";
      html += "</div>";
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
      var pin = el.querySelector(".mapl-marker");
      if (!pin) return;
      if (active) {
        pin.style.transform = "translateY(-5px) scale(1.15)";
        pin.style.filter = "drop-shadow(0 8px 14px rgba(0,0,0,0.35))";
      } else {
        pin.style.transform = "";
        pin.style.filter = "";
      }
    },
    /**
     * Requests the browser geolocation and centers the map on the
     * user's position, then reloads markers with proximity sorting.
     */
    handleGeolocation() {
      var self = this;
      var $btn = this.$container.find(".mapl-geoloc-btn");
      if (!navigator.geolocation) {
        var errorMsg = t("geolocUnavailable");
        this.showToast(errorMsg);
        return;
      }
      $btn.addClass("loading");
      navigator.geolocation.getCurrentPosition(
        function(position) {
          self.userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          self.map.setView([self.userLocation.lat, self.userLocation.lng], 11);
          self.addUserLocationMarker();
          self.renderAll();
          $btn.removeClass("loading");
        },
        function() {
          var errorMsg2 = t("geolocError");
          self.showToast(errorMsg2);
          $btn.removeClass("loading");
        },
        { enableHighAccuracy: true, timeout: 1e4, maximumAge: 0 }
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
            html: '<div class="mapl-user-marker"></div>',
            className: "mapl-user-marker-icon",
            iconSize: [20, 20],
            iconAnchor: [10, 10]
          })
        }
      ).addTo(this.map);
      this.userCircle = L.circle(
        [this.userLocation.lat, this.userLocation.lng],
        {
          radius: 5e4,
          // 50 km default
          color: DEFAULT_COLOR,
          fillColor: DEFAULT_COLOR,
          fillOpacity: 0.08,
          weight: 1.5,
          dashArray: "6 4"
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
    }
  };

  // assets/js/src/deep-link.mjs
  var MAX_LENGTH = 200;
  var SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;
  function isValidPlaceParam(value) {
    if (typeof value !== "string") return false;
    var trimmed = value.trim();
    if (!trimmed || trimmed.length > MAX_LENGTH) return false;
    return SLUG_PATTERN.test(trimmed);
  }
  function parsePlaceParam(search) {
    var params;
    try {
      params = new URLSearchParams(search || "");
    } catch (e) {
      return null;
    }
    var value = params.get("place");
    if (!value) return null;
    var trimmed = value.trim();
    return isValidPlaceParam(trimmed) ? trimmed : null;
  }
  function hasCoords(place) {
    return !!place && !!place.lat && !!place.lng;
  }
  function findPlaceByParam(places, param) {
    if (!param || !Array.isArray(places)) return null;
    var lower = param.toLowerCase();
    var bySlug = places.filter(function(place) {
      return hasCoords(place) && typeof place.slug === "string" && place.slug !== "" && place.slug.toLowerCase() === lower;
    })[0];
    if (bySlug) return bySlug;
    if (/^\d+$/.test(param)) {
      var id = parseInt(param, 10);
      return places.filter(function(place) {
        return hasCoords(place) && place.id === id;
      })[0] || null;
    }
    return null;
  }
  function findPlaceById(places, id) {
    if (!Array.isArray(places)) return null;
    return places.filter(function(place) {
      return place && place.id === id;
    })[0] || null;
  }
  function placeLinkValue(place) {
    if (!place) return "";
    return place.slug && String(place.slug).trim() !== "" ? String(place.slug) : String(place.id);
  }
  function withPlaceParam(href, value) {
    var url;
    try {
      url = new URL(href);
    } catch (e) {
      return href;
    }
    if (value) {
      url.searchParams.set("place", value);
    } else {
      url.searchParams.delete("place");
    }
    return url.toString();
  }

  // assets/js/src/map.mjs
  var $3 = window.jQuery;
  var MappedPlacesMap = class {
    constructor(container) {
      this.$container = $3(container);
      this.mapId = this.$container.attr("id");
      this.map = null;
      this.markers = null;
      this.markerMap = {};
      this._markerCache = {};
      this.allPlaces = [];
      this.filteredPlaces = [];
      this.typeCatalog = {};
      this.searchTerm = "";
      this.activeFilter = "";
      this._galleryCache = {};
      this.activeEntities = {};
      this.userLocation = null;
      this.userMarker = null;
      this.userCircle = null;
      this._searchTimer = null;
      this._escHandler = null;
      this._destroyed = false;
      this._dataRequest = null;
      this.config = {
        centerLat: parseFloat(this.$container.data("center-lat")) || 0,
        centerLng: parseFloat(this.$container.data("center-lng")) || 0,
        zoom: parseInt(this.$container.data("zoom")) || 8,
        tileStyle: this.$container.data("tile-style") || "positron",
        // Sans ajustement, centre et zoom du réglage restent en place.
        fitBounds: String(this.$container.data("fit-bounds")) !== "false"
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
      var mapCanvas = this.$container.find(".mapl-map-canvas")[0];
      this.map = L.map(mapCanvas, {
        center: [this.config.centerLat, this.config.centerLng],
        zoom: this.config.zoom,
        scrollWheelZoom: true,
        zoomControl: false,
        maxZoom: 19
      });
      L.control.zoom({ position: "bottomright" }).addTo(this.map);
      const vectorReady = typeof L.maplibreGL === "function";
      const tile = resolveTile(this.config.tileStyle, vectorReady);
      if (tile.type === "vector") {
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
        maxZoom: tile.maxZoom
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
        style: tile.url,
        attribution: tile.attribution
      }).addTo(this.map);
      if (this.map.attributionControl && tile.attribution) {
        this.map.attributionControl.addAttribution(tile.attribution);
      }
      var ticks = 0, afterStyle = 0;
      var iv = setInterval(function() {
        ticks++;
        var gm = glLayer.getMaplibreMap ? glLayer.getMaplibreMap() : null;
        if (gm) {
          try {
            gm.resize();
            if (typeof gm.triggerRepaint === "function") {
              gm.triggerRepaint();
            }
          } catch (e) {
          }
          if (gm.isStyleLoaded && gm.isStyleLoaded()) {
            afterStyle++;
          }
        }
        if (afterStyle >= 6 || ticks >= 50) {
          clearInterval(iv);
        }
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
      this.$container.on("input", ".mapl-sidebar-header .mapl-search-input", function() {
        self.onSearch($3(this).val(), "desktop");
      });
      this.$container.on("click", ".mapl-sidebar-header .mapl-search-btn", function() {
        var val = self.$container.find(".mapl-sidebar-header .mapl-search-input").val();
        self.onSearch(val, "desktop");
      });
      this.$container.on("keypress", ".mapl-sidebar-header .mapl-search-input", function(e) {
        if (e.which === 13) {
          self.onSearch($3(this).val(), "desktop");
        }
      });
      this.$container.on("input", ".mapl-mobile-toolbar .mapl-search-input", function() {
        self.onSearch($3(this).val(), "mobile");
      });
      this.$container.on("click", ".mapl-mobile-toolbar .mapl-search-btn", function() {
        var val = self.$container.find(".mapl-mobile-toolbar .mapl-search-input").val();
        self.onSearch(val, "mobile");
      });
      this.$container.on("keypress", ".mapl-mobile-toolbar .mapl-search-input", function(e) {
        if (e.which === 13) {
          self.onSearch($3(this).val(), "mobile");
        }
      });
      this.$container.on("change", ".mapl-sidebar-header .mapl-filter-select", function() {
        self.onFilter($3(this).val(), "desktop");
      });
      this.$container.on("change", ".mapl-mobile-toolbar .mapl-filter-select", function() {
        self.onFilter($3(this).val(), "mobile");
      });
      this.$container.on("click", ".mapl-place-card", function(e) {
        if ($3(e.target).closest(".mapl-place-phone").length) return;
        var id = parseInt($3(this).data("id"), 10);
        self.focusPlace(id);
      });
      this.$container.on("mouseenter", ".mapl-place-card", function() {
        var id = parseInt($3(this).data("id"), 10);
        self.highlightMarker(id, true);
      });
      this.$container.on("mouseleave", ".mapl-place-card", function() {
        var id = parseInt($3(this).data("id"), 10);
        self.highlightMarker(id, false);
      });
      this.$container.on("click", ".mapl-entity-pill", function() {
        var slug = String($3(this).attr("data-entity"));
        self.activeEntities = toggleEntitySelection(self.activeEntities, slug);
        self.syncEntityPills();
        self.renderAll();
      });
      this.$container.on("click", ".mapl-entity-reset", function() {
        self.activeEntities = {};
        self.syncEntityPills();
        self.renderAll();
      });
      this.$container.on("click", ".mapl-geoloc-btn", function() {
        self.handleGeolocation();
      });
      this.$container.on("input", ".mapl-search-input", function() {
        var $input = $3(this);
        var $row = $input.closest(".mapl-search-row");
        var val = $input.val();
        clearTimeout(self._acTimer);
        self._acTimer = setTimeout(function() {
          self.renderAutocompleteSuggestions(val, $row);
        }, 200);
      });
      this.$container.on("click", ".mapl-autocomplete-item", function() {
        self.selectSuggestion($3(this).data("place-id"));
      });
      this.$container.on("keydown", ".mapl-search-input", function(e) {
        var $row = $3(this).closest(".mapl-search-row");
        var $dropdown = $row.find(".mapl-autocomplete-results");
        if (!$dropdown.length || $dropdown.is("[hidden]")) return;
        if (e.key === "ArrowDown") {
          e.preventDefault();
          self.navigateAutocomplete(1, $row);
        } else if (e.key === "ArrowUp") {
          e.preventDefault();
          self.navigateAutocomplete(-1, $row);
        } else if (e.key === "Enter") {
          var $target = $dropdown.find(".mapl-autocomplete-item.is-highlighted").first();
          if (!$target.length) {
            $target = $dropdown.find(".mapl-autocomplete-item").first();
          }
          if ($target.length) {
            e.preventDefault();
            self.selectSuggestion($target.data("place-id"));
          }
        } else if (e.key === "Escape") {
          self.closeAutocomplete();
        }
      });
      $3(document).on("click.maplAC_" + this.mapId, function(e) {
        if (!$3(e.target).closest(".mapl-search-row").length) {
          self.closeAutocomplete();
        }
      });
      this.map.on("popupopen", function(e) {
        var $node = $3(e.popup._contentNode);
        var $content = $node.find(".mapl-popup-content");
        var placeId = parseInt($content.data("place-id"), 10);
        if (!placeId) return;
        if (self._galleryCache[placeId]) {
          self.injectGalleryIntoPopup($node, self._galleryCache[placeId]);
          return;
        }
        if (self._galleryXHR && self._galleryXHR.readyState !== 4) {
          self._galleryXHR.abort();
        }
        self._galleryXHR = $3.ajax({
          url: mappedPlacesConfig.restUrl + "places/" + placeId,
          method: "GET",
          success: function(response) {
            self._galleryCache[placeId] = response.gallery || [];
            self.injectGalleryIntoPopup($node, self._galleryCache[placeId]);
          },
          error: function(xhr, status) {
            if (status === "abort") return;
            self.injectGalleryIntoPopup($node, []);
          }
        });
      });
    }
    /* ============================================================ */
    /*  CONTROLS: FULLSCREEN, MOBILE DRAWER, ESC                     */
    /* ============================================================ */
    initControls() {
      var self = this;
      this.$container.on("click", ".mapl-fullscreen-btn", function() {
        self.toggleFullscreen();
      });
      this.$container.on("click", ".mapl-sidebar-toggle", function() {
        self.toggleDrawer();
      });
      this.$container.on("click", ".mapl-drawer-handle", function() {
        self.closeDrawer();
      });
      this._escHandler = function(e) {
        if (e.key === "Escape" && self.$container.hasClass("mapl-fullscreen")) {
          self.exitFullscreen();
        }
      };
      $3(document).on("keydown.maplmap_" + this.mapId, this._escHandler);
    }
    /* ============================================================ */
    /*  FULLSCREEN                                                   */
    /* ============================================================ */
    toggleFullscreen() {
      if (this.$container.hasClass("mapl-fullscreen")) {
        this.exitFullscreen();
      } else {
        this.enterFullscreen();
      }
    }
    enterFullscreen() {
      this.$container.addClass("mapl-fullscreen");
      $3("body").addClass("mapl-body-fullscreen");
      var $btn = this.$container.find(".mapl-fullscreen-btn");
      $btn.attr("aria-label", t("exitFullscreen"));
      $btn.html(SVG_FULLSCREEN_EXIT);
      var map = this.map;
      setTimeout(function() {
        map.invalidateSize();
      }, 50);
    }
    exitFullscreen() {
      this.$container.removeClass("mapl-fullscreen");
      $3("body").removeClass("mapl-body-fullscreen");
      var $btn = this.$container.find(".mapl-fullscreen-btn");
      $btn.attr("aria-label", t("enterFullscreen"));
      $btn.html(SVG_FULLSCREEN_ENTER);
      var map = this.map;
      setTimeout(function() {
        map.invalidateSize();
      }, 50);
    }
    /* ============================================================ */
    /*  MOBILE DRAWER                                                */
    /* ============================================================ */
    toggleDrawer() {
      var $sidebar = this.$container.find(".mapl-map-sidebar");
      var $toggle = this.$container.find(".mapl-sidebar-toggle span");
      var isOpen = $sidebar.hasClass("mapl-drawer-open");
      if (isOpen) {
        $sidebar.removeClass("mapl-drawer-open");
        $toggle.text(t("filters"));
        this.$container.find(".mapl-sidebar-toggle").attr("aria-label", t("openFilters"));
      } else {
        $sidebar.addClass("mapl-drawer-open");
        $toggle.text(t("close"));
        this.$container.find(".mapl-sidebar-toggle").attr("aria-label", t("closeFilters"));
      }
    }
    closeDrawer() {
      var $sidebar = this.$container.find(".mapl-map-sidebar");
      if ($sidebar.hasClass("mapl-drawer-open")) {
        $sidebar.removeClass("mapl-drawer-open");
        this.$container.find(".mapl-sidebar-toggle span").text(t("filters"));
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
      this._dataRequest = $3.ajax({
        url: mappedPlacesConfig.restUrl + "places",
        method: "GET",
        // Route publique : pas de nonce. Périmé (page en cache HTML
        // depuis plus de 24 h), il ferait répondre 403 à WordPress.
        success: function(response) {
          if (self._destroyed) return;
          self.typeCatalog = buildTypeCatalog(response.types);
          self._markerCache = {};
          self.allPlaces = response.places || [];
          self.filteredPlaces = self.allPlaces.slice();
          self.buildEntityPills();
          self.renderAll();
          self.showLoading(false);
          self.applyDeepLinkSelection();
        },
        error: function(xhr, status) {
          if (self._destroyed || status === "abort") return;
          self.showLoading(false);
          self.showToast(t("loadError"));
        }
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
        if (source === "desktop") {
          self.$container.find(".mapl-mobile-toolbar .mapl-search-input").val(val);
        } else {
          self.$container.find(".mapl-sidebar-header .mapl-search-input").val(val);
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
      if (source === "desktop") {
        this.$container.find(".mapl-mobile-toolbar .mapl-filter-select").val(val);
      } else {
        this.$container.find(".mapl-sidebar-header .mapl-filter-select").val(val);
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
      var q = foldText((this.searchTerm || "").trim());
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
      var base = this.getFacetBase();
      var counts = countTypes(base);
      var selected = this.activeFilter;
      var allLabel = t("filterAll");
      var options = '<option value="">' + escHtml(allLabel) + " (" + base.length + ")</option>";
      var self = this;
      visibleTypeKeys(counts, Object.keys(this.typeCatalog), selected).forEach(function(k) {
        options += '<option value="' + escAttr(k) + '">' + escHtml(self.getTypeConfig(k).label) + " (" + (counts[k] || 0) + ")</option>";
      });
      this.$container.find(".mapl-filter-select").html(options).val(selected);
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
              name: e.entity.name,
              color: sanitizeColor(e.entity.color)
            };
          }
        }
      });
      var slugs = Object.keys(entities);
      if (!slugs.length) return;
      var current = this.activeEntities;
      this.activeEntities = slugs.reduce(function(next, slug) {
        if (current[slug] === true) next[slug] = true;
        return next;
      }, {});
      var hint = t("entityHint");
      var resetTxt = t("entityReset");
      var html = '<div class="mapl-entity-section"><p class="mapl-entity-hint">' + SVG_HINT + "<span>" + escHtml(hint) + '</span><button type="button" class="mapl-entity-reset" hidden>' + escHtml(resetTxt) + '</button></p><div class="mapl-entity-pills">';
      slugs.forEach(function(slug) {
        var ent = entities[slug];
        html += '<button type="button" class="mapl-entity-pill" aria-pressed="false" data-entity="' + escAttr(slug) + '" style="--pill-color:' + ent.color + '"><span class="mapl-entity-pill-dot"></span>' + escHtml(ent.name) + "</button>";
      });
      html += "</div></div>";
      this.$container.find(".mapl-entity-section").remove();
      this.$container.find(".mapl-map-canvas").before(html);
      this.syncEntityPills();
    }
    /**
     * Reflect the entity selection on the pills: selected pills stay
     * filled (aria-pressed), the others turn to outline while a selection
     * exists. « Tout afficher » only shows when a filter is active.
     */
    syncEntityPills() {
      var selection = this.activeEntities;
      var hasSelection = Object.keys(selection).length > 0;
      this.$container.find(".mapl-entity-pill").each(function() {
        var selected = selection[String($3(this).attr("data-entity"))] === true;
        $3(this).toggleClass("is-selected", selected).toggleClass("inactive", hasSelection && !selected).attr("aria-pressed", selected ? "true" : "false");
      });
      this.$container.find(".mapl-entity-reset").prop("hidden", !hasSelection);
    }
    /* ============================================================ */
    /*  RENDER ALL                                                   */
    /* ============================================================ */
    /**
     * Master render function. Recomputes the filtered list, then
     * re-renders markers, establishment cards, and the results count.
     */
    renderAll() {
      if (this._destroyed || !this.markers) return;
      this.filteredPlaces = this.getFiltered();
      this.updateTypeCounts();
      this.renderMarkers();
      this.renderPlaceList();
      this.$container.find(".mapl-results-count").text(this.filteredPlaces.length);
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
      var $list = this.$container.find(".mapl-place-list");
      var self = this;
      $list.empty();
      if (this.filteredPlaces.length === 0) {
        var noResultsText = escHtml(t("noResults"));
        $list.html(
          '<div class="mapl-no-results">' + SVG_NO_RESULTS + "<p>" + noResultsText + "</p></div>"
        );
        return;
      }
      var cards = this.filteredPlaces.map(function(place) {
        var typeStr = place.types && place.types[0] ? place.types[0] : "";
        var config = self.getTypeConfig(typeStr);
        var entityColor = resolveEntityColor(place, config.color);
        var cityStr = place.city || "";
        var phoneHtml = "";
        if (place.phone) {
          phoneHtml = '<a href="tel:' + escAttr(place.phone) + '" class="mapl-place-phone" onclick="event.stopPropagation()">' + SVG_PHONE + escHtml(place.phone) + "</a>";
        }
        var managerHtml = place.manager ? '<div class="mapl-place-manager">' + escHtml(place.manager) + "</div>" : "";
        var cardHtml = '<div class="mapl-place-card" data-id="' + place.id + '" data-lat="' + (place.lat || "") + '" data-lng="' + (place.lng || "") + '" role="listitem" tabindex="0"><div class="mapl-place-icon" style="background:' + entityColor + "12;color:" + entityColor + '"><svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">' + config.svgPath + '</svg></div><div class="mapl-place-info"><div class="mapl-place-name">' + escHtml(place.title) + '</div><div class="mapl-place-meta"><span class="mapl-place-type" style="background:' + entityColor + "18;color:" + entityColor + '">' + escHtml(config.label) + '</span><span class="mapl-place-city">' + escHtml(cityStr) + "</span></div>" + managerHtml + phoneHtml + "</div></div>";
        return cardHtml;
      });
      $list.html(cards.join(""));
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
      this.$container.find(".mapl-place-card").removeClass("active");
      var $card = this.$container.find('.mapl-place-card[data-id="' + id + '"]');
      $card.addClass("active");
      if ($card.length) {
        var $list = this.$container.find(".mapl-place-list");
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
        this.showToast(t("placeNotFound"));
        return;
      }
      this.searchTerm = "";
      this.activeFilter = "";
      this.activeEntities = {};
      this.$container.find(".mapl-search-input").val("");
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
      if (!place || typeof window.history === "undefined" || !window.history.replaceState) return;
      var url = withPlaceParam(window.location.href, placeLinkValue(place));
      if (url !== window.location.href) {
        window.history.replaceState(window.history.state, "", url);
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
      this.$container.find(".mapl-map-loading").toggle(show);
    }
    /**
     * Shows a temporary toast notification inside the map container.
     *
     * @param {string} message - Message to display
     */
    showToast(message) {
      var $toast = $3('<div class="mapl-toast" role="status">' + escHtml(message) + "</div>");
      this.$container.append($toast);
      setTimeout(function() {
        $toast.addClass("mapl-toast-visible");
      }, 10);
      setTimeout(function() {
        $toast.removeClass("mapl-toast-visible");
        setTimeout(function() {
          $toast.remove();
        }, 300);
      }, 4e3);
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
      if (this._dataRequest && typeof this._dataRequest.abort === "function") {
        this._dataRequest.abort();
        this._dataRequest = null;
      }
      $3(document).off("keydown.maplmap_" + this.mapId);
      $3(document).off(".maplAC_" + this.mapId);
      this.$container.off();
      if (this.map) {
        this.map.remove();
        this.map = null;
      }
      this.markers = null;
      this.markerMap = {};
      this._markerCache = {};
      this._escHandler = null;
    }
  };
  Object.assign(MappedPlacesMap.prototype, autocompleteMethods, carouselMethods, markersMethods);

  // assets/js/src/index.mjs
  var $4 = window.jQuery;
  $4(document).ready(function() {
    $4(".mapl-map-container").each(function() {
      var instance = new MappedPlacesMap(this);
      $4(this).data("mapped-places", instance);
    });
  });
  function onElementorWidgetReady($scope) {
    var $container = $scope.find(".mapl-map-container");
    if (!$container.length) return;
    var existing = $container.data("mapped-places");
    var enEdition = typeof elementorFrontend.isEditMode === "function" && elementorFrontend.isEditMode();
    if (existing && !enEdition) {
      return;
    }
    if (existing && typeof existing.destroy === "function") {
      existing.destroy();
    }
    $container.data("mapped-places", new MappedPlacesMap($container[0]));
  }
  window.MappedPlaces = {
    init: function(container) {
      var $container = $4(container);
      var existing = $container.data("mapped-places");
      if (existing && typeof existing.destroy === "function") {
        existing.destroy();
      }
      var instance = new MappedPlacesMap(container);
      $container.data("mapped-places", instance);
      return instance;
    }
  };
  $4(window).on("elementor/frontend/init", function() {
    if (typeof elementorFrontend === "undefined") return;
    var names = window.mappedPlacesConfig && mappedPlacesConfig.elementorWidgets || [];
    names.forEach(function(name) {
      elementorFrontend.hooks.addAction("frontend/element_ready/" + name + ".default", onElementorWidgetReady);
    });
  });
})();
