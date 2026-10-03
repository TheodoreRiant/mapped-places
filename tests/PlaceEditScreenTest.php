<?php
/**
 * L'écran d'édition d'un lieu est un formulaire en sections : plus d'éditeur
 * d'article, une description courte enregistrée dans post_content, les meta
 * boxes historiques retirées de la colonne principale.
 */

use MappedPlaces\Admin\MetaBoxes;
use MappedPlaces\Admin\PlaceEditScreen;
use MappedPlaces\Admin\SettingsPage;
use MappedPlaces\Domain\Schema;
use PHPUnit\Framework\TestCase;

class PlaceEditScreenTest extends TestCase {

    protected function setUp(): void {
        mapl_test_reset();
        mapl_test_reset_posts();
    }

    public function test_les_sections_suivent_l_ordre_de_saisie_d_un_lieu(): void {
        $ids = array_column(PlaceEditScreen::sections(), 'id');
        $this->assertSame(array('location', 'description', 'contact', 'management', 'gallery', 'share'), $ids);
        foreach (PlaceEditScreen::sections() as $section) {
            $this->assertTrue(is_callable($section['render']), 'Section sans rendu : ' . $section['id']);
            $this->assertNotSame('', $section['label']);
        }
    }

    public function test_le_champ_description_enregistre_dans_post_content_et_echappe(): void {
        $html = PlaceEditScreen::description_field('Mission & "objectifs" <script>x</script>');
        $this->assertStringContainsString('name="content"', $html, 'Le champ doit s\'appeler content pour que WordPress l\'enregistre dans post_content.');
        $this->assertStringContainsString('Mission &amp; &quot;objectifs&quot;', $html);
        $this->assertStringNotContainsString('<script>', $html);
        $this->assertStringContainsString('rows="' . PlaceEditScreen::DESCRIPTION_ROWS . '"', $html);
    }

    public function test_un_contenu_html_existant_est_ramene_en_texte_brut(): void {
        $plain = PlaceEditScreen::to_plain_text("<p>Reference library.</p>\n<p><strong>Capacity:</strong> 60,000 books</p>");
        $this->assertSame("Reference library.\n\nCapacity: 60,000 books", $plain);
        $this->assertSame("ligne 1\nligne 2", PlaceEditScreen::to_plain_text('ligne 1<br />ligne 2'));
        $this->assertSame('L\'été & co', PlaceEditScreen::to_plain_text('L&#039;été &amp; co'));
    }

    public function test_les_meta_boxes_de_la_colonne_principale_sont_retirees(): void {
        $GLOBALS['mapl_test_removed_meta_boxes'] = array();
        PlaceEditScreen::get_instance()->remove_default_boxes();
        $removed = array_column($GLOBALS['mapl_test_removed_meta_boxes'], 0);
        foreach (MetaBoxes::BOX_IDS as $box_id) {
            $this->assertContains($box_id, $removed, 'Meta box encore affichée deux fois : ' . $box_id);
        }
        $this->assertContains('postexcerpt', $removed);
        foreach ($GLOBALS['mapl_test_removed_meta_boxes'] as $call) {
            $this->assertSame(Schema::POST_TYPE, $call[1]);
        }
    }

    public function test_le_type_de_contenu_n_a_plus_l_editeur_d_article(): void {
        $source = (string) file_get_contents(dirname(__DIR__) . '/src/Domain/PlacePostType.php');
        $this->assertMatchesRegularExpression("/'supports'\\s*=>\\s*apply_filters\\('mapped_places_place_supports',\\s*array\\('title', 'thumbnail'\\)\\)/", $source);
        $this->assertStringNotContainsString("'editor'", preg_replace('#//[^\n]*#', '', $source), 'Le support editor ne doit pas être actif par défaut.');
    }

    /* ---------------------------------------------------------------- */
    /*  Section « Lien partageable », ALL-326                            */
    /* ---------------------------------------------------------------- */

    private function add_map_page() {
        return mapl_test_add_post(array('post_type' => 'page', 'post_status' => 'publish', 'post_title' => 'Carte', 'post_content' => '[mapped-places]'));
    }

    public function test_sans_page_de_carte_un_message_renvoie_vers_les_reglages(): void {
        $place = mapl_test_add_post(array('post_type' => Schema::POST_TYPE, 'post_status' => 'publish', 'post_name' => 'maison-verte'));

        ob_start();
        PlaceEditScreen::render_share_link($place);
        $html = ob_get_clean();

        $this->assertStringContainsString('No map page is configured yet.', $html);
        $this->assertStringContainsString('page=' . SettingsPage::PAGE_SLUG, $html);
        $this->assertStringNotContainsString('mapl-copy-share-link', $html);
    }

    public function test_un_lieu_publie_affiche_le_lien_et_le_bouton_copier(): void {
        $this->add_map_page();
        $place = mapl_test_add_post(array('post_type' => Schema::POST_TYPE, 'post_status' => 'publish', 'post_name' => 'maison-verte'));

        ob_start();
        PlaceEditScreen::render_share_link($place);
        $html = ob_get_clean();

        $this->assertStringContainsString('place=maison-verte', $html);
        $this->assertStringContainsString('mapl-copy-share-link', $html);
        $this->assertStringNotContainsString('mapl-share-link--draft', $html);
        $this->assertStringNotContainsString('This link will work once the place is published.', $html);
    }

    public function test_un_brouillon_affiche_le_lien_grise_avec_une_mention(): void {
        $this->add_map_page();
        $place = mapl_test_add_post(array('post_type' => Schema::POST_TYPE, 'post_status' => 'draft', 'post_name' => 'maison-verte'));

        ob_start();
        PlaceEditScreen::render_share_link($place);
        $html = ob_get_clean();

        $this->assertStringContainsString('mapl-share-link--draft', $html);
        $this->assertStringContainsString('This link will work once the place is published.', $html);
    }

    /** Le lien vient d'une donnée de lieu (slug) : il doit rester échappé à la sortie. */
    public function test_le_lien_affiche_est_echappe(): void {
        $source = (string) file_get_contents(dirname(__DIR__) . '/src/Admin/PlaceEditScreen.php');
        $body   = substr($source, strpos($source, 'function render_share_link'));

        $this->assertStringContainsString('esc_url($url)', $body);
        $this->assertStringContainsString('esc_attr($url)', $body);
    }
}
