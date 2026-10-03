<?php
/**
 * Substituts WordPress en mémoire pour les tests de duplication :
 * articles, metas, termes, droits et nonces.
 *
 * Chaque test repart d'un état vide via mapl_test_reset_posts().
 */

class WP_Post {
    public $ID;
    public $post_type    = 'post';
    public $post_status  = 'publish';
    public $post_title   = '';
    public $post_name    = '';
    public $post_content = '';
    public $post_excerpt = '';
    public $post_author  = 0;
    public $menu_order   = 0;
    public $comment_status = 'closed';
    public $ping_status    = 'closed';

    public function __construct(array $fields) {
        foreach ($fields as $key => $value) {
            $this->$key = $value;
        }
    }
}

class WP_Error {
    private $code;
    private $message;
    private $data;

    public function __construct($code = '', $message = '', $data = '') {
        $this->code    = $code;
        $this->message = $message;
        $this->data    = $data;
    }

    public function get_error_code() {
        return $this->code;
    }

    public function get_error_message() {
        return $this->message;
    }

    public function get_error_data() {
        return $this->data;
    }
}

/**
 * Remettre à zéro le stockage simulé.
 *
 * @param string[] $caps Droits de l'utilisateur courant.
 */
function mapl_test_reset_posts(array $caps = array('edit_post', 'edit_posts')) {
    $GLOBALS['mapl_test_posts']   = array();
    $GLOBALS['mapl_test_meta']    = array();
    $GLOBALS['mapl_test_terms']   = array();
    $GLOBALS['mapl_test_caps']    = $caps;
    $GLOBALS['mapl_test_next_id'] = 100;
    $GLOBALS['mapl_test_insert_error'] = null;
}

/**
 * Créer un article dans le stockage simulé.
 *
 * @return WP_Post
 */
function mapl_test_add_post(array $fields, array $meta = array(), array $terms = array()) {
    $id   = $GLOBALS['mapl_test_next_id']++;
    $post = new WP_Post(array_merge(array('ID' => $id), $fields));

    $GLOBALS['mapl_test_posts'][$id] = $post;
    $GLOBALS['mapl_test_meta'][$id]  = array();
    foreach ($meta as $key => $value) {
        $GLOBALS['mapl_test_meta'][$id][$key] = array($value);
    }
    $GLOBALS['mapl_test_terms'][$id] = $terms;

    return $post;
}

function get_post_type($post = null) {
    $object = is_object($post) ? $post : get_post($post);
    return $object && isset($object->post_type) ? $object->post_type : false;
}

function get_post_status($post = null) {
    $object = is_object($post) ? $post : get_post($post);
    return $object && isset($object->post_status) ? $object->post_status : false;
}

function get_post_field($field, $post) {
    $object = is_object($post) ? $post : get_post($post);
    return $object && isset($object->$field) ? $object->$field : '';
}

function get_the_title($post = null) {
    $object = is_object($post) ? $post : get_post($post);
    return $object ? $object->post_title : '';
}

/**
 * Pages simulées (post_type = page) filtrées comme get_posts() : seul le
 * sous-ensemble d'arguments utilisé par SettingsPage::detect_map_page_id()
 * et ::map_page_choices() est pris en charge.
 *
 * @param array $args
 * @return WP_Post[]|int[]
 */
function get_posts(array $args = array()) {
    $types  = isset($args['post_type']) ? (array) $args['post_type'] : array('post');
    $status = isset($args['post_status']) ? $args['post_status'] : 'publish';
    $fields = isset($args['fields']) ? $args['fields'] : 'all';

    $matches = array_values(array_filter($GLOBALS['mapl_test_posts'], static function ($post) use ($types, $status) {
        return in_array($post->post_type, $types, true) && ($status === 'any' || $post->post_status === $status);
    }));

    if ($fields === 'ids') {
        return array_map(static function ($post) { return $post->ID; }, $matches);
    }
    return $matches;
}

/** Permalien simulé : suffisant pour vérifier que add_query_arg() s'y applique. */
function get_permalink($post) {
    $object = is_object($post) ? $post : get_post($post);
    return $object ? 'https://example.test/?page_id=' . $object->ID : false;
}

