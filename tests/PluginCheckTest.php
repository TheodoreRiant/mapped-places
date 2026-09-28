<?php
/**
 * Garde-fous de conformité au répertoire wordpress.org (Plugin Check et
 * règles du répertoire), vérifiables sans WordPress : sorties échappées,
 * aucune opération fichier directe, services externes documentés,
 * désinstallation protégée.
 */

use PHPUnit\Framework\TestCase;

class PluginCheckTest extends TestCase {

    const ROOT = __DIR__ . '/..';

    /**
     * @return string[] Fichiers PHP du cœur (src/ et views/), sans le compagnon.
     */
    private static function core_php_files(): array {
        $files = array();
        $iterator = new RecursiveIteratorIterator(new RecursiveDirectoryIterator(self::ROOT . '/src'));
        foreach ($iterator as $file) {
            if ($file->isFile() && $file->getExtension() === 'php') {
                $files[] = $file->getPathname();
            }
        }
        return array_merge($files, glob(self::ROOT . '/views/*.php'));
    }

    /**
     * @return array<string, string> Chemin relatif => lignes en violation.
     */
    private static function violations(string $pattern): array {
        $found = array();
        foreach (self::core_php_files() as $path) {
            $lines = file($path);
            foreach ($lines as $number => $line) {
                if (preg_match($pattern, $line)) {
                    $found[] = substr($path, strlen(self::ROOT) + 1) . ':' . ($number + 1) . ' ' . trim($line);
                }
            }
        }
        return $found;
    }

    public function test_aucune_fonction_d_affichage_non_echappee(): void {
        $pattern = '/(?<![A-Za-z0-9_])_e\(|echo\s+__\(|(?<![a-z])printf\(\s*(\/\*.*?\*\/\s*)?__\(|wp_die\(\s*__\(/';
        $this->assertSame(array(), self::violations($pattern), "Utiliser esc_html_e(), esc_attr_e() ou esc_html__() :\n" . implode("\n", self::violations($pattern)));
    }

    public function test_aucune_operation_fichier_directe(): void {
        $pattern = '/(?<![A-Za-z0-9_>])(fopen|fclose|unlink|file_put_contents)\(/';
        $this->assertSame(array(), self::violations($pattern), "Passer par SplFileObject, WP_Filesystem ou wp_delete_file() :\n" . implode("\n", self::violations($pattern)));
    }

    public function test_les_superglobales_sont_lues_apres_verification_du_nonce(): void {
        // La couleur d'entité et l'import lisent $_POST : chaque fonction qui
        // le fait doit vérifier un nonce dans son propre corps.
        $taxonomies = (string) file_get_contents(self::ROOT . '/src/Domain/Taxonomies.php');
        $this->assertMatchesRegularExpression('/function save_entity_color\(.*?wp_verify_nonce/s', $taxonomies);
        $this->assertStringContainsString("wp_nonce_field('mapped_places_entity_color'", $taxonomies);

        $importer = (string) file_get_contents(self::ROOT . '/src/Import/Importer.php');
        $this->assertMatchesRegularExpression('/function handle_import\(\).*?wp_verify_nonce/s', $importer);
        $this->assertStringNotContainsString("\$_GET['", $importer, 'Les résultats d\'import passent par un transient, plus par l\'URL.');
    }

    public function test_le_readme_documente_les_services_externes(): void {
        $readme = (string) file_get_contents(self::ROOT . '/readme.txt');
        // Section de premier niveau, exigée par le répertoire.
        $this->assertStringContainsString("\n== External services ==\n", $readme);
        $section = substr($readme, strpos($readme, '== External services =='));
        $section = substr($section, 0, strpos($section, "\n== ", 5));
        foreach (array('openfreemap.org', 'openstreetmap.org', 'openstreetmap.fr', 'data.geopf.fr', 'basemaps.cartocdn.com', 'tile.jawg.io', 'api.maptiler.com', 'tiles.stadiamaps.com', 'tile.thunderforest.com', 'carto.com', 'jawg.io', 'maptiler.com', 'stadiamaps.com', 'thunderforest.com', 'adresse.data.gouv.fr') as $host) {
            $this->assertStringContainsString($host, $section, "Service externe non documenté : $host");
        }
        // Chaque fournisseur : conditions d'utilisation et confidentialité.
        $this->assertSame(9, preg_match_all('/^\* \*\*.+terms: https?:\/\/\S+, privacy: https?:\/\/\S+$/m', $section), 'Un lien CGU et un lien confidentialité par fournisseur de tuiles.');
        $this->assertMatchesRegularExpression('/^Terms: https?:\/\/\S+, privacy: https?:\/\/\S+$/m', $section, 'CGU et confidentialité du géocodeur.');
        $this->assertStringContainsString('= Privacy =', $readme);
        $this->assertStringContainsString('github.com/TheodoreRiant/mapped-places', $readme, 'Lien vers le code source (règle 4).');
    }

