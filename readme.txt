=== Mapped Places by Théodore Riant ===
Contributors: theodoreriant
Tags: map, store locator, locations, directory, leaflet
Requires at least: 6.5
Tested up to: 7.1
Requires PHP: 7.4
Stable tag: 2.2.0
License: GPLv2 or later
License URI: https://www.gnu.org/licenses/gpl-2.0.html

Interactive map of your places with search, filters, a synchronised list and photo popups. Block, Elementor widget and shortcode.

== Description ==

Mapped Places turns a list of places into an interactive map your visitors can search and filter, with a list that follows the map and popups showing photos, contact details and opening hours. Add it with the **Mapped Places Map block**, the **Elementor widget** or the `[mapped-places]` shortcode.

Features:

* marker clusters coloured by entity, and entity pills to filter the map;
* a type filter with faceted counts;
* search with suggestions, insensitive to case, accents and apostrophes;
* a list synchronised with the map, and rich popups with a photo carousel;
* a responsive layout with a mobile toolbar, fullscreen mode, keyboard accessible;
* a Gutenberg block with a live preview in the editor, an Elementor widget with style controls, and a shortcode;
* basemaps from OpenFreeMap, OpenStreetMap, IGN, CARTO, Jawg, MapTiler, Stadia and Thunderforest, with a keyless fallback;
* a CSV import that geocodes addresses, imports photos, entity colours and type icons, plus a sample dataset to try it;
* a public read-only REST API (`mapped-places/v1`).

= Who is it for? =

Networks and organisations with several sites (associations, public services, health or social care providers, franchises), directories and store locators, event venues, tourism offices: anyone who wants a map of their places that stays up to date from WordPress.

Places are a WordPress post type with taxonomies (entity with a colour, type with an icon, region, service, accessibility). Editors get geocoding with a draggable marker, a sortable photo gallery, one-click duplication and a CSV import.

No external CDN: Leaflet, MarkerCluster and MapLibre are bundled. The interface is in English and French.

= Accessibility =

The map can be used with the keyboard: search suggestions with arrow keys and Enter, place cards focusable, Escape to leave fullscreen. Results and toasts are announced to screen readers (`aria-live`), entity pills expose their state (`aria-pressed`), the carousel has labelled controls, and animations follow `prefers-reduced-motion`.

= Developers =

Every site-specific behaviour goes through filters (`mapped_places_defaults`, `mapped_places_type_catalog`, `mapped_places_icons`, `mapped_places_import_columns`, `mapped_places_geocoder_url`, `mapped_places_place_slug`, `mapped_places_migration_steps` and more), documented in `docs/hooks.md` on GitHub. The map is restyled by overriding `--mapl-*` CSS custom properties. The REST API is documented in `docs/rest-api.md`.

Site-specific behaviour (default values, icons, CSV columns, URL slugs, labels, data migrations) goes through filters, so a companion plugin can adapt Mapped Places without modifying it.

= Privacy =

No analytics, no tracking, no data sent to the plugin author. Visitors only reach the map tile provider selected by the site owner (see External services). Place data stays in the WordPress database. The Poppins font is served from the plugin (SIL Open Font License).

= Source code and development =

Development happens on GitHub: https://github.com/TheodoreRiant/mapped-places (source, issues, changelog, contribution guide). The plugin ships its readable sources; the only third-party code is in `assets/vendor/`, with each library's licence and version.

== External services ==

Mapped Places never sends anything to the plugin author. It relies on the third-party services below, and only to do what the site owner set up. Leaflet, MarkerCluster, MapLibre and the Poppins font are bundled with the plugin: no CDN, no external script.

= Map tiles (basemap) =

The map is drawn from tiles that the **visitor's browser** downloads from the basemap provider chosen by the site owner in **Places → Map settings** (or per map, in the block, widget or shortcode). This happens on every page that displays a map, each time the visitor pans or zooms.

What is sent to the provider: the coordinates of the tiles being viewed (map area and zoom level), the visitor's IP address and browser headers, as with any image embedded in a page, and, for keyed providers, the site's API key. No place data and no personal data from the WordPress site are sent.

