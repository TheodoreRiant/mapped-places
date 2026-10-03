<?php
/**
 * Gabarit de la page « Map configuration ».
 *
 * Reçoit $view, préparé par SettingsPage::view_data() : le gabarit ne fait
 * qu'échapper.
 *
 * @var array $view
 */

if (!defined('ABSPATH')) {
    exit;
}
?>
<div class="wrap">
    <h1><?php esc_html_e('Map configuration', 'mapped-places'); ?></h1>
    <?php include __DIR__ . '/settings-tabs.php'; ?>

    <?php settings_errors($view['option_name']); ?>

    <form method="post" action="options.php">
        <?php settings_fields($view['option_group']); ?>

        <h2><?php esc_html_e('Basemap', 'mapped-places'); ?></h2>
        <table class="form-table" role="presentation">
            <tr>
                <th scope="row">
                    <label for="mapped_places_tile_style"><?php esc_html_e('Basemap applied to the site', 'mapped-places'); ?></label>
                </th>
                <td>
                    <select id="mapped_places_tile_style"
                            name="<?php echo esc_attr($view['option_name']); ?>[tile_style]">
                        <option value=""<?php selected($view['settings']['tile_style'], ''); ?>>
                            <?php esc_html_e('— Let each map decide (block, Elementor or shortcode setting) —', 'mapped-places'); ?>
                        </option>
                        <?php foreach ($view['providers'] as $mapped_places_id => $mapped_places_provider) : ?>
                            <option value="<?php echo esc_attr($mapped_places_id); ?>"<?php selected($view['settings']['tile_style'], $mapped_places_id); ?>>
                                <?php echo esc_html($mapped_places_provider['label']); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                    <p class="description">
                        <?php esc_html_e('Each map (block, Elementor widget or shortcode) stores its own basemap. Choosing a value here forces it on every map of the site, without reopening each page.', 'mapped-places'); ?>
                    </p>
                </td>
            </tr>

            <tr>
                <th scope="row">
                    <label for="mapped_places_api_key"><?php esc_html_e('Provider API key', 'mapped-places'); ?></label>
                </th>
                <td>
                    <input type="text"
                           id="mapped_places_api_key"
                           class="regular-text code"
                           name="<?php echo esc_attr($view['option_name']); ?>[api_key]"
                           value="<?php echo esc_attr($view['locked'] ? '' : $view['settings']['api_key']); ?>"
                           autocomplete="off"
                           spellcheck="false"
                           <?php disabled($view['locked']); ?> />
                    <?php if ($view['locked']) : ?>
                        <p class="description">
                            <?php
                            printf(
                                /* translators: %s: nom de la constante PHP */
                                esc_html__('The key is set by the %s constant in wp-config.php: it takes precedence and cannot be changed here.', 'mapped-places'),
                                '<code>' . esc_html($view['key_constant']) . '</code>'
                            );
                            ?>
                        </p>
                    <?php else : ?>
                        <p class="description">
                            <?php esc_html_e('Only needed for basemaps marked “key required”. The IGN and OpenStreetMap basemaps work without a key. Since 2026, CARTO basemaps (Positron, Voyager, Dark Matter) require a key: without it, their tiles are stamped “API KEY REQUIRED”.', 'mapped-places'); ?>
                        </p>
                        <p class="description">
                            <?php
                            printf(
                                /* translators: %s: nom de la constante PHP */
                                esc_html__('To avoid storing the key in the database, you can also define it in wp-config.php: %s', 'mapped-places'),
                                '<code>define(\'' . esc_html($view['key_constant']) . '\', \'your-key\');</code>'
                            );
                            ?>
                        </p>
                    <?php endif; ?>
                    <p class="description">
                        <strong><?php esc_html_e('Good to know:', 'mapped-places'); ?></strong>
                        <?php esc_html_e('a tile key is always visible in the page source, since it is the visitor\'s browser that sends it to the provider. Restrict it to your site\'s domain in your provider account.', 'mapped-places'); ?>
                    </p>
                </td>
            </tr>
        </table>

        <h2><?php esc_html_e('Custom provider', 'mapped-places'); ?></h2>
        <p class="description">
            <?php esc_html_e('Only fill this in if you chose the “Custom URL” basemap above.', 'mapped-places'); ?>
        </p>
        <table class="form-table" role="presentation">
            <tr>
                <th scope="row">
                    <label for="mapped_places_custom_tile_url"><?php esc_html_e('Tile URL', 'mapped-places'); ?></label>
                </th>
                <td>
                    <input type="text"
                           id="mapped_places_custom_tile_url"
                           class="large-text code"
                           name="<?php echo esc_attr($view['option_name']); ?>[custom_tile_url]"
                           value="<?php echo esc_attr($view['settings']['custom_tile_url']); ?>"
                           spellcheck="false"
                           placeholder="https://exemple.fr/tiles/{z}/{x}/{y}.png?key={key}" />
                    <p class="description">
                        <?php esc_html_e('Accepted tokens: {z}, {x}, {y} (required), {s} for subdomains, {r} for @2x tiles, and {key}, replaced by the API key above.', 'mapped-places'); ?>
                    </p>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <label for="mapped_places_custom_tile_attribution"><?php esc_html_e('Attribution', 'mapped-places'); ?></label>
                </th>
                <td>
                    <input type="text"
                           id="mapped_places_custom_tile_attribution"
                           class="large-text"
                           name="<?php echo esc_attr($view['option_name']); ?>[custom_tile_attribution]"
                           value="<?php echo esc_attr($view['settings']['custom_tile_attribution']); ?>" />
                    <p class="description">
                        <?php esc_html_e('Legal notice shown at the bottom of the map. <a> links are allowed.', 'mapped-places'); ?>
                    </p>
                </td>
            </tr>
        </table>

        <h2><?php esc_html_e('Place links', 'mapped-places'); ?></h2>
        <p class="description">
            <?php esc_html_e('Each place gets a shareable link that opens the map with it already selected: pin centred, popup open, and highlighted in the list.', 'mapped-places'); ?>
        </p>
        <table class="form-table" role="presentation">
            <tr>
                <th scope="row">
                    <label for="mapped_places_map_page_id"><?php esc_html_e('Page that shows the map', 'mapped-places'); ?></label>
                </th>
                <td>
                    <select id="mapped_places_map_page_id"
                            name="<?php echo esc_attr($view['option_name']); ?>[map_page_id]">
                        <option value=""<?php selected($view['settings']['map_page_id'], ''); ?>>
                            <?php esc_html_e('— Select a page —', 'mapped-places'); ?>
                        </option>
                        <?php foreach ($view['map_pages'] as $mapped_places_page_id => $mapped_places_page_title) : ?>
                            <option value="<?php echo esc_attr($mapped_places_page_id); ?>"<?php selected($view['settings']['map_page_id'], (string) $mapped_places_page_id); ?>>
                                <?php echo esc_html($mapped_places_page_title); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                    <p class="description">
                        <?php esc_html_e('Pages are scanned for the [mapped-places] shortcode or the Mapped Places Map block; the first match is pre-selected below. Choose another page if needed.', 'mapped-places'); ?>
                    </p>
                    <?php if ((string) $view['settings']['map_page_id'] === '' && $view['detected_page_id']) : ?>
                        <p class="description">
                            <?php
                            printf(
                                /* translators: %s: detected page title */
                                esc_html__('Automatically detected: %s', 'mapped-places'),
                                esc_html(get_the_title($view['detected_page_id']))
                            );
                            ?>
                        </p>
                    <?php elseif ((string) $view['settings']['map_page_id'] === '') : ?>
                        <p class="description">
                            <?php esc_html_e('No map page is configured yet. Each place link stays hidden until one is set, or a page with the shortcode or block is published.', 'mapped-places'); ?>
                        </p>
                    <?php endif; ?>
                </td>
            </tr>
        </table>

        <?php submit_button(); ?>
    </form>

    <h2><?php esc_html_e('Current state', 'mapped-places'); ?></h2>
    <table class="widefat striped" style="max-width:840px">
        <tbody>
            <tr>
                <th scope="row" style="width:220px"><?php esc_html_e('API key', 'mapped-places'); ?></th>
                <td>
                    <?php if ($view['masked_key'] === '') : ?>
                        <?php esc_html_e('no key saved', 'mapped-places'); ?>
                    <?php else : ?>
                        <code><?php echo esc_html($view['masked_key']); ?></code>
                        <?php if ($view['locked']) : ?>
                            <?php esc_html_e('(set in wp-config.php)', 'mapped-places'); ?>
                        <?php endif; ?>
                    <?php endif; ?>
                </td>
            </tr>
            <tr>
                <th scope="row">
                    <?php
                    echo esc_html(
                        $view['forced']
                            ? __('Forced basemap, actually displayed', 'mapped-places')
                            : __('Default basemap for pages that do not set one', 'mapped-places')
                    );
                    ?>
                </th>
                <td>
                    <code><?php echo esc_html($view['resolved_id']); ?></code>
                    <?php if ($view['fallback'] !== '') : ?>
                        <br /><em><?php echo esc_html($view['fallback']); ?></em>
                    <?php endif; ?>
                </td>
            </tr>
            <?php if ($view['migration_rerun_url'] !== '') : ?>
                <tr>
                    <th scope="row"><?php esc_html_e('Data migrations', 'mapped-places'); ?></th>
                    <td>
                        <?php if ($view['migration_pending'] > 0) : ?>
                            <?php esc_html_e('Steps waiting to run.', 'mapped-places'); ?>
                        <?php else : ?>
                            <?php esc_html_e('Data up to date.', 'mapped-places'); ?>
                        <?php endif; ?>
                        <a href="<?php echo esc_url($view['migration_rerun_url']); ?>"
                           class="button button-secondary"
                           style="margin-left:12px;">
                            <?php esc_html_e('Run the migration again (taxonomies + colours)', 'mapped-places'); ?>
                        </a>
                    </td>
                </tr>
            <?php endif; ?>
        </tbody>
    </table>
</div>