    public function test_les_avis_d_administration_restent_sur_les_ecrans_du_plugin(): void {
        // Règle 11 du répertoire : pas d'avis sur tout le tableau de bord.
        foreach (self::core_php_files() as $path) {
            $code = (string) file_get_contents($path);
            if (strpos($code, "'admin_notices'") === false) {
                continue;
            }
            $this->assertStringContainsString('Screen::is_plugin_screen()', $code, substr($path, strlen(self::ROOT) + 1) . ' : un avis doit tester Screen::is_plugin_screen().');
        }
        $runner = (string) file_get_contents(self::ROOT . '/src/Migration/Runner.php');
        $this->assertStringNotContainsString('admin_notices', $runner, 'Le bouton de relance vit dans la page de réglages.');
    }

    public function test_les_parametres_de_duplication_sont_assainis(): void {
        $duplicate = (string) file_get_contents(self::ROOT . '/src/Admin/Duplicate.php');
        $this->assertStringContainsString("sanitize_text_field(wp_unslash(\$_GET['_wpnonce']))", $duplicate);
        $this->assertStringContainsString("absint(wp_unslash(\$_GET['post']))", $duplicate);
        $this->assertStringNotContainsString('process_request(wp_unslash($_GET))', $duplicate);
    }

    public function test_le_build_wordpress_org_ne_livre_aucun_fichier_de_traduction(): void {
        // Le répertoire fournit les paquets de langue : .po/.mo/.json restent
        // hors du build wp.org (.distignore), mais dans l'archive GitHub.
        $dist = (string) file_get_contents(self::ROOT . '/.distignore');
        foreach (array('*.po', '*.mo', '*.json') as $ext) {
            $this->assertStringContainsString("/languages/$ext", $dist, "Fichier de traduction hors build wp.org : $ext");
        }
        // rsync du déploiement : le dépôt git lui-même et les dossiers non versionnés.
        foreach (array('/.git', '/node_modules', '/vendor') as $path) {
            $this->assertStringContainsString($path . "\n", $dist, "Chemin absent de .distignore : $path");
        }
        $attributes = (string) file_get_contents(self::ROOT . '/.gitattributes');
        $this->assertStringNotContainsString('/languages/', $attributes, 'L\'archive GitHub garde les traductions embarquées.');
        // Tout ce que git archive exclut est aussi exclu du build wp.org.
        preg_match_all('/^(\S+)\s+export-ignore/m', $attributes, $matches);
        foreach ($matches[1] as $path) {
            $this->assertStringContainsString($path . "\n", $dist, "Chemin export-ignore absent de .distignore : $path");
        }
        $main = (string) file_get_contents(self::ROOT . '/mapped-places.php');
        $this->assertStringNotContainsString('Domain Path', $main);
    }

    public function test_la_traduction_embarquee_n_est_chargee_que_si_elle_est_livree(): void {
        // Sans effet dans le build wp.org (fichier absent) ; une installation
        // depuis GitHub charge sa traduction tant qu'aucun paquet de langue
        // n'est installé, sur init.
        $plugin = (string) file_get_contents(self::ROOT . '/src/Plugin.php');
        $this->assertMatchesRegularExpression('/function load_bundled_translations\(\)\s*\{.*?is_readable\(\$bundled\).*?load_plugin_textdomain\(/s', $plugin);
        $this->assertStringContainsString("add_action('init', array(__CLASS__, 'load_bundled_translations'))", $plugin);
        $this->assertSame(1, substr_count($plugin, 'load_plugin_textdomain('));
    }

    public function test_la_desinstallation_est_protegee(): void {
        $path = self::ROOT . '/uninstall.php';
        $this->assertFileExists($path);
        $uninstall = (string) file_get_contents($path);
        $this->assertStringContainsString("defined('WP_UNINSTALL_PLUGIN')", $uninstall);
        foreach (array('mapped_places_settings', 'mapped_places_migrations_done', 'mapped_places_migration_log_last', 'mapped_places_snapshot_') as $key) {
            $this->assertStringContainsString($key, $uninstall, "Option non nettoyée : $key");
        }
        $this->assertStringContainsString('MAPPED_PLACES_UNINSTALL_DATA', $uninstall, 'La suppression des lieux doit rester un choix explicite.');
    }

    public function test_les_notices_d_administration_sont_fermables(): void {
        $settings = (string) file_get_contents(self::ROOT . '/src/Admin/SettingsPage.php');
        $this->assertMatchesRegularExpression('/notice notice-warning[^"]*is-dismissible/', $settings);
    }
}
