<?php
/**
 * Action rapide « Copier le lien » dans la liste des établissements.
 *
 * Même emplacement que « Dupliquer » (voir Duplicate.php) : post_row_actions.
 * Le lien copié ouvre la carte avec ce lieu déjà sélectionné (?place=<slug>,
 * voir SettingsPage::get_place_link()). Sans page de carte configurée ni
 * détectée automatiquement, l'action n'apparaît pas : jamais de lien cassé
 * copié dans le presse-papiers.
 */

namespace MappedPlaces\Admin;

use MappedPlaces\Domain\Schema;

if (!defined('ABSPATH')) {
    exit;
}

class CopyLink {

    const POST_TYPE = Schema::POST_TYPE;

    private static $instance = null;

    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_filter('post_row_actions', array($this, 'add_row_action'), 10, 2);
    }

    /**
     * Ajouter « Copier le lien » aux actions au survol de la liste.
     *
     * La copie se fait en JS (presse-papiers) : le lien pointe sur « # »,
     * voir assets/js/mapped-places-copy-link.js.
     *
     * @param array    $actions
     * @param \WP_Post $post
     * @return array
     */
    public function add_row_action($actions, $post) {
        if (!$post || $post->post_type !== self::POST_TYPE) {
            return $actions;
        }

        $url = SettingsPage::get_place_link($post);
        if ($url === '') {
            return $actions;
        }

        return array_merge($actions, array(
            'mapped_places_copy_link' => sprintf(
                '<a href="#" class="mapl-copy-link-action" data-url="%s" aria-label="%s">%s</a>',
                esc_url($url),
                esc_attr(sprintf(/* translators: %s: place title */ __('Copy the link for “%s”', 'mapped-places'), $post->post_title)),
                esc_html__('Copy link', 'mapped-places')
            ),
        ));
    }
}
