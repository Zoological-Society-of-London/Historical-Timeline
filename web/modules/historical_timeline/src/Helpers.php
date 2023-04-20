<?php

namespace Drupal\historical_timeline;

use Drupal\config_pages\Entity\ConfigPages;
use Drupal\image\Entity\ImageStyle;
use Drupal\node\Entity\Node;
use Drupal\taxonomy\Entity\Term;
use Drupal\taxonomy\Plugin\views\argument\Taxonomy;

class Helpers
{


    public static function get_maps()
    {
        $query = \Drupal::entityQuery('node')
            ->condition('type', 'map')
            ->condition('status', 1)
            ->accessCheck(FALSE);

        $results = $query->execute();

        $results = \Drupal\node\Entity\Node::loadMultiple($results);

        $resultArray = [];

        foreach ($results as $node) {

            $resultArray[] = self::get_map_data($node);
        }


        return $resultArray;
    }
    

    public static function get_map_data($node)
    {
        $resultArray = [];


        if (empty($node)) {
            return $resultArray;
        }
        if ($node->getType() !== 'map') {
            return $resultArray;
        }

        $resultArray['id'] = $node->id();
        $resultArray['title'] = $node->getTitle();
        $resultArray['year'] = $node->get('field_year')->value;
        $resultArray['description'] = $node->get('field_description')->value;
        
        // Check if the image field has content.
        $image_uri = $node->field_map_image->entity->field_media_image->entity->getFileUri();

        $style = ImageStyle::load('map_image');
		$image_url = $style->buildUrl($image_uri);

        $resultArray["size"] = getimagesize($image_url);
        
        $resultArray['image'] = $image_url;

        // Borderless image used as background
        $resultArray['image_unscaled'] = \Drupal::service('file_url_generator')->generateAbsoluteString($image_uri);
        $resultArray['map_backbround'] = $resultArray['image_unscaled'];
        $resultArray['map_backbround_opacity'] = 0.1;
        
        // now see if there is an image uploadfed for background image and use this instead.
        $zsl_config = ConfigPages::config('welcome_settings');
        if(!$zsl_config->get('field_map_background')->isEmpty()){
            $image_uri = $zsl_config->field_map_background->entity->field_media_image->entity->getFileUri();
            $resultArray['map_backbround'] = \Drupal::service('file_url_generator')->generateAbsoluteString($image_uri);
        }
        if(!$zsl_config->get('field_background_opacity')->isEmpty()){
            $resultArray['map_backbround_opacity'] = floatval($zsl_config->get('field_background_opacity')->value);
        }
        
        // Get all the marker IDs for this specific map ID
        $markers = \Drupal::entityQuery('node')
        ->condition('type', 'marker')
        ->exists('field_position_horizontal')
        ->exists('field_position_vertical')
        ->condition('field_map', $node->id())
            ->execute();

            $resultArray["markers"] = [];
            foreach ($markers as $marker) {
            $resultArray["markers"][] = $marker;
        }

        return $resultArray;
    }

    public static function get_marker_types()
    {

        $resultArray = [];
        
        $query = \Drupal::entityQuery('taxonomy_term');
        $query->condition('vid', "marker_type");
        $tids = $query->execute();
        $terms = \Drupal\taxonomy\Entity\Term::loadMultiple($tids);
        foreach ($terms as $term) {
            
            $resultArray[$term->id()]['name'] = $term->name->value;
            $resultArray[$term->id()]['colour'] = $term->get('field_marker_colour')->color;
            
        }

        return $resultArray;
    }

    public static function get_quiz($themeId, $quizId){

        $results = [];

        $node = Node::load($quizId);

        // exit if not published
        if(!$node->status){
            return;
        }

        // quiz info
        $results['quizId'] = $quizId;
        $results['title'] = $node->getTitle();
        $field_content = $node->get('field_description')->view("full");
        $results['description'] = \Drupal::service('renderer')->renderRoot($field_content);

        // question info
        foreach($node->get('field_questions_and_answers')->referencedEntities() as $key => $item){

            $field_content = $item->get('field_question')->view("full");
            
            $results['questions'][$key]['questionID'] = "$themeId-$key";
            $results['questions'][$key]['question_text'] =  \Drupal::service('renderer')->renderRoot($field_content);
            $results['questions'][$key]['answers'] = [];
            
            // answer info
            foreach($item->get('field_answers')->referencedEntities() as $key2 => $item2){
                $results['questions'][$key]['answers'][$key2]['answerID'] = "$themeId-$key-$key2";
                $field_content = $item2->get('field_label')->view("full");
                $results['questions'][$key]['answers'][$key2]['label'] = \Drupal::service('renderer')->renderRoot($field_content);
                $results['questions'][$key]['answers'][$key2]['is_correct'] = $item2->get('field_is_correct')->value;

            }
            
        }
        
        // thresholds info
        foreach($node->get('field_score_thresholds')->referencedEntities() as $key => $item){

            $results['score_thresholds'][$key]['lower_limit'] = $item->get('field_lower_limit')->value;
            $results['score_thresholds'][$key]['message'] = strip_tags($item->get('field_score_message')->value);
  
        }
 
        return $results;
    }
    

    public static function validMarker($marker){

		$addMarker = true;
		
		// published?
		if(!$marker->status){
			$addMarker = false;
		}
		if ($marker->get('field_position_horizontal')->isEmpty()) {
			$addMarker = false;
		}
		if ($marker->get('field_position_vertical')->isEmpty()) {
			$addMarker = false;
		}
		if ($marker->get('field_marker_icon')->isEmpty()) {
			$addMarker = false;
		}

		if ($addMarker) {
			return true;
		}

	}
}
