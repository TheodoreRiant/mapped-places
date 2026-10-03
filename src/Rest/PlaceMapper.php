<?php
/**
 * Représentation publique d'un lieu pour l'API REST : champs en texte brut
 * (le JS échappe tout ce qu'il affiche), entité colorée, galerie.
 */

namespace MappedPlaces\Rest;

use MappedPlaces\Domain\FieldRegistry;
use MappedPlaces\Domain\People;
use MappedPlaces\Domain\Schema;
use MappedPlaces\Map\Defaults;

if (!defined('ABSPATH')) {
    exit;
}

final class PlaceMapper {

    /** Champs du registre exposés tels quels (hors coordonnées et galerie). */
    const TEXT_FIELDS = array(
        'address', 'postal_code', 'city', 'phone', 'email', 'manager', 'website', 'opening_hours',
    );

    /**
     * Lieu tel qu'il figure dans la liste (route places).
     *
     * @param int        $post_id
     * @param float|null $distance Distance à la position demandée, en km.
     * @return array
     */
    public static function summary($post_id, $distance = null) {
        return array_merge(
            array(
                'id'          => $post_id,
                // Lien profond (?place=slug) : le slug d'un brouillon est déjà
                // stable (WordPress le fixe dès le premier enregistrement), mais
                // la route /places ne liste que les lieux publiés.
                'slug'        => (string) get_post_field('post_name', $post_id),
                'title'       => self::plain_text(get_the_title($post_id)),
                'excerpt'     => self::plain_text(get_the_excerpt($post_id)),
                'description' => self::plain_text(wp_strip_all_tags(get_post_field('post_content', $post_id))),
                'url'         => get_permalink($post_id),
                'thumbnail'   => get_the_post_thumbnail_url($post_id, 'medium') ?: '',
                'lat'         => floatval(FieldRegistry::get($post_id, 'latitude')),
                'lng'         => floatval(FieldRegistry::get($post_id, 'longitude')),
            ),
            self::text_fields($post_id),
            array(
                // Photos de galerie seulement : à 0, le popup affiche
                // directement `thumbnail` sans appeler la route détail.
                'gallery_count' => count(self::gallery_ids($post_id)),
                'types'         => self::term_names($post_id, Schema::TAX_TYPE),
                'services'      => self::term_names($post_id, Schema::TAX_SERVICE),
                'accessibility' => self::term_names($post_id, Schema::TAX_ACCESSIBILITY),
                'regions'       => self::term_names($post_id, Schema::TAX_REGION),
                'entity'        => self::entity($post_id),
                'distance'      => $distance,
            )
        );
    }

    /**
     * Fiche complète d'un lieu (route places/{id}).
     *
     * @param \WP_Post $post
     * @return array
     */
    public static function detail($post) {
        $post_id = $post->ID;
        return array_merge(
            array(
                'id'        => $post_id,
                'slug'      => (string) $post->post_name,
                'title'     => self::plain_text(get_the_title($post)),
                'content'   => apply_filters('the_content', $post->post_content), // phpcs:ignore WordPress.NamingConventions.PrefixAllGlobals.NonPrefixedHooknameFound -- filtre du cœur WordPress.
                'excerpt'   => self::plain_text(get_the_excerpt($post)),
                'url'       => get_permalink($post),
                'thumbnail' => get_the_post_thumbnail_url($post_id, 'large') ?: '',
                'lat'       => floatval(FieldRegistry::get($post_id, 'latitude')),
                'lng'       => floatval(FieldRegistry::get($post_id, 'longitude')),
            ),
            self::text_fields($post_id),
            array(
                'types'         => wp_get_post_terms($post_id, Schema::TAX_TYPE, array('fields' => 'all')),
                'regions'       => wp_get_post_terms($post_id, Schema::TAX_REGION, array('fields' => 'all')),
                'services'      => wp_get_post_terms($post_id, Schema::TAX_SERVICE, array('fields' => 'all')),
                'accessibility' => wp_get_post_terms($post_id, Schema::TAX_ACCESSIBILITY, array('fields' => 'all')),
                'entity'        => self::entity($post_id),
                'gallery'       => self::gallery_images($post_id),
            )
        );
    }

    /**
     * Première entité du lieu, avec sa couleur (couleur par défaut sinon).
     *
     * @param int $post_id
     * @return array|null
     */
    public static function entity($post_id) {
        $terms = wp_get_post_terms($post_id, Schema::TAX_ENTITY, array('fields' => 'all'));
        if (empty($terms) || is_wp_error($terms)) {
            return null;
        }
        return self::describe_entity($terms[0]);
    }

    /**
     * @param \WP_Term $term
     * @return array{id: int, name: string, slug: string, color: string}
     */
    public static function describe_entity($term) {
        return array(
            'id'    => (int) $term->term_id,
            'name'  => self::plain_text($term->name),
            'slug'  => $term->slug,
            'color' => get_term_meta($term->term_id, Schema::ENTITY_COLOR_META, true) ?: Defaults::color(),
        );
    }

