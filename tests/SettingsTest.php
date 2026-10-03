<?php
/**
 * Tests des réglages du plugin (clé API, fond imposé, validation).
 */

use PHPUnit\Framework\TestCase;
use MappedPlaces\Admin\SettingsPage;
use MappedPlaces\Domain\Schema;
use MappedPlaces\Map\TileProviders;

final class SettingsTest extends TestCase {

    protected function setUp(): void {
        mapl_test_reset();
        mapl_test_reset_posts();
    }

    /**
     * Créer une page publiée simulée.
     *
     * @param string $title
     * @param string $content
     * @return \WP_Post
     */
    private function add_page($title, $content) {
        return mapl_test_add_post(array(
            'post_type'   => 'page',
            'post_status' => 'publish',
            'post_title'  => $title,
            'post_content' => $content,
        ));
    }

    /**
     * Installer des réglages en base simulée.
     *
     * @param array $settings Réglages partiels.
     */
    private function store(array $settings) {
        mapl_test_reset(array(SettingsPage::OPTION_NAME => $settings));
    }

    /**
     * Valider une entrée via l'instance de réglages.
     *
     * @param mixed $input Entrée brute.
     * @return array Réglages nettoyés.
     */
    private function sanitize($input) {
        return SettingsPage::get_instance()->sanitize($input);
    }

    /* ---------------------------------------------------------------- */
    /*  Lecture                                                          */
    /* ---------------------------------------------------------------- */

    public function test_les_valeurs_par_defaut_sont_completees() {
        $this->store(array('api_key' => 'abc'));
        $settings = SettingsPage::get_all();

        $this->assertSame('abc', $settings['api_key']);
        $this->assertSame('', $settings['tile_style']);
        $this->assertSame('', $settings['custom_tile_url']);
    }

    public function test_une_option_corrompue_retombe_sur_les_defauts() {
        $this->store(array());
        mapl_test_reset(array(SettingsPage::OPTION_NAME => 'chaine-inattendue'));

        $this->assertSame(SettingsPage::defaults(), SettingsPage::get_all());
    }

    public function test_la_cle_api_est_lue_sans_espaces() {
        $this->store(array('api_key' => "  ma-cle  "));

        $this->assertSame('ma-cle', SettingsPage::get_api_key());
    }

    public function test_aucune_constante_definie_signifie_champ_modifiable() {
        $this->assertFalse(SettingsPage::is_key_locked_by_constant());
    }

    public function test_un_fond_impose_inconnu_est_ignore() {
        $this->store(array('tile_style' => 'fond-inexistant'));

        $this->assertSame('', SettingsPage::get_forced_tile_style());
    }

    public function test_un_fond_impose_valide_est_retourne() {
        $this->store(array('tile_style' => 'ign-plan'));

        $this->assertSame('ign-plan', SettingsPage::get_forced_tile_style());
    }

    /* ---------------------------------------------------------------- */
    /*  Résolution du fond affiché                                       */
    /* ---------------------------------------------------------------- */

    public function test_le_fond_impose_prime_sur_celui_de_la_page() {
        $this->store(array('tile_style' => 'osm-fr'));

        $resolved = SettingsPage::resolve_tile('positron');

        $this->assertSame('osm-fr', $resolved['id']);
    }

    public function test_sans_fond_impose_la_page_decide() {
        $this->store(array());

        $resolved = SettingsPage::resolve_tile('osm-fr');

        $this->assertSame('osm-fr', $resolved['id']);
    }

    public function test_une_page_restee_sur_carto_bascule_sur_le_plan_ign() {
        // Les pages Elementor du site enregistrent « positron » : sans clé
        // CARTO, la carte doit basculer seule plutôt que d'afficher le
        // filigrane « API KEY REQUIRED ».
        $this->store(array());

        $resolved = SettingsPage::resolve_tile('positron');

        $this->assertSame(TileProviders::FALLBACK_ID, $resolved['id']);
        $this->assertSame('missing_key', $resolved['fallbackReason']);
    }

