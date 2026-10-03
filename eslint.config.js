/**
 * ESLint : règles recommandées, adaptées au code de la carte (scripts
 * WordPress classiques, pas de modules) et aux tests Node.
 */
const js      = require('@eslint/js');
const globals = require('globals');

module.exports = [
    js.configs.recommended,
    {
        files: ['assets/js/**/*.js'],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: 'script',
            globals: {
                ...globals.browser,
                jQuery: 'readonly',
                L: 'readonly',
                maplibregl: 'readonly',
                wp: 'readonly',
                elementorFrontend: 'readonly',
                mappedPlacesConfig: 'readonly',
                mappedPlacesAdmin: 'readonly',
                mappedPlacesGallery: 'readonly',
                mappedPlacesDuplicate: 'readonly',
                mappedPlacesCopyLink: 'readonly',
            },
        },
    },
    {
        // Modules sources de la carte (assemblés par tools/build-js.js).
        files: ['assets/js/src/**/*.mjs'],
        languageOptions: {
            ecmaVersion: 2020,
            sourceType: 'module',
            globals: { ...globals.browser, L: 'readonly', elementorFrontend: 'readonly', mappedPlacesConfig: 'readonly' },
        },
    },
    {
        // Fichier assemblé : on analyse ses sources.
        ignores: ['assets/js/mapped-places.js'],
    },
    {
        files: ['tests/js/**/*.js', 'tests/js/**/*.mjs', 'tools/**/*.js', 'eslint.config.js'],
        languageOptions: { ecmaVersion: 2022, sourceType: 'commonjs', globals: globals.node },
    },
];
