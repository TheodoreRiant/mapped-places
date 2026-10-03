/* Lien profond vers une fiche (?place=<slug-ou-id>) : lecture et validation
   du paramètre d'URL, résolution dans le cache déjà chargé par map.mjs
   (architecture cache-first : aucune requête REST supplémentaire), et
   construction de l'URL à afficher une fois la fiche sélectionnée.

   location.search est une entrée non fiable : parsePlaceParam() ne renvoie
   jamais rien qui ne ressemble pas à un slug WordPress ou à un identifiant. */

/** Longueur maximale d'un slug WordPress (colonne post_name, varchar(200)). */
var MAX_LENGTH = 200;

/** Forme d'un slug WordPress : alphanumérique et tirets, un identifiant numérique passe aussi. */
var SLUG_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/i;

/**
 * Le paramètre a-t-il la forme d'un slug WordPress (ou d'un identifiant) ?
 *
 * @param {*} value
 * @returns {boolean}
 */
function isValidPlaceParam(value) {
    if (typeof value !== 'string') return false;
    var trimmed = value.trim();
    if (!trimmed || trimmed.length > MAX_LENGTH) return false;
    return SLUG_PATTERN.test(trimmed);
}

/**
 * Lire et valider le paramètre `place` d'une chaîne de requête
 * (location.search). Un paramètre absent ou malformé renvoie null : il se
 * comporte comme "fiche non trouvée", jamais comme une erreur.
 *
 * @param {string} search Chaîne de requête, avec ou sans le « ? » initial.
 * @returns {string|null}
 */
function parsePlaceParam(search) {
    var params;
    try {
        params = new URLSearchParams(search || '');
    } catch (e) { // eslint-disable-line no-unused-vars
        return null;
    }
    var value = params.get('place');
    if (!value) return null;
    var trimmed = value.trim();
    return isValidPlaceParam(trimmed) ? trimmed : null;
}

/** Une fiche a-t-elle des coordonnées exploitables ? */
function hasCoords(place) {
    return !!place && !!place.lat && !!place.lng;
}

/**
 * Résoudre un paramètre `place` validé dans le cache déjà chargé : par
 * slug d'abord (insensible à la casse), puis par identifiant numérique.
 * Une fiche absente, dépubliée ou sans coordonnées n'apparaît jamais dans
 * ce cache (route REST /places) : la chercher ici suffit à vérifier sa
 * disponibilité, sans requête supplémentaire.
 *
 * @param {Array}  places Fiches déjà chargées (mappedPlacesConfig cache-first).
 * @param {string} param  Valeur déjà validée par parsePlaceParam().
 * @returns {Object|null}
 */
function findPlaceByParam(places, param) {
    if (!param || !Array.isArray(places)) return null;

    var lower = param.toLowerCase();
    var bySlug = places.filter(function (place) {
        return hasCoords(place) && typeof place.slug === 'string' && place.slug !== '' && place.slug.toLowerCase() === lower;
    })[0];
    if (bySlug) return bySlug;

    if (/^\d+$/.test(param)) {
        var id = parseInt(param, 10);
        return places.filter(function (place) {
            return hasCoords(place) && place.id === id;
        })[0] || null;
    }

    return null;
}

/**
 * Retrouver une fiche par identifiant, sans condition sur ses coordonnées
 * (utilisé pour resynchroniser l'URL après une sélection depuis la carte
 * ou la liste, où la fiche est déjà connue pour avoir un marqueur).
 *
 * @param {Array}  places
 * @param {number} id
 * @returns {Object|null}
 */
function findPlaceById(places, id) {
    if (!Array.isArray(places)) return null;
    return places.filter(function (place) { return place && place.id === id; })[0] || null;
}

/**
 * Valeur à mettre dans le paramètre `place` pour une fiche : son slug,
 * ou son identifiant tant qu'elle n'a pas de slug stable (brouillon).
 *
 * @param {Object|null} place
 * @returns {string}
 */
function placeLinkValue(place) {
    if (!place) return '';
    return (place.slug && String(place.slug).trim() !== '') ? String(place.slug) : String(place.id);
}

/**
 * Remplacer (ou retirer) le paramètre `place` d'une URL, en conservant les
 * autres paramètres et le fragment.
 *
 * @param {string} href  URL complète (location.href).
 * @param {string} value Nouvelle valeur ; '' retire le paramètre.
 * @returns {string} URL inchangée si elle ne peut pas être analysée.
 */
function withPlaceParam(href, value) {
    var url;
    try {
        url = new URL(href);
    } catch (e) { // eslint-disable-line no-unused-vars
        return href;
    }
    if (value) {
        url.searchParams.set('place', value);
    } else {
        url.searchParams.delete('place');
    }
    return url.toString();
}

export { isValidPlaceParam, parsePlaceParam, findPlaceByParam, findPlaceById, placeLinkValue, withPlaceParam };
