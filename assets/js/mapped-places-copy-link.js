/**
 * Mapped Places — copie du lien partageable d'un établissement.
 *
 * Délégation d'événement : un seul script gère à la fois le bouton
 * « Copier le lien » de l'écran d'édition (.mapl-copy-share-link) et
 * l'action rapide du même nom dans la liste des établissements
 * (.mapl-copy-link-action, ajoutée par src/Admin/CopyLink.php).
 *
 * navigator.clipboard exige un contexte sécurisé (HTTPS) : document.execCommand
 * prend le relais sur un site encore en http.
 */
(function () {
    'use strict';

    var COPIED_CLASS = 'is-copied';
    var RESET_DELAY  = 1500;

    /**
     * Copier un texte dans le presse-papiers.
     *
     * @param {string} text
     * @returns {Promise<void>}
     */
    function copyText(text) {
        if (navigator.clipboard && window.isSecureContext) {
            return navigator.clipboard.writeText(text);
        }

        return new Promise(function (resolve, reject) {
            var textarea = document.createElement('textarea');
            textarea.value = text;
            textarea.setAttribute('readonly', 'readonly');
            textarea.style.position = 'fixed';
            textarea.style.left = '-9999px';
            document.body.appendChild(textarea);
            textarea.select();

            var ok = false;
            try {
                ok = document.execCommand('copy');
            } catch (error) { // eslint-disable-line no-unused-vars
                ok = false;
            }
            document.body.removeChild(textarea);

            if (ok) {
                resolve();
            } else {
                reject(new Error('execCommand copy failed'));
            }
        });
    }

    /**
     * Retour visuel temporaire sur l'élément cliqué : son texte change,
     * puis revient à l'original après RESET_DELAY.
     *
     * @param {Element} el
     * @param {boolean} success
     */
    function showFeedback(el, success) {
        var i18n     = (window.mappedPlacesCopyLink && window.mappedPlacesCopyLink.i18n) || {};
        var original = el.textContent;
        var message  = success ? i18n.copied : i18n.copyFailed;

        if (message) {
            el.textContent = message;
        }
        el.classList.toggle(COPIED_CLASS, success);

        setTimeout(function () {
            el.textContent = original;
            el.classList.remove(COPIED_CLASS);
        }, RESET_DELAY);
    }

    document.addEventListener('click', function (event) {
        var target = event.target.closest
            ? event.target.closest('.mapl-copy-share-link, .mapl-copy-link-action')
            : null;
        if (!target) return;

        event.preventDefault();

        var url = target.getAttribute('data-url');
        if (!url) return;

        copyText(url).then(
            function () { showFeedback(target, true); },
            function () { showFeedback(target, false); }
        );
    });
})();