/** Correspondance littérale « [tag » : suffisant pour les tests (pas d'attributs). */
function has_shortcode($content, $tag) {
    return strpos((string) $content, '[' . $tag) !== false;
}

/** Correspondance littérale sur le commentaire de bloc Gutenberg. */
function has_block($block_name, $content) {
    return strpos((string) $content, '<!-- wp:' . $block_name) !== false;
}

function get_post($post_id) {
    return $GLOBALS['mapl_test_posts'][(int) $post_id] ?? null;
}

function wp_insert_post($postarr, $wp_error = false) {
    if ($GLOBALS['mapl_test_insert_error']) {
        return $GLOBALS['mapl_test_insert_error'];
    }
    // Comme WordPress, wp_insert_post() retire une couche d'échappement.
    return mapl_test_add_post(wp_unslash($postarr))->ID;
}

function get_post_meta($post_id, $key = '', $single = false) {
    $meta = $GLOBALS['mapl_test_meta'][(int) $post_id] ?? array();
    if ($key === '') {
        // WordPress renvoie les valeurs brutes (sérialisées) de la base.
        return array_map(static function ($values) {
            return array_map(static function ($value) {
                return is_array($value) ? serialize($value) : $value;
            }, $values);
        }, $meta);
    }
    if (!isset($meta[$key])) {
        return $single ? '' : array();
    }
    return $single ? $meta[$key][0] : $meta[$key];
}

function add_post_meta($post_id, $key, $value, $unique = false) {
    // Comme WordPress, add_metadata() retire une couche d'échappement.
    $GLOBALS['mapl_test_meta'][(int) $post_id][$key][] = wp_unslash($value);
    return true;
}

function get_object_taxonomies($object) {
    return array(\MappedPlaces\Domain\Schema::TAX_ENTITY, \MappedPlaces\Domain\Schema::TAX_TYPE, \MappedPlaces\Domain\Schema::TAX_REGION);
}

function wp_get_object_terms($post_id, $taxonomy, $args = array()) {
    return $GLOBALS['mapl_test_terms'][(int) $post_id][$taxonomy] ?? array();
}

function wp_set_object_terms($post_id, $terms, $taxonomy) {
    $GLOBALS['mapl_test_terms'][(int) $post_id][$taxonomy] = $terms;
    return $terms;
}

function current_user_can($capability, ...$args) {
    return in_array($capability, $GLOBALS['mapl_test_caps'], true);
}

function get_current_user_id() {
    return 7;
}

/** Un nonce est valide s'il vaut « valid- » suivi de son action. */
function wp_verify_nonce($nonce, $action = -1) {
    return $nonce === 'valid-' . $action ? 1 : false;
}

function wp_create_nonce($action = -1) {
    return 'valid-' . $action;
}

/**
 * Comme WordPress : forme add_query_arg(array $args, $url) ou
 * add_query_arg($key, $value, $url).
 */
function add_query_arg(...$params) {
    if (count($params) >= 3) {
        list($key, $value, $url) = $params;
        $args = array($key => $value);
    } else {
        list($args, $url) = $params;
    }
    return $url . (strpos($url, '?') === false ? '?' : '&') . http_build_query((array) $args);
}

function admin_url($path = '') {
    return 'https://example.test/wp-admin/' . $path;
}

function is_wp_error($thing) {
    return $thing instanceof WP_Error;
}

function wp_slash($value) {
    return is_array($value) ? array_map('wp_slash', $value) : (is_string($value) ? addslashes($value) : $value);
}

function wp_unslash($value) {
    return is_array($value) ? array_map('wp_unslash', $value) : (is_string($value) ? stripslashes($value) : $value);
}

function maybe_unserialize($value) {
    if (is_string($value) && preg_match('/^(a|O|s|i|b|d):/', $value)) {
        $data = @unserialize($value);
        return $data === false && $value !== 'b:0;' ? $value : $data;
    }
    return $value;
}

function esc_url($url) {
    return str_replace('&', '&#038;', (string) $url);
}

function esc_html($text) {
    return htmlspecialchars((string) $text, ENT_QUOTES);
}

function esc_attr($text) {
    return htmlspecialchars((string) $text, ENT_QUOTES);
}

mapl_test_reset_posts();
