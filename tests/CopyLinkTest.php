<?php
/**
 * Action rapide « Copier le lien » dans la liste des établissements (ALL-326).
 *
 * Même pattern que DuplicateTest.php : post_row_actions.
 */

use PHPUnit\Framework\TestCase;
use MappedPlaces\Admin\CopyLink;
use MappedPlaces\Domain\Schema;

final class CopyLinkTest extends TestCase {

    /** @var WP_Post */
    private $place;

    protected function setUp(): void {
        mapl_test_reset();
        mapl_test_reset_posts();

        $this->place = mapl_test_add_post(array(
            'post_type'   => Schema::POST_TYPE,
            'post_status' => 'publish',
            'post_title'  => 'Épicerie solidaire',
            'post_name'   => 'epicerie-solidaire',
        ));
    }

    private function add_map_page() {
        return mapl_test_add_post(array('post_type' => 'page', 'post_status' => 'publish', 'post_title' => 'Carte', 'post_content' => '[mapped-places]'));
    }

    public function test_l_action_est_absente_sans_page_de_carte_configuree() {
        $actions = CopyLink::get_instance()->add_row_action(array('edit' => 'Modifier'), $this->place);

        $this->assertArrayNotHasKey('mapped_places_copy_link', $actions, 'Jamais de lien cassé copié : aucune page de carte, aucune action.');
        $this->assertSame('Modifier', $actions['edit']);
    }

    public function test_l_action_est_ajoutee_des_qu_une_page_de_carte_est_detectee() {
        $this->add_map_page();

        $actions = CopyLink::get_instance()->add_row_action(array('edit' => 'Modifier'), $this->place);

        $this->assertArrayHasKey('mapped_places_copy_link', $actions);
        $this->assertStringContainsString('place=epicerie-solidaire', $actions['mapped_places_copy_link']);
        $this->assertStringContainsString('mapl-copy-link-action', $actions['mapped_places_copy_link']);
        $this->assertStringContainsString('data-url=', $actions['mapped_places_copy_link']);
    }

    public function test_l_action_est_absente_sur_les_autres_types_de_contenu() {
        $this->add_map_page();
        $page = mapl_test_add_post(array('post_type' => 'page', 'post_status' => 'publish'));

        $actions = CopyLink::get_instance()->add_row_action(array(), $page);

        $this->assertArrayNotHasKey('mapped_places_copy_link', $actions);
    }
}