    /**
     * Convertir un texte d'affichage WordPress en texte brut.
     *
     * get_the_title() et get_the_excerpt() passent par wptexturize, qui
     * produit des entités (&rsquo;, &laquo;…) ; WordPress stocke aussi les
     * noms de termes encodés (& → &amp;). Le JS échappe tout ce qu'il affiche :
     * sans ce décodage, « Saveurs d&rsquo;Élise » s'affichait tel quel.
     *
     * @param string|null $text
     * @return string
     */
    public static function plain_text($text) {
        return html_entity_decode((string) $text, ENT_QUOTES | ENT_HTML5, 'UTF-8');
    }

    /**
     * plain_text() appliqué à une liste de noms de termes.
     *
     * @param string[]|\WP_Error|false $names Retour de wp_get_post_terms().
     * @return string[]
     */
    public static function plain_names($names) {
        return is_array($names) ? array_map(array(__CLASS__, 'plain_text'), $names) : array();
    }

    /**
     * Un lieu peut-il être renvoyé par la route détail (publique) ?
     *
     * Publié : oui. Brouillon, en attente ou privé : seulement pour qui peut
     * le lire — sinon une copie tout juste dupliquée serait lisible par
     * n'importe qui devinant son ID. Même règle que la liste (publish).
     *
     * @param \WP_Post|null $post
     * @return bool
     */
    public static function is_visible($post) {
        if (!$post || $post->post_type !== Schema::POST_TYPE) {
            return false;
        }
        return $post->post_status === 'publish' || current_user_can('read_post', $post->ID);
    }

    /**
     * Ordonner les images du popup : l'image à la une d'abord, la galerie ensuite.
     *
     * Jusqu'en 2.7.6 le popup affichait soit la galerie, soit l'image à la une :
     * renseigner une galerie faisait disparaître la couverture. Si la couverture
     * figure aussi dans la galerie, elle n'apparaît qu'une fois, en tête.
     *
     * @param int|string $cover_id    ID de l'image à la une (0 si aucune).
     * @param int[]      $gallery_ids IDs de la galerie, déjà validés.
     * @return int[]
     */
    public static function build_popup_image_ids($cover_id, array $gallery_ids) {
        $cover_id = absint($cover_id);
        $ids      = ($cover_id && wp_attachment_is_image($cover_id)) ? array($cover_id) : array();

        foreach ($gallery_ids as $id) {
            if (!in_array($id, $ids, true)) {
                $ids[] = $id;
            }
        }

        return $ids;
    }

    /**
     * @param int $post_id
     * @return array<string, string>
     */
    private static function text_fields($post_id) {
        $fields = array();
        foreach (self::TEXT_FIELDS as $field) {
            $fields[$field] = FieldRegistry::get($post_id, $field);
        }
        // Rôle + nom, dans l'ordre ; `manager` (noms seuls) reste servi.
        $fields['people'] = People::for_post($post_id, People::default_role());
        return $fields;
    }

    /**
     * @param int    $post_id
     * @param string $taxonomy
     * @return string[]
     */
    private static function term_names($post_id, $taxonomy) {
        return self::plain_names(wp_get_post_terms($post_id, $taxonomy, array('fields' => 'names')));
    }

    /**
     * IDs valides de la galerie (images, dédoublonnées, ordre conservé).
     *
     * @param int $post_id
     * @return int[]
     */
    private static function gallery_ids($post_id) {
        return FieldRegistry::parse_gallery_ids(FieldRegistry::get($post_id, 'gallery'));
    }

    /**
     * Galerie pour la fiche : l'image à la une ouvre la liste. Deux tailles
     * (medium / large) + srcset/sizes pour que le carrousel charge des
     * images responsives sans recharger en grand ce qui reste en miniature.
     *
     * @param int $post_id
     * @return array[]
     */
    private static function gallery_images($post_id) {
        $images = array();
        foreach (self::build_popup_image_ids(get_post_thumbnail_id($post_id), self::gallery_ids($post_id)) as $attachment_id) {
            $medium = wp_get_attachment_image_src($attachment_id, 'medium');
            $large  = wp_get_attachment_image_src($attachment_id, 'large');
            if (!$medium && !$large) {
                continue;
            }
            $images[] = array(
                'id'     => $attachment_id,
                'alt'    => get_post_meta($attachment_id, '_wp_attachment_image_alt', true),
                'medium' => self::image_size($medium),
                'large'  => self::image_size($large),
                'srcset' => wp_get_attachment_image_srcset($attachment_id, 'large') ?: '',
                'sizes'  => wp_get_attachment_image_sizes($attachment_id, 'large') ?: '',
            );
        }
        return $images;
    }

    /**
     * @param array|false $src Retour de wp_get_attachment_image_src().
     * @return array{url: string, w: int, h: int}
     */
    private static function image_size($src) {
        return array(
            'url' => $src ? $src[0] : '',
            'w'   => $src ? (int) $src[1] : 0,
            'h'   => $src ? (int) $src[2] : 0,
        );
    }
}
