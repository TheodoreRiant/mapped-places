# REST API

Namespace `mapped-places/v1`. All routes are public and read-only; they only return published places (and, for the detail route, places the current user may read).

## `GET /wp-json/mapped-places/v1/places`

| Parameter | Type | Role |
|---|---|---|
| `type`, `region`, `service`, `accessibility` | string | Comma-separated term slugs |
| `search` | string | Text search on city, postal code and address |
| `lat`, `lng` | number | Position for a proximity search |
| `radius` | integer | Radius in km (default 50), with `lat` and `lng` |

Response:

```json
{
  "count": 12,
  "places": [
    {
      "id": 42, "slug": "…", "title": "…", "excerpt": "…", "description": "…", "url": "…", "thumbnail": "…",
      "lat": 45.76, "lng": 4.83, "address": "…", "postal_code": "…", "city": "…",
      "phone": "…", "email": "…", "manager": "…", "website": "…", "opening_hours": "…",
      "people": [{ "role": "Director", "name": "Marie Beton" }],
      "gallery_count": 2, "types": ["…"], "services": ["…"], "accessibility": ["…"], "regions": ["…"],
      "entity": { "id": 4, "name": "…", "slug": "…", "color": "#1F4E79" },
      "distance": null
    }
  ],
  "types": [ { "slug": "…", "name": "…", "label": "…", "icon": "home", "path": "<path …/>" } ]
}
```

Places without coordinates are left out. With `lat` and `lng`, places are sorted by `distance` (km).

`slug` is the place's URL slug (`post_name`), used by the map to resolve the `?place=` deep link parameter against the already-loaded list (see `assets/js/src/deep-link.mjs`); it can be empty for a place that has never been saved yet.

## `GET /wp-json/mapped-places/v1/places/{id}`

The full place: same fields as above (terms as objects), plus `content` (rendered HTML) and `gallery` (featured image first, then gallery photos, each with `medium` and `large` sizes, `srcset` and `sizes`). 404 if the place is not visible.

## `GET /wp-json/mapped-places/v1/filters`

`types` (with `label`, `icon`, `path`), `regions`, `services`, `accessibility` (non-empty terms), `entities` (all, with `color` and `count`) and `default_color`.

`people` lists the place's people in display order, each with a `role` and a `name`. `manager` keeps the names only, separated by commas, for consumers written before `people` existed.
