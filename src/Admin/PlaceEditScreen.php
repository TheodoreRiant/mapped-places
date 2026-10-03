<?php
/**
 * Écran d'édition d'un lieu : un formulaire en sections, pas un éditeur
 * d'article.
 *
 * Le type de contenu n'a plus le support « editor » : la description est un
 * champ court du formulaire, et les sections (localisation avec la carte,
 * description, contact, direction, photos) s'affichent sous le titre, dans
 * l'ordre où l'on renseigne un lieu. Les meta boxes historiques sont
 * retirées de la colonne principale, leurs rendus sont réutilisés.
 */

namespace MappedPlaces\Admin;

use MappedPlaces\Domain\Schema;

if (!defined('ABSPATH')) {
    exit;
}

class PlaceEditScreen {

    /** Nombre de lignes du champ description. */
    const DESCRIPTION_ROWS = 4;

    private static $instance = null;

    public static function get_instance() {
        if (null === self::$instance) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action('edit_form_after_title', array($this, 'render'));
        add_action('add_meta_boxes', array($this, 'remove_default_boxes'), 20);
        add_filter('admin_body_class', array($this, 'body_class'));
    }

    /**
     * Sections du formulaire, dans l'ordre d'affichage.
     *
     * @return array<int, array{id: string, label: string, icon: string, render: callable}>
     */
    public static function sections() {
        $boxes = MetaBoxes::get_instance();
        return array(
            array(
                'id'     => 'location',
                'label'  => __('Location', 'mapped-places'),
                'icon'   => 'location',
                'render' => array($boxes, 'render_localisation_box'),
            ),
            array(
                'id'     => 'description',
                'label'  => __('Description', 'mapped-places'),
                'icon'   => 'text',
                'render' => array(__CLASS__, 'render_description'),
            ),
            array(
                'id'     => 'contact',
                'label'  => __('Contact', 'mapped-places'),
                'icon'   => 'phone',
                'render' => array($boxes, 'render_contact_box'),
            ),
            array(
                'id'     => 'management',
                'label'  => __('People', 'mapped-places'),
                'icon'   => 'groups',
                'render' => array($boxes, 'render_direction_box'),
            ),
            array(
                'id'     => 'gallery',
                'label'  => __('Photo gallery', 'mapped-places'),
                'icon'   => 'format-gallery',
                'render' => array($boxes, 'render_gallery_box'),
            ),
            array(
                'id'     => 'share',
                'label'  => __('Shareable link', 'mapped-places'),
                'icon'   => 'admin-links',
                'render' => array(__CLASS__, 'render_share_link'),
            ),
        );
    }

    /**
     * Les meta boxes de la colonne principale sont rendues par le
     * formulaire : on les retire pour ne pas les afficher deux fois.
     */
    public function remove_default_boxes() {
        foreach (MetaBoxes::BOX_IDS as $box_id) {
            remove_meta_box($box_id, Schema::POST_TYPE, 'normal');
        }
        remove_meta_box('postexcerpt', Schema::POST_TYPE, 'normal');
    }

    /**
     * Classe sur <body> pour cibler l'écran d'un lieu en CSS.
     *
     * @param string $classes
     * @return string
     */
    public function body_class($classes) {
        $screen = function_exists('get_current_screen') ? get_current_screen() : null;
        if ($screen && $screen->base === 'post' && $screen->post_type === Schema::POST_TYPE) {
            $classes .= ' mapl-place-screen';
        }
        return $classes;
    }

    /**
     * Rendu du formulaire sous le titre, à l'intérieur du <form id="post">.
     *
     * @param \WP_Post $post
     */
    public function render($post) {
        if (!$post || $post->post_type !== Schema::POST_TYPE) {
            return;
        }
        echo '<div class="mapl-place-form">';
        foreach (self::sections() as $section) {
            printf(
                '<section class="mapl-section mapl-section--%1$s" id="mapl-section-%1$s"><h2><span class="dashicons dashicons-%2$s" aria-hidden="true"></span>%3$s</h2>',
                esc_attr($section['id']),
                esc_attr($section['icon']),
                esc_html($section['label'])
            );
            call_user_func($section['render'], $post);
            echo '</section>';
        }
        echo '</div>';
    }