Providers, with their terms and privacy policies:

* **OpenFreeMap** (tiles.openfreemap.org; default, used without a key, also the fallback when a keyed provider has no valid key; its conditions of use are stated on its home page): terms: https://openfreemap.org/, privacy: https://openfreemap.org/privacy/
* **OpenStreetMap** (tile.openstreetmap.org, OpenStreetMap Foundation, attribution https://www.openstreetmap.org/copyright, tile usage policy https://operations.osmfoundation.org/policies/tiles/): terms: https://osmfoundation.org/wiki/Terms_of_Use, privacy: https://osmfoundation.org/wiki/Privacy_Policy
* **OpenStreetMap France** (tile.openstreetmap.fr, run by the OpenStreetMap France association, used without a key): terms: https://wiki.openstreetmap.org/wiki/FR:Serveurs/tile.openstreetmap.fr, privacy: https://www.openstreetmap.fr/mentions-legales/
* **IGN Géoplateforme** (data.geopf.fr, French national mapping agency, raster and vector tiles): terms: https://cartes.gouv.fr/cgu/, privacy: https://www.ign.fr/institut/donnees-caractere-personnel
* **CARTO** (basemaps.cartocdn.com, API key required): terms: https://carto.com/legal/, privacy: https://carto.com/privacy/
* **Jawg Maps** (tile.jawg.io, API key required): terms: https://www.jawg.io/en/terms/, privacy: https://www.jawg.io/en/confidentiality/
* **MapTiler** (api.maptiler.com, API key required): terms: https://www.maptiler.com/terms/, privacy: https://www.maptiler.com/privacy-policy/
* **Stadia Maps** (tiles.stadiamaps.com, API key required): terms: https://stadiamaps.com/terms-of-service/, privacy: https://stadiamaps.com/privacy/privacy-policy/
* **Thunderforest** (tile.thunderforest.com, API key required): terms: https://www.thunderforest.com/terms/, privacy: https://www.thunderforest.com/privacy/

A keyed provider is only ever contacted if the site owner has selected it and entered a key. The site owner can also enter a custom tile URL: the provider is then whichever service they chose.

= Geocoding (addresses to coordinates) =

Only in the administration, never for visitors. When an editor imports a CSV file whose rows have no coordinates, or clicks **Geocode address** while editing a place, the postal address of that place (street, postal code, city) is sent to the **Base Adresse Nationale** geocoding API (api-adresse.data.gouv.fr), a French public service used without a key, which returns the coordinates. When an editor drags the marker on the location map, the reverse geocoding endpoint of the same API receives the coordinates and returns the address.

Terms: https://adresse.data.gouv.fr/cgu, privacy: https://adresse.data.gouv.fr/donnees-personnelles

The `mapped_places_geocoder_url` filter lets a developer point the CSV import to another GeoJSON geocoder (for example Nominatim, https://operations.osmfoundation.org/policies/nominatim/): the terms of that service then apply.

== Installation ==

1. Upload the plugin and activate it.
2. Add places in **Places**, or import a CSV file (**Places → Import CSV**), or import the sample dataset.
3. Add the map to a page with the **Mapped Places Map** block (WordPress 6.6 or later), the **Mapped Places** Elementor widget, or the `[mapped-places]` shortcode.
4. Optional: in **Places → Map settings**, choose the basemap and set the tile provider API key.

== Frequently Asked Questions ==

= Which basemaps are available? =

Positron via OpenFreeMap, OpenStreetMap and IGN (France) maps work without a key. CARTO, Jawg, MapTiler, Stadia and Thunderforest maps need an API key, set in **Map settings** or with the `MAPPED_PLACES_TILE_API_KEY` constant. Without a valid key, the map falls back to Positron via OpenFreeMap, which looks the same and needs no key.

= Which CSV columns are recognised? =

Name, Type, Type icon, Service, Accessibility, Entity, Entity colour, Description, Audience, Capacity, Address, Postal code, City, Region, Department, Latitude, Longitude, Phone, Email, Website, Manager, Opening hours, in English or French, accents and case ignored. Services and accessibility accept several values separated by `;`. Rows without coordinates are geocoded.

= Can I use another geocoder? =

Yes: the `mapped_places_geocoder_url` filter points the import to any GeoJSON geocoder (for example Nominatim with `format=geojson`).

= Which shortcode attributes are available? =

`height` (a CSS length such as `600px` or `80vh`, or `container` to let your stylesheet size the map), `center_lat`, `center_lng`, `zoom`, `fit_bounds` (`false` keeps the centre and zoom instead of zooming to the places), `show_search`, `show_filter`, `show_list`, `show_fullscreen`, `sidebar_position` (`left` or `right`), `sidebar_title`, `sidebar_subtitle`, `tile_style`.

= Can I use my own colours, font and names? =

Yes, without code: **Places → Map settings → Appearance** sets the main and accent colours, the font (the bundled Poppins or your theme's font) and the corner radius for every map; **Labels and defaults** renames places and entities in the admin, changes the URL slug of places and sets the default title, centre and zoom of new maps. Developers can do the same with filters.

= Do I need Elementor? =

No. The block and the shortcode work on any theme. The Elementor widget is added only when Elementor is active.

= Why do CARTO maps show "API key required"? =

Since 2026, CARTO serves its basemaps only with a key. Enter one in **Places → Map settings**, or keep the default Positron basemap served by OpenFreeMap, which looks the same and needs no key.

= How do I try it quickly? =

In **Places → Import CSV**, import the sample dataset: 16 fictional places with photos, types, entities and opening hours. Then add the block to a page.

= How many places can it handle? =

The map loads all published places once and filters them in the browser, which keeps search instant. Markers are clustered and built once per place, and the REST responses are cached and refreshed as soon as a place changes. Several hundred places work comfortably; for many thousands, test on your hosting.

= Is it GDPR friendly? =

Mapped Places sets no cookie, has no analytics and sends nothing to its author. The only third party reached by visitors is the tile provider you choose (see External services). Address geocoding happens only in the admin.

= Can I translate it? =

Yes. The source strings are in English and every string is translatable. Translations are managed on translate.wordpress.org and delivered by WordPress as language packs; the French translation is maintained by the author.

== Screenshots ==

1. The map with its sidebar, entity pills, type icons and clusters.
2. A place popup with its photo carousel, contact details and opening hours.
3. Search with suggestions, insensitive to accents and case.
4. On a phone: search and type filter above the map, entity pills below them.
5. Editing a place: a form with the location (geocoding and a draggable marker), description, contact details, people and photos.
6. Map settings: basemap forced for the whole site and provider API key.
7. The Mapped Places Map block in the editor, with its live preview and settings.
8. The Elementor widget and its settings, with the live map in the Elementor editor.

== Changelog ==

= 2.2.0 =
* Each place now has a shareable link that opens the map with it already selected (`?place=<slug>`): pin centred, popup open, highlighted in the sidebar list. Copy it from the place edit screen or from the "Copy link" row action in the places list. Configure the map page under Map settings → Place links (detected automatically from the `[mapped-places]` shortcode or the Mapped Places Map block when left empty).

= 2.1.5 =
* Packaging: development files that slipped into the first directory release are excluded. No functional change.

= 2.1.4 =
* First release on the WordPress.org plugin directory. No functional change.

= 2.1.3 =
* Fix: a site installed from the GitHub archive was in English; that archive ships the French translation again and loads it when no language pack is installed. The WordPress.org version relies on language packs.

= 2.1.2 =
* readme: each basemap provider names the host reached by the visitor's browser; OpenStreetMap France listed with its terms and legal notice.
* Legacy import: Elementor layouts selected with one prepared query per old widget name.

= 2.1.1 =
* Fix: the place popup no longer repeats the postal code and the city when the address already contains them.
* The admin menu uses the WordPress pin icon again, easier to read.

= 2.1.0 =
* New: upgrade from Geofolio 1.x, the plugin's former name. Sites that still hold Geofolio data are offered the import on the Places screens: post type, taxonomies, meta, settings, Elementor widgets, shortcode and block are renamed in place, then the old plugin is deactivated.
* New: legacy import can rename blocks (`blocks` key).
* Fix: renaming Elementor widgets during an import no longer loads every Elementor layout of the site at once (memory exhaustion on large sites).

= 2.0.0 =
* Renamed Mapped Places (formerly Geofolio). New slug, text domain, post type, taxonomies, meta keys, hooks, options, REST namespace and block name: a breaking change for code written against 1.x.
* Admin notices appear only on the plugin's own screens; the migration re-run button moved to the Map settings.
* Translations are delivered by WordPress language packs; the plugin no longer ships translation files.
* External services (basemap providers and geocoder) documented with their terms and privacy policies.
* Fix: the duplication link sanitises its parameters before checking the nonce.

= 1.4.0 =
* New: Appearance settings (colours, font, corner radius) and Labels settings (names, URL slug, default map texts).
* New: import from a previous map plugin, described by a filter: data renamed in place, icons matched to types, managers converted to people, Elementor widgets and shortcodes rewritten, after a confirmation screen and a snapshot.
* New: plugin icon and admin menu icon.
* Fix: a REST request with `lat` or `lng` caused a fatal error on PHP 8.
* Fix: icon matching during the import ignores accents and case.

= 1.3.0 =
* New: Mapped Places Map block for the block editor, with the real map as preview and all display settings.
* New: the place edit screen is a form (location, description, contact, people, photos) instead of the article editor.
* New: several people per place, each with a role and a name.
* Fix: the location map in the admin could draw only a corner of its tiles.
* Fix: search suggestions no longer split the highlighted word.
* Plugin directory page: readme, icon, banner, screenshots and Live Preview.

= 1.2.1 =
* Fix: every single post or page crashed (fatal error) on sites without Elementor.
* Faster filtering: map markers are built once and reused.
* Internal: stylesheet and map script split into sources, no visible change.

= 1.2.0 =
* Fix: the settings and CSV import pages were unreachable (403) and missing from the Places menu.
* Elementor widget: responsive map height (tablet and mobile keep their own heights), "Fit the view to the places" switch, styles for the sidebar title and subtitle and for the entity pills.
* The map shows a message when the places cannot be loaded; the results counter is announced to screen readers.
* Faster map loading: the place list and filters are cached, and refreshed as soon as a place, a term or a setting changes.

= 1.1.0 =
* Complete sample dataset: 16 places with photos, contacts, managers, opening hours, entity colours and type icons.
* CSV import: type icon, entity colour, audience, region, accessibility and photo columns; several values per cell.
* Keyless fallback basemap: Positron via OpenFreeMap, worldwide.

= 1.0.0 =
* First public release, derived from a map plugin built for a single client: generic post type and taxonomies, English source strings with a French translation, data-driven type icons, generic CSV import, extension filters, PSR-4 code base.

== Upgrade Notice ==

= 2.1.0 =
Coming from Geofolio 1.x? Install Mapped Places alongside it, then open Places and confirm the import: your data is renamed in place and Geofolio is deactivated.

= 2.0.0 =
The plugin is renamed Mapped Places. Every internal name changes (post type, taxonomies, meta keys, hooks, options): code written for 1.x must be updated, and 1.x data is not migrated automatically.

= 1.4.0 =
Adds Appearance and Labels settings, an import from a previous map plugin, and fixes a fatal error on PHP 8 with location queries.

= 1.3.0 =
Adds the Mapped Places Map block (WordPress 6.6+) and a simpler place edit form with people and roles. Existing managers are kept.

= 1.2.1 =
Critical fix for sites without Elementor: single posts and pages no longer crash. Update now.

= 1.2.0 =
Fixes the unreachable settings and import pages. Elementor widget: tablet and mobile now keep their own map height (600px and 85vh by default) instead of the desktop height; set them in the widget if needed.