    public function test_un_fond_a_cle_configure_avec_sa_cle_est_servi() {
        $this->store(array('tile_style' => 'jawg-light', 'api_key' => 'jeton-xyz'));

        $resolved = SettingsPage::resolve_tile('positron');

        $this->assertSame('jawg-light', $resolved['id']);
        $this->assertStringContainsString('jeton-xyz', $resolved['url']);
    }

    public function test_un_fond_a_cle_sans_cle_ne_casse_pas_la_carte() {
        $this->store(array('tile_style' => 'jawg-light'));

        $resolved = SettingsPage::resolve_tile('positron');

        $this->assertSame(TileProviders::FALLBACK_ID, $resolved['id']);
        $this->assertSame('missing_key', $resolved['fallbackReason']);
    }

    /* ---------------------------------------------------------------- */
    /*  Table transmise au JS                                            */
    /* ---------------------------------------------------------------- */

    public function test_la_config_js_marque_indisponibles_les_fonds_sans_cle() {
        $this->store(array());
        $config = SettingsPage::js_tiles_config();

        $this->assertFalse($config['providers']['jawg-light']['available']);
        $this->assertSame('', $config['providers']['jawg-light']['url']);
        $this->assertTrue($config['providers']['osm-fr']['available']);
        $this->assertFalse($config['providers']['positron']['available']);
        $this->assertSame(TileProviders::FALLBACK_ID, $config['fallback']);
        $this->assertSame('', $config['forced']);
    }

    public function test_la_config_js_expose_les_fonds_a_cle_une_fois_la_cle_saisie() {
        $this->store(array('api_key' => 'jeton-xyz', 'tile_style' => 'jawg-light'));
        $config = SettingsPage::js_tiles_config();

        $this->assertTrue($config['providers']['jawg-light']['available']);
        $this->assertStringContainsString('jeton-xyz', $config['providers']['jawg-light']['url']);
        $this->assertSame('jawg-light', $config['forced']);
    }

    public function test_la_config_js_n_expose_jamais_de_jeton_key_non_remplace() {
        $this->store(array('api_key' => 'jeton-xyz'));

        foreach (SettingsPage::js_tiles_config()['providers'] as $id => $provider) {
            $this->assertStringNotContainsString('{key}', $provider['url'], "Jeton {key} resté dans $id");
        }
    }

    /* ---------------------------------------------------------------- */
    /*  Validation du formulaire                                         */
    /* ---------------------------------------------------------------- */

    public function test_une_entree_non_tableau_restaure_les_defauts() {
        $clean = $this->sanitize('nimporte quoi');

        $this->assertSame(SettingsPage::defaults(), $clean);
        $this->assertContains('mapped_places_bad_payload', mapl_test_error_codes());
    }

    public function test_un_fond_inconnu_est_rejete_avec_message() {
        $clean = $this->sanitize(array('tile_style' => 'fond-bidon'));

        $this->assertSame('', $clean['tile_style']);
        $this->assertContains('mapped_places_bad_style', mapl_test_error_codes());
    }

    public function test_un_fond_connu_est_conserve() {
        $clean = $this->sanitize(array('tile_style' => 'ign-plan'));

        $this->assertSame('ign-plan', $clean['tile_style']);
        $this->assertSame(array('mapped_places_saved'), mapl_test_error_codes());
    }

    /**
     * Sur un sous-menu personnalise, WordPress n'affiche pas son message
     * « Reglages enregistres » : sans confirmation explicite, l'utilisateur
     * clique Enregistrer et n'a aucun retour.
     */
    public function test_un_enregistrement_valide_confirme_a_l_utilisateur() {
        $this->sanitize(array('tile_style' => '', 'api_key' => 'abc'));

        $this->assertContains('mapped_places_saved', mapl_test_error_codes());
    }

