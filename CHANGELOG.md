# Changelog — Mapped Places

Notable changes to Mapped Places. Format based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/), versions follow [SemVer](https://semver.org/).

## [Unreleased]

## [2.1.4] — 2026-09-28

First release published on the WordPress.org plugin directory (https://wordpress.org/plugins/mapped-places/, approved on 28/09/2026). No change to the plugin itself.

### Changed
- Deploy workflows: active (`WPORG_DEPLOY`), can also be run by hand for a tag already pushed (`workflow_dispatch`); the deployed content follows `.distignore`.

## [2.1.3] — 2026-09-25

### Fixed
- A site installed from the GitHub archive was entirely in English: 2.0.0 had removed the translation files from every archive and the `load_plugin_textdomain()` call, relying on WordPress.org language packs that do not exist yet (seen in production on 25/09/2026). The GitHub release archive ships `languages/` again and `Plugin::load_bundled_translations()` loads the bundled `.mo` on `init` when no language pack is installed (a language pack keeps priority). The WordPress.org build still ships no translation file: `.distignore` (read by the deploy workflow) and `tools/build-wporg-zip.sh` for a manual upload.

## [2.1.2] — 2026-09-25

### Changed
- readme, External services: every basemap provider names the host the visitor's browser reaches (tiles.openfreemap.org, tile.openstreetmap.org, tile.openstreetmap.fr, data.geopf.fr, basemaps.cartocdn.com, tile.jawg.io, api.maptiler.com, tiles.stadiamaps.com, tile.thunderforest.com); OpenStreetMap France, offered as a keyless basemap, is listed with its own terms and legal notice.
- Legacy import: the Elementor meta ids are selected with one literal prepared query per old widget name (Plugin Check no longer flags an assembled SQL string).

## [2.1.1] — 2026-09-25

### Fixed
- Place popup: the postal code and the city are added to the address only when the address does not already contain them (compared without accents or case, whole words only). Imported files often hold a complete address next to filled postal code and city columns, which showed "26b rue de l'Oiselet, 38300 Bourgoin-Jallieu, 38300, Bourgoin-Jallieu". `formatAddress()` in `text.mjs`, `tests/js/popup-address.test.js`.

### Changed
- Admin menu icon: back to the WordPress pin (`dashicons-location`). The brand pictogram (folded map and pin) could not be read at 20 px.

## [2.1.0] — 2026-09-25

### Added
- **Upgrade from Geofolio 1.x** (the plugin's former name): the core describes its own predecessor (`Migration\Legacy\Geofolio`, priority 5 on `mapped_places_legacy_import`, unless a companion describes another plugin). When a site still holds a `geofolio_settings`, `geofolio_appearance` or `geofolio_labels` option or a `gfo_place` post, the import offered on the Places screens renames `gfo_place`, the `gfo_*` taxonomies, the `_gfo_*` post and term meta, moves those three options, renames the `geofolio_map` Elementor widgets, the `[geofolio]` shortcode and the `geofolio/map` block, then deactivates `geofolio/geofolio.php`. Caches and logs of the old name are left behind. `GEOFOLIO_TILE_API_KEY` in wp-config.php is still honoured.
- Legacy import: `blocks` key (old block names renamed to `mapped-places/map` in the post content, attributes kept; `Legacy\BlockRewriter`), listed on the confirmation screen.

### Fixed
- Legacy import: renaming Elementor widgets loaded every `_elementor_data` meta of the site at once and exhausted PHP memory on a large Elementor site (12 MB of meta, 512 MB limit, observed on 25/09/2026 during a production migration, map empty for four minutes). `ElementorRewriter::apply()` now selects only the meta ids that mention an old widget name, then reads and rewrites them one row at a time, by `meta_id` (a revision keeps its own meta).

## [2.0.0] — 2026-09-25

The plugin is renamed **Mapped Places** (formerly Geofolio, a name already used by an unrelated geospatial project). Everything that carried the old name changes with it: this is a new plugin slug for WordPress.org, and a breaking change for code written against 1.x. Nothing is migrated automatically: a site running 1.x keeps its data under the old keys until it imports them (the built-in import from a previous map plugin covers this, described by a companion through `mapped_places_legacy_import`).

### Changed
- **Renamed** from Geofolio to Mapped Places: slug and text domain `mapped-places`, main file `mapped-places.php`, PHP namespace `MappedPlaces`, constants `MAPPED_PLACES_*`, hooks and options `mapped_places_*`, post type `mapl_place`, taxonomies `mapl_*`, meta keys `_mapl_*`, CSS classes `.mapl-*` and custom properties `--mapl-*`, REST namespace `mapped-places/v1`, block `mapped-places/map`, shortcode `[mapped-places]`, JS globals `MappedPlaces` and `mappedPlacesConfig`, asset handles `mapped-places*`. GitHub repository `TheodoreRiant/mapped-places` (the old URL redirects).
- Admin notices are confined to the plugin's own screens (places, their taxonomies, settings, import): the basemap fallback warning and the import confirmation no longer appear elsewhere in the dashboard, and the permanent "Data up to date" notice is gone. The button that runs the data migrations again now sits in the "Current state" table of the Map settings.
- Translations: the plugin no longer calls `load_plugin_textdomain()` and no longer ships `.po`/`.mo` files in its archive; WordPress loads the language packs from translate.wordpress.org (or a `.mo` placed in `wp-content/languages/plugins/`). The French translation stays in the repository as its source.
- readme: a top-level "External services" section lists, for every basemap provider and for the geocoder, what is sent, when, and the links to their terms and privacy policies.

### Fixed
- Duplication link: the `post` and `_wpnonce` parameters are sanitised before the nonce check.

## [1.4.0] — 2026-09-25

### Added
- **Brand assets** (`brand/`, excluded from the archive): new icon (folded map and pin) as SVG, PNG from 16 to 1024 px, maskable variant, favicon; social preview `og-image.png` (1280×640, retina variant) and its HTML source; wordpress.org icon and banners regenerated from the same identity.
- Admin menu icon: Mapped Places' own pictogram instead of the generic Dashicons pin (`PlacePostType::MENU_ICON`).
- **Import from a previous map plugin** (`MappedPlaces\Migration\Legacy`): a migration step described by the `mapped_places_legacy_import` filter (old post type, taxonomies, meta, term meta, options, Elementor widget names, shortcodes, type icon catalogue, manager role, slug, labels, appearance, old plugin file). It renames the data in place (IDs and links kept), assigns icons to types without one (exact then partial name match, unmatched types reported), converts the old manager field into people for the imported places only, renames Elementor widgets through the decoded structure (revisions included, written with `update_metadata()` so a revision never overwrites its page) and shortcodes, fills the Labels and Appearance settings only where they are empty, then regenerates the URLs and deactivates the old plugin. The core describes no plugin: a companion provides its predecessor's names. Documented in `docs/hooks.md`.
- Migration steps can require a confirmation (`MappedPlaces\Migration\ConfirmedStep`): while one is pending, nothing runs automatically. The import shows what it will do, lets the administrator edit the role of the converted people, and runs on confirmation, after the usual snapshot.
- **Settings tabs "Appearance" and "Labels and defaults"** (Places → Map settings), each saved in its own option:
  - Appearance: main and accent colours (darker and lighter shades derived with `color-mix`), font (bundled Poppins by default, or the theme's font), corner radius. They become `--mapl-*` variables on `.mapl-map-container`, added after the map stylesheet; an Elementor widget's own style settings still win on its page. The main colour is also the fallback marker colour.
  - Labels and defaults: singular and plural names of places and entities in the admin, URL slug of places (rewrite rules regenerated when it changes), default sidebar title and subtitle, centre, zoom and "fit the view" for maps that do not set them.
  - Priority: filter > setting > plugin default, so `mapped_places_defaults`, `mapped_places_default_color`, `mapped_places_place_labels` and `mapped_places_place_slug` keep working.
- The REST cache is refreshed when these settings change (fallback colour, place URLs).
- Import from a previous map plugin: `delete_post_meta` key, old meta keys with no Mapped Places field, deleted from the imported places only and counted in the report (they were left orphaned).

### Fixed
- REST `/places`: a request with `lat` or `lng` ended in a fatal error on PHP 8 (`floatval()` does not accept the three arguments WordPress passes to a `sanitize_callback`). The `number` type of the schema now validates and converts them. `tests/RestArgsTest.php` rejects any single-parameter internal PHP function used as a sanitize callback.
- Import from a previous map plugin: type names now match the icon catalogue regardless of accents, case, extra spaces and typographic apostrophes ("Centre Éducatif Fermé" = "centre educatif ferme"); found on real data, where 6 of 27 icons were missed.

## [1.3.0] — 2026-09-24

### Added
- WordPress.org deployment workflows (`wporg-deploy.yml` on version tags, `wporg-assets.yml` for the readme and directory assets), inactive until the `WPORG_DEPLOY` repository variable is `true`.
- **Place edit screen as a form**: the article editor is gone (`supports` reduced to title and image, `mapped_places_place_supports` filter to bring it back). Under the title, five sections in the order a place is described: Location (fields next to the map), Description (short plain text saved in `post_content`), Contact, People, Photo gallery. Existing HTML content is shown as plain text.
- **People**: several people per place, each with a role and a name, reorderable (`MappedPlaces\Domain\People`, `_mapl_people` meta, `people` in the REST API). The legacy `manager` field is kept in sync (names only) and read as a fallback with the default role. Filters `mapped_places_default_person_role` and `mapped_places_people_roles`. The popup shows one “Role: Name” line per person.
- `tests/HooksDocTest.php`: every `mapped_places_*` hook in the code must be documented in `docs/hooks.md`, and the documentation must not cite a removed hook.
- Plugin directory page: readme with the block, "Who is it for", "Accessibility", "Developers" and a ten-question FAQ; icon (SVG and PNG), banner and eight screenshots on the fictional sample dataset (`.wordpress-org/`).
- **Gutenberg block "Mapped Places Map"** (`mapped-places/map`): server-side rendered through the same renderer as the shortcode and the Elementor widget, with an inspector for height, basemap, "fit the view to the places" (or centre and zoom), search, type filter, list, fullscreen button, sidebar position, title and subtitle. The editor shows the real map: the map assets are loaded in the editor iframe and the preview is initialised after each server render (`window.MappedPlaces.init()`). Wide and full alignments. Requires WordPress 6.6 (`react-jsx-runtime`); on 6.5 the block is simply not offered.
- WordPress Playground blueprint (`.wordpress-org/blueprints/blueprint.json`) for the "Live Preview" button of the plugin directory: installs Mapped Places, imports the sample dataset with its photos and opens a page with the block.
- French translation of the block (block.json strings and editor script, JSON translation file).

### Fixed
- The place location map in the admin drew only a corner of its tiles when its container was resized after loading (collapsed panel, screen layout change).
- Search suggestions: the highlight split the matched word ("Libr ary").
- Settings page: texts mention the block, and the `wp-config.php` example uses an English placeholder.

## [1.2.1] — 2026-09-24

### Fixed
- **Fatal error on every single post or page of a site without Elementor** (since 1.0.0): reading the Elementor widget name loaded the widget class, which extends an Elementor class. The name now lives in `Integration::WIDGET_NAME`, which loads without Elementor. A test forbids reading a constant of an Elementor-dependent class outside the widget.

### Changed
- `MapWidget.php` (1283 lines) is split into section traits: `ContentControls`, `LayoutStyleControls`, `CardStyleControls`, `MapStyleControls` and `HeaderStyleControls`; the widget class keeps its metadata and rendering (220 lines). The control stack seen by Elementor is byte-for-byte identical.
- Markers are built once per place and shown again when filters change, instead of rebuilding every marker, icon, popup and listener on each filter or keystroke (20 filter changes on the sample dataset: 214 markers rebuilt before, none now). The cache is reset when the place list is reloaded.
- The place list is inserted in one operation instead of one card at a time.
- The entity/type colour rule lives in one function (`resolveEntityColor`) instead of four copies.
- The map script is split into ES modules (`assets/js/src/`: escaping, text, i18n, colours, types, filters, carousel, basemaps, icons, and the `MappedPlacesMap` class with its autocomplete, carousel and marker methods in separate files) bundled by esbuild into `assets/js/mapped-places.js`, still an unminified IIFE. Node tests import the modules instead of cutting the source file at comment markers. Behaviour unchanged (computed styles and an interaction scenario compared before/after).
- The stylesheet is split into 20 partials (`assets/css/src/`, numbered in cascade order) assembled into `assets/css/mapped-places.css` by `npm run build:css`; the served file stays readable and needs no build to run. The computed styles of every map element are unchanged (checked at seven widths, map at rest and popup open).
- The three `@media (max-width: 640px)` blocks are merged into one; duplicate selectors and declarations removed.
- `!important` removed from the Leaflet icon resets, which nothing overrides; the remaining ones (plugin buttons, fullscreen) are documented.

## [1.2.0] — 2026-09-24

### Added
- Elementor widget: "Fit the view to the places" switch (shortcode attribute `fit_bounds`). Off, the map keeps the configured centre and zoom instead of zooming to the places after every filter.
- Elementor widget: style sections for the sidebar title and subtitle (typography, colour) and for the entity pills (typography, border radius through `--mapl-pill-radius`, show or hide the help sentence).
- Elementor widget declares its stylesheets and scripts (`get_style_depends()` / `get_script_depends()`), so they load in the editor and in global templates.
- `height="container"`: no inline height, the map fills `.mapl-map-container`, whose height the site (or Elementor) sets.
- `uninstall.php`: removes options, transients and migration snapshots; places and taxonomies are deleted only when `MAPPED_PLACES_UNINSTALL_DATA` is true.
- readme: "External services", "Privacy" and "Source code and development" sections (map tile providers, geocoder, no CDN, no tracking).
- `tests/PluginCheckTest.php`: guards against unescaped output, direct file operations, form data read before nonce verification, undocumented external services.

### Changed
- Import results and the "copy created" notice are carried by a per-user transient instead of URL parameters.
- CSV files are read with `SplFileObject`; temporary files are removed with `wp_delete_file()`.
- Entity colour saved only with a nonce and the `manage_categories` capability.
- Admin notices are dismissible.

### Changed
- REST responses for the full place list and the filters are cached in transients (12 h at most). Any change to a place, its meta or terms, a place taxonomy term (colour and icon included) or the settings invalidates them at once through a generation counter. Text search and proximity requests, and single places, are never cached.
- Settings page HTML moved to `views/settings-page.php`; `SettingsPage::view_data()` prepares the values.
- Elementor widget: the map height is a responsive control on the container only. Tablet and mobile default to 600px and 85vh, as in the stylesheet; a desktop value no longer overrides them.

### Fixed
- **Settings and CSV import pages unreachable** on a Mapped Places-only site: they were attached to the `etablissement` post type of the original plugin, so WordPress answered 403 and neither page appeared in the Places menu. Both now hang under the Places menu (`Schema::ADMIN_PARENT`).
- The map now tells the visitor when the places cannot be loaded, instead of silently showing an empty list.
- `destroy()` was defined twice in the map class and the active one left the search autocomplete listeners on `document`; a single method now removes them all (Elementor editor re-renders no longer leak handlers).
- The results counter is announced to screen readers (`aria-live="polite"`).
- Toast messages are escaped before being inserted.
- Removed the `--pin-color` and `--popup-color` inline properties, which no stylesheet read.
- Plugin Check: 39 errors (unescaped `_e()`/`printf`, exception message, `fopen`/`unlink`) and 39 warnings resolved or justified; the archive now passes with 0 errors and 0 warnings.

## [1.1.0] — 2026-09-24

### Added
- Complete sample dataset (`data/sample/`): 16 fictional places with photos from Unsplash (credits in `data/sample/photos/CREDITS.md`), managers, phone numbers from the ranges reserved for fiction, emails, websites, opening hours, services, accessibility, entity colours and type icons.
- CSV import: `Type icon`, `Entity colour`, `Audience`, `Region`, `Accessibility`, `Image` and `Gallery` columns; several values separated by `;` for types, services and accessibility; photos of a trusted dataset added to the media library and reused across places.
- `mapped_places_import_content_labels` filter.

### Changed
- Keyless fallback basemap: Positron served by OpenFreeMap (worldwide) instead of the IGN map (France only).
- Imported content no longer contains hard-coded French labels.

## [1.0.0] — 2026-09-24

First release under the Mapped Places name, derived from a map plugin built for a single client (version 2.9.0). Everything specific to that client moved to a companion plugin; the history of the 2.x versions stays with it.

### Added
- *Places* post type (`mapl_place`) and taxonomies `mapl_type`, `mapl_region`, `mapl_service`, `mapl_accessibility`, `mapl_entity`; URL slugs and admin labels adjustable by filters.
- Field registry (`MappedPlaces\Domain\FieldRegistry`): the single source of place meta keys and their sanitisation, shared by meta boxes, REST and import.
- REST API `mapped-places/v1`: `places`, `places/{id}`, `filters`, with English keys and a type catalogue (label, icon, SVG path).
- Type icons: a library of 22 generic icons, an icon picker on types, filters for icons, labels and order.
- Generic CSV import: English and French column names, coordinates and contact details read from the file, entity column, filterable geocoder, sample dataset of 12 fictional places.
- Extension filters for defaults, colours, import rules, slugs, labels, migrations, shortcode and widget aliases (see `docs/hooks.md`).
- Generic migration runner with snapshots and a log; steps are provided by filter.
- English source strings and a complete French translation.

### Changed
- PSR-4 code base (`src/`, namespace `MappedPlaces\`), one class per file, no Composer dependency.
- Shortcode `[mapped-places]`, Elementor widget `mapped_places_map`, CSS classes `.mapl-*`, custom properties `--mapl-*`, script object `mappedPlacesConfig`.
- Neutral palette and default values; a site restyles the map by overriding `--mapl-*` properties.
- Shared renderer for the shortcode and the widget (a `]` in a title no longer breaks the widget).

### Removed
- Dead Elementor controls (popup link, scrollbar, marker size, map width) and about 900 lines of unused CSS.
- Shortcode attributes `types` and `regions`, never read.