    /**
     * Champ « Description » : le contenu du lieu, en texte court. Le champ
     * s'appelle `content` pour que WordPress l'enregistre dans post_content
     * comme le ferait l'éditeur.
     *
     * @param \WP_Post $post
     */
    public static function render_description($post) {
        // phpcs:ignore WordPress.Security.EscapeOutput.OutputNotEscaped -- HTML construit par description_field(), qui échappe chaque valeur (esc_attr__, esc_textarea, esc_html__).
        echo self::description_field((string) $post->post_content);
    }

    /**
     * Le contenu peut venir d'un ancien éditeur ou d'un import : on le ramène
     * en texte brut, les paragraphes et sauts de ligne devenant des retours
     * à la ligne. À l'affichage public, wpautop recrée les paragraphes.
     *
     * @param string $content
     * @return string
     */
    public static function to_plain_text($content) {
        $text = preg_replace('#<br\s*/?>#i', "\n", (string) $content);
        $text = preg_replace('#</p>\s*<p[^>]*>#i', "\n\n", $text);
        $text = wp_strip_all_tags($text);
        $text = html_entity_decode($text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
        return trim(preg_replace("/\n{3,}/", "\n\n", $text));
    }

    /**
     * HTML du champ description.
     *
     * @param string $content Contenu actuel, non échappé.
     * @return string
     */
    public static function description_field($content) {
        $content = self::to_plain_text($content);
        return '<div class="mapl-meta-box">'
            . '<textarea name="content" id="mapped_places_description" class="widefat" rows="' . (int) self::DESCRIPTION_ROWS . '" '
            . 'placeholder="' . esc_attr__('A few lines shown in the popup: mission, audience, what makes this place special.', 'mapped-places') . '">'
            . esc_textarea($content)
            . '</textarea>'
            . '<p class="description">' . esc_html__('Plain text. Keep it short: it appears in the map popup and in the list.', 'mapped-places') . '</p>'
            . '</div>';
    }

    /**
     * Section « Lien partageable » : l'URL qui ouvre la carte avec ce lieu
     * déjà sélectionné (?place=<slug>), lecture seule + bouton copier
     * (src/Admin/CopyLink.php et le script mapped-places-copy-link.js
     * fournissent la même action dans la liste des lieux).
     *
     * Sans page de carte configurée ni détectée, aucun lien n'est affiché :
     * un message explicite renvoie vers la page de réglages plutôt que de
     * montrer un lien cassé.
     *
     * @param \WP_Post $post
     */
    public static function render_share_link($post) {
        $url = SettingsPage::get_place_link($post);

        if ($url === '') {
            printf(
                '<div class="mapl-meta-box"><p>%s <a href="%s">%s</a></p></div>',
                esc_html__('No map page is configured yet.', 'mapped-places'),
                esc_url(admin_url(Schema::ADMIN_PARENT . '&page=' . SettingsPage::PAGE_SLUG)),
                esc_html__('Open the map settings', 'mapped-places')
            );
            return;
        }

        $is_draft = $post->post_status !== 'publish';
        ?>
        <div class="mapl-meta-box mapl-share-link<?php echo $is_draft ? ' mapl-share-link--draft' : ''; ?>">
            <p>
                <input type="text"
                       class="widefat"
                       readonly="readonly"
                       onclick="this.select();"
                       aria-label="<?php esc_attr_e('Shareable link', 'mapped-places'); ?>"
                       value="<?php echo esc_url($url); ?>" />
            </p>
            <p>
                <button type="button" class="button mapl-copy-share-link" data-url="<?php echo esc_attr($url); ?>">
                    <?php esc_html_e('Copy link', 'mapped-places'); ?>
                </button>
                <?php if ($is_draft) : ?>
                    <span class="description"><?php esc_html_e('This link will work once the place is published.', 'mapped-places'); ?></span>
                <?php endif; ?>
            </p>
        </div>
        <?php
    }
}