    public function test_une_erreur_bloquante_supprime_la_confirmation() {
        $this->sanitize(array('custom_tile_url' => 'http://pas-https.fr/{z}/{x}/{y}.png'));

        $codes = mapl_test_error_codes();
        $this->assertContains('mapped_places_bad_custom_url', $codes);
        $this->assertNotContains('mapped_places_saved', $codes);
    }

    /**
     * Un simple avertissement (« ce fond exige une cle ») ne doit PAS masquer
     * la confirmation : les reglages ont bien ete enregistres.
     */
    public function test_un_avertissement_laisse_la_confirmation() {
        $this->sanitize(array('tile_style' => 'jawg-light', 'api_key' => ''));

        $codes = mapl_test_error_codes();
        $this->assertContains('mapped_places_style_without_key', $codes);
        $this->assertContains('mapped_places_saved', $codes);
    }

    public function test_la_cle_api_est_nettoyee() {
        $clean = $this->sanitize(array('api_key' => "  ma-cle\n"));

        $this->assertSame('ma-cle', $clean['api_key']);
    }

    public function test_une_url_personnalisee_invalide_n_est_pas_enregistree() {
        $clean = $this->sanitize(array('custom_tile_url' => 'http://exemple.fr/{z}/{x}/{y}.png'));

        $this->assertSame('', $clean['custom_tile_url']);
        $this->assertContains('mapped_places_bad_custom_url', mapl_test_error_codes());
    }

    public function test_une_url_personnalisee_valide_est_enregistree() {
        $url   = 'https://exemple.fr/{z}/{x}/{y}.png?key={key}';
        $clean = $this->sanitize(array('custom_tile_url' => $url));

        $this->assertSame($url, $clean['custom_tile_url']);
    }

    public function test_l_attribution_personnalisee_est_filtree() {
        $clean = $this->sanitize(array(
            'custom_tile_attribution' => '<a href="https://exemple.fr">Exemple</a><script>alert(1)</script>',
        ));

        $this->assertStringContainsString('<a href="https://exemple.fr">Exemple</a>', $clean['custom_tile_attribution']);
        $this->assertStringNotContainsString('<script>', $clean['custom_tile_attribution']);
    }

    public function test_un_fond_a_cle_sans_cle_declenche_un_avertissement() {
        $this->assertSame(array(), mapl_test_error_codes());

        $this->sanitize(array('tile_style' => 'jawg-light', 'api_key' => ''));

        $this->assertContains('mapped_places_style_without_key', mapl_test_error_codes());
    }

    public function test_le_fond_personnalise_sans_url_declenche_un_avertissement() {
        $this->sanitize(array('tile_style' => TileProviders::CUSTOM_ID));

        $this->assertContains('mapped_places_custom_without_url', mapl_test_error_codes());
    }

    public function test_une_cle_contenant_un_pourcentage_est_preservee() {
        $clean = $this->sanitize(array('api_key' => 'ab%3Dcd'));

        $this->assertSame('ab%3Dcd', $clean['api_key']);
    }

    public function test_une_cle_absente_du_formulaire_conserve_la_valeur_en_base() {
        // Cas du champ désactivé quand la constante wp-config.php définit la
        // clé : le navigateur ne soumet pas le champ, la base ne doit pas
        // être vidée pour autant.
        $this->store(array('api_key' => 'cle-en-base'));

        $clean = $this->sanitize(array('tile_style' => 'ign-plan'));

        $this->assertSame('cle-en-base', $clean['api_key']);
    }

    public function test_le_html_est_retire_de_la_cle() {
        $clean = $this->sanitize(array('api_key' => "<b>ma</b> cle\n"));

        $this->assertSame('macle', $clean['api_key']);
    }

    public function test_la_validation_ne_modifie_pas_l_entree() {
        $input = array('tile_style' => 'ign-plan', 'api_key' => '  abc  ');
        $copy  = $input;

        $this->sanitize($input);

        $this->assertSame($copy, $input);
    }

