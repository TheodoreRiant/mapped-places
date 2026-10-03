# Admin guide

Everything happens in the **Places** menu of the WordPress admin.

## Add a place

The place screen is a form, not an article editor: the sections follow the order in which a place is described.

1. **Places → Add**, then the **name** of the place.
2. **Location**: address, postal code, city, then **Geocode address** to place the marker, or click the map next to the fields to move it. Latitude and longitude can also be typed.
3. **Description**: a few lines of plain text, shown in the popup and the list. Paragraphs are kept.
4. **Contact**: phone, email, website, opening hours. An empty field is not shown on the map.
5. **People**: one row per person with a **role** and a **name** (“Director: Marie Beton”, “Secretary general: Antonin Klark”). **Add a person** adds a row, the cross removes one, the handle reorders by drag and drop. The role field suggests common roles but accepts any text. The popup shows one line per person, in this order.
6. **Photo gallery**: see below.
7. Side panel: **Entity** (gives the colour), **Place type**, regions, services, accessibility, and the **Place image** (cover).
8. **Publish**. A draft does not appear on the map.

Places created with an earlier version keep their manager names: they appear in the People section with the default role until edited. A site that needs the full content editor can add `editor` with the `mapped_places_place_supports` filter.

## Duplicate a place

For a service available at several addresses: hover the row in the list and click **Duplicate**, or use **Duplicate this place** on the edit screen. The copy opens as a **draft**, with “(copy)” in its title and everything else copied. Change the title and address, geocode, then publish.

## Photos

- **Featured image**: the cover, shown first.
- **Photo gallery** box: add or edit photos, drag and drop to reorder. Photos follow the cover; a photo in both places is shown once.
- Without any photo, the popup shows a “Photo coming soon” image.

## Entities, types and icons

- **Places → Entities**: each entity has a **colour**, used for markers, pills and popups. Changing it here is enough: no update overwrites it.
- **Places → Place types**: each type can have an **icon**, chosen from the library. Without a choice, a companion plugin may suggest one; otherwise, a pin.

On the map, clicking an entity pill **shows only that entity**; further clicks add or remove entities; “Show all” resets.

## Map settings

**Places → Map settings**:

- **Provider API key**, for basemaps marked “key required”. It can also be set with `define('MAPPED_PLACES_TILE_API_KEY', '…')` in `wp-config.php`.
- **Basemap applied to the site**: forces the same basemap on every map, without reopening each Elementor page.
- **Place links → Page that shows the map**: the page used to build each place's shareable link (see below). Pre-filled automatically from the first published page found with the `[mapped-places]` shortcode or the Mapped Places Map block; choose another page if needed.

Without a valid key, the map falls back to Positron served by OpenFreeMap (no key); it never shows an error instead of the tiles.

## Shareable place links

Each place has a link that opens the map with it already selected: pin centred, popup open, and highlighted in the sidebar list (`<map page>?place=<slug>`, or `?place=<id>` for a place that has no stable slug yet). It works the same way on the full-page map, the Elementor widget and the Gutenberg block.

- **On the place edit screen**: the **Shareable link** section (after Photo gallery) shows the full URL in a read-only field with a **Copy link** button. A draft shows its future link greyed out, with “This link will work once the place is published.”
- **From the places list**: hover a row and click **Copy link**, next to Duplicate. The button briefly turns into “Copied!”.
- Without a map page configured or detected (see Map settings above), no link is shown anywhere — never a broken link copied by mistake.
- A visitor opening a link to a place that has since been unpublished, deleted, or has no coordinates sees the map load normally, with a discreet message that the requested place could not be found.

## CSV import

**Places → Import CSV**. The first line names the columns, in English or French (accents and case ignored):

| Column | Content |
|---|---|
| Name | required |
| Type, Type icon | place type, and its icon key (`book`, `people`, `tool`…) if the type has none yet |
| Entity, Entity colour | entity, and its colour (`#1F7A6B`) if the entity has none yet |
| Description, Audience, Capacity | text of the place; audience is shown after “Audience:” |
| Address, Postal code, City, Region, Department | location; rows without latitude / longitude are geocoded |
| Latitude, Longitude | coordinates |
| Phone, Email, Website, Manager, Opening hours | contact; Manager holds names separated by commas, given the default role |
| Services, Accessibility | several values separated by `;` |
| Image, Gallery | photo file names, for datasets shipped with their photos |

**Import the preset places** imports the sample dataset: 16 fictional places with photos, contacts and opening hours (`data/sample/`).

## Add a map to a page

In Elementor, the **Mapped Places** widget (display and style settings in the panel), or the `[mapped-places]` shortcode (attributes in the [README](../README.md#shortcode)).
