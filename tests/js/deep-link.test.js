/**
 * Lien profond vers une fiche (?place=<slug-ou-id>) : validation du
 * paramètre d'URL (ALL-326), résolution dans le cache déjà chargé, et
 * construction de l'URL affichée une fois la fiche sélectionnée.
 *
 * Lancer :  node --test tests/js/*.test.js
 */

const test   = require('node:test');
const assert = require('node:assert');
const { load } = require('./modules.js');

const {
    isValidPlaceParam,
    parsePlaceParam,
    findPlaceByParam,
    findPlaceById,
    placeLinkValue,
    withPlaceParam,
} = load('deep-link');

const WITH_SLUG    = { id: 12, slug: 'maison-des-familles', lat: 45.75, lng: 4.85 };
const WITH_SLUG_2  = { id: 13, slug: 'epicerie-solidaire', lat: 45.76, lng: 4.86 };
const NO_COORDS    = { id: 14, slug: 'en-projet', lat: 0, lng: 0 };
const EMPTY_SLUG   = { id: 15, slug: '', lat: 45.1, lng: 4.1 };

/* ------------------------------------------------------------------ */
/*  isValidPlaceParam / parsePlaceParam                                */
/* ------------------------------------------------------------------ */

test('un slug alphanumérique avec tirets est valide', () => {
    assert.strictEqual(isValidPlaceParam('maison-des-familles'), true);
    assert.strictEqual(isValidPlaceParam('12'), true);
    assert.strictEqual(isValidPlaceParam('Lieu-42'), true);
});

test('une valeur vide, trop longue ou au mauvais format est invalide', () => {
    assert.strictEqual(isValidPlaceParam(''), false);
    assert.strictEqual(isValidPlaceParam('   '), false);
    assert.strictEqual(isValidPlaceParam('a'.repeat(201)), false);
    assert.strictEqual(isValidPlaceParam('../etc/passwd'), false);
    assert.strictEqual(isValidPlaceParam('<script>alert(1)</script>'), false);
    assert.strictEqual(isValidPlaceParam('un slug avec espaces'), false);
    assert.strictEqual(isValidPlaceParam(null), false);
    assert.strictEqual(isValidPlaceParam(undefined), false);
    assert.strictEqual(isValidPlaceParam(42), false);
});

test('parsePlaceParam lit le paramètre place de la chaîne de requête', () => {
    assert.strictEqual(parsePlaceParam('?place=maison-des-familles'), 'maison-des-familles');
    assert.strictEqual(parsePlaceParam('place=12'), '12');
    assert.strictEqual(parsePlaceParam('?other=1&place=epicerie-solidaire'), 'epicerie-solidaire');
});

test('parsePlaceParam renvoie null sans paramètre ou avec une valeur malformée', () => {
    assert.strictEqual(parsePlaceParam(''), null);
    assert.strictEqual(parsePlaceParam('?other=1'), null);
    assert.strictEqual(parsePlaceParam('?place='), null);
    assert.strictEqual(parsePlaceParam('?place=' + encodeURIComponent('<script>')), null);
    assert.strictEqual(parsePlaceParam(null), null);
});

/* ------------------------------------------------------------------ */
/*  findPlaceByParam / findPlaceById                                   */
/* ------------------------------------------------------------------ */

const PLACES = [WITH_SLUG, WITH_SLUG_2, NO_COORDS, EMPTY_SLUG];

test('une fiche est trouvée par son slug, insensible à la casse', () => {
    assert.strictEqual(findPlaceByParam(PLACES, 'maison-des-familles'), WITH_SLUG);
    assert.strictEqual(findPlaceByParam(PLACES, 'MAISON-DES-FAMILLES'), WITH_SLUG);
});

test('à défaut de slug correspondant, on retombe sur l\'identifiant numérique', () => {
    assert.strictEqual(findPlaceByParam(PLACES, '13'), WITH_SLUG_2);
});

test('une fiche sans coordonnées n\'est jamais retournée', () => {
    assert.strictEqual(findPlaceByParam(PLACES, 'en-projet'), null);
    assert.strictEqual(findPlaceByParam(PLACES, '14'), null);
});

test('une fiche au slug vide n\'est trouvée que par son identifiant', () => {
    assert.strictEqual(findPlaceByParam(PLACES, ''), null);
    assert.strictEqual(findPlaceByParam(PLACES, '15'), EMPTY_SLUG);
});

test('un paramètre sans correspondance renvoie null, pas d\'erreur', () => {
    assert.strictEqual(findPlaceByParam(PLACES, 'inconnu'), null);
    assert.strictEqual(findPlaceByParam(PLACES, '999'), null);
    assert.strictEqual(findPlaceByParam([], 'maison-des-familles'), null);
    assert.strictEqual(findPlaceByParam(null, 'maison-des-familles'), null);
});

test('findPlaceById ignore les coordonnées : utile juste après une sélection', () => {
    assert.strictEqual(findPlaceById(PLACES, 14), NO_COORDS);
    assert.strictEqual(findPlaceById(PLACES, 999), null);
});

/* ------------------------------------------------------------------ */
/*  placeLinkValue / withPlaceParam                                    */
/* ------------------------------------------------------------------ */

test('placeLinkValue préfère le slug, et retombe sur l\'identifiant', () => {
    assert.strictEqual(placeLinkValue(WITH_SLUG), 'maison-des-familles');
    assert.strictEqual(placeLinkValue(EMPTY_SLUG), '15');
    assert.strictEqual(placeLinkValue(null), '');
});

test('withPlaceParam ajoute ou remplace le paramètre place, sans toucher aux autres', () => {
    assert.strictEqual(
        withPlaceParam('https://exemple.fr/carte/?zoom=5', 'maison-des-familles'),
        'https://exemple.fr/carte/?zoom=5&place=maison-des-familles'
    );
    assert.strictEqual(
        withPlaceParam('https://exemple.fr/carte/?place=ancien-lieu&zoom=5', 'nouveau-lieu'),
        'https://exemple.fr/carte/?place=nouveau-lieu&zoom=5'
    );
});

test('withPlaceParam retire le paramètre pour une valeur vide', () => {
    assert.strictEqual(
        withPlaceParam('https://exemple.fr/carte/?place=maison-des-familles', ''),
        'https://exemple.fr/carte/'
    );
});

test('withPlaceParam renvoie l\'URL telle quelle si elle est illisible', () => {
    assert.strictEqual(withPlaceParam('pas-une-url', 'x'), 'pas-une-url');
});