    public function test_les_champs_absents_prennent_leur_valeur_par_defaut() {
        $clean = $this->sanitize(array('api_key' => 'abc'));

        $this->assertSame(array_keys(SettingsPage::defaults()), array_keys($clean));
        $this->assertSame('', $clean['tile_style']);
    }

    /* ---------------------------------------------------------------- */
    /*  Masquage de la clé                                               */
    /* ---------------------------------------------------------------- */

    public function test_une_cle_courte_est_entierement_masquee() {
        $this->assertSame('••••••', SettingsPage::mask_key('abcdef'));
    }

    public function test_une_cle_longue_laisse_voir_ses_extremites() {
        $masked = SettingsPage::mask_key('abcd1234567890wxyz');

        $this->assertStringStartsWith('abcd', $masked);
        $this->assertStringEndsWith('wxyz', $masked);
        $this->assertStringNotContainsString('1234567890', $masked);
    }

    public function test_un_lien_d_attribution_en_nouvel_onglet_recoit_noopener() {
        $clean = $this->sanitize(array(
            'custom_tile_attribution' => '<a href="https://exemple.fr" target="_blank">Exemple</a>',
        ));

        $this->assertStringContainsString('rel="noopener"', $clean['custom_tile_attribution']);
    }

    /* ---------------------------------------------------------------- */
    /*  Page de réglages                                                 */
    /* ---------------------------------------------------------------- */

    public function test_la_page_recoit_des_valeurs_preparees() {
        mapl_test_reset(array(SettingsPage::OPTION_NAME => array('api_key' => 'abcd1234efgh5678', 'tile_style' => 'osm')));

        $view = SettingsPage::view_data();

        $this->assertSame('osm', $view['settings']['tile_style']);
        $this->assertSame(SettingsPage::OPTION_NAME, $view['option_name']);
        $this->assertSame(SettingsPage::mask_key('abcd1234efgh5678'), $view['masked_key']);
        $this->assertFalse($view['locked']);
        $this->assertTrue($view['forced']);
        $this->assertSame('osm', $view['resolved_id']);
        $this->assertArrayHasKey('osm', $view['providers']);
    }

    public function test_sans_cle_la_page_n_affiche_pas_de_cle_masquee() {
        $this->assertSame('', SettingsPage::view_data()['masked_key']);
    }

    /** Le HTML vit dans views/settings-page.php, comme celui de la carte. */
    public function test_la_classe_ne_contient_plus_de_html() {
        $source = file_get_contents(__DIR__ . '/../src/Admin/SettingsPage.php');

        $this->assertStringNotContainsString('<table', $source);
        $this->assertFileExists(__DIR__ . '/../views/settings-page.php');
    }

    /* ---------------------------------------------------------------- */
    /*  Lien profond d'un lieu (?place=<slug>), ALL-326                 */
    /* ---------------------------------------------------------------- */

    public function test_sans_reglage_ni_detection_aucun_lien_n_est_construit() {
        $place = mapl_test_add_post(array('post_type' => Schema::POST_TYPE, 'post_status' => 'publish', 'post_name' => 'maison-verte'));

        $this->assertSame(0, SettingsPage::get_map_page_id());
        $this->assertSame('', SettingsPage::get_map_page_url());
        $this->assertSame('', SettingsPage::get_place_link($place), 'Jamais de lien cassé sans page de carte.');
    }

    public function test_la_page_avec_le_shortcode_est_detectee_automatiquement() {
        $page = $this->add_page('Notre carte', 'Texte avant [mapped-places] texte après');

        $this->assertSame($page->ID, SettingsPage::detect_map_page_id());
        $this->assertSame($page->ID, SettingsPage::get_map_page_id());
    }

