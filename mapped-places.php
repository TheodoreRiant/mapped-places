<?php
/**
 * Plugin Name: Mapped Places by Théodore Riant
 * Plugin URI: https://github.com/TheodoreRiant/mapped-places
 * Description: Interactive map of your places with search, filters, a synchronised list and photo popups. Block, Elementor widget and shortcode.
 * Version: 2.2.0
 * Requires at least: 6.5
 * Requires PHP: 7.4
 * Author: Théodore Riant
 * Author URI: https://allside.studio
 * License: GPL v2 or later
 * License URI: https://www.gnu.org/licenses/gpl-2.0.html
 * Text Domain: mapped-places
 */

// Security: no direct access
if (!defined('ABSPATH')) {
    exit;
}

// Plugin constants
define('MAPPED_PLACES_VERSION', '2.2.0');
define('MAPPED_PLACES_PLUGIN_FILE', __FILE__);
define('MAPPED_PLACES_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('MAPPED_PLACES_PLUGIN_URL', plugin_dir_url(__FILE__));
define('MAPPED_PLACES_PLUGIN_BASENAME', plugin_basename(__FILE__));

require_once __DIR__ . '/src/autoload.php';

/**
 * Initialiser le plugin
 */
function mapped_places_init() {
    return \MappedPlaces\Plugin::get_instance();
}

// Lancer le plugin
mapped_places_init();