    public function test_la_page_avec_le_bloc_est_detectee_automatiquement() {
        $page = $this->add_page('Notre carte', '<!-- wp:mapped-places/map /-->');

        $this->assertSame($page->ID, SettingsPage::detect_map_page_id());
    }

    public function test_une_page_sans_shortcode_ni_bloc_n_est_pas_detectee() {
        $this->add_page('À propos', 'Rien ici qui ressemble à une carte.');

        $this->assertSame(0, SettingsPage::detect_map_page_id());
    }

    public function test_le_reglage_explicite_prime_sur_la_detection() {
        $this->add_page('Carte détectée', '[mapped-places]');
        $chosen = $this->add_page('Carte choisie', 'rien ici');
        $this->store(array('map_page_id' => (string) $chosen->ID));

        $this->assertSame($chosen->ID, SettingsPage::get_map_page_id());
    }

    public function test_un_reglage_pointant_vers_une_page_depubliee_retombe_sur_la_detection() {
        $detected = $this->add_page('Carte détectée', '[mapped-places]');
        $draft    = mapl_test_add_post(array('post_type' => 'page', 'post_status' => 'draft', 'post_title' => 'Brouillon'));
        $this->store(array('map_page_id' => (string) $draft->ID));

        $this->assertSame($detected->ID, SettingsPage::get_map_page_id());
    }

    public function test_le_lien_d_un_lieu_publie_utilise_son_slug() {
        $page  = $this->add_page('Notre carte', '[mapped-places]');
        $place = mapl_test_add_post(array('post_type' => Schema::POST_TYPE, 'post_status' => 'publish', 'post_name' => 'maison-verte'));

        $this->assertSame(
            'https://example.test/?page_id=' . $page->ID . '&place=maison-verte',
            SettingsPage::get_place_link($place)
        );
    }

    public function test_un_lieu_sans_slug_stable_utilise_son_identifiant() {
        // Brouillon jamais enregistré : WordPress ne lui a pas encore donné
        // de slug stable. Le lien reste constructible, avec l'identifiant.
        $page  = $this->add_page('Notre carte', '[mapped-places]');
        $place = mapl_test_add_post(array('post_type' => Schema::POST_TYPE, 'post_status' => 'draft'));

        $this->assertSame(
            'https://example.test/?page_id=' . $page->ID . '&place=' . $place->ID,
            SettingsPage::get_place_link($place)
        );
    }

    public function test_map_page_choices_liste_les_pages_publiees_seulement() {
        $page = $this->add_page('Accueil', 'contenu');
        mapl_test_add_post(array('post_type' => 'page', 'post_status' => 'draft', 'post_title' => 'Brouillon'));

        $choices = SettingsPage::map_page_choices();

        $this->assertArrayHasKey($page->ID, $choices);
        $this->assertSame('Accueil', $choices[$page->ID]);
        $this->assertCount(1, $choices);
    }

    public function test_un_identifiant_de_page_invalide_est_rejete_a_la_sauvegarde() {
        $clean = $this->sanitize(array('map_page_id' => '999999'));

        $this->assertSame('', $clean['map_page_id']);
        $this->assertContains('mapped_places_bad_map_page', mapl_test_error_codes());
    }

    public function test_un_identifiant_de_page_valide_est_conserve() {
        $page  = $this->add_page('Notre carte', '[mapped-places]');
        $clean = $this->sanitize(array('map_page_id' => (string) $page->ID));

        $this->assertSame((string) $page->ID, $clean['map_page_id']);
        $this->assertNotContains('mapped_places_bad_map_page', mapl_test_error_codes());
    }

    public function test_un_avertissement_de_page_invalide_n_empeche_pas_la_confirmation() {
        $this->sanitize(array('map_page_id' => '999999'));

        $codes = mapl_test_error_codes();
        $this->assertContains('mapped_places_bad_map_page', $codes);
        $this->assertContains('mapped_places_saved', $codes);
    }
}
