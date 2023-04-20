<?php

namespace Drupal\historical_timeline\Controller;

use Drupal;
use Drupal\Component\Utility\Random;
use Drupal\Core\Ajax\AjaxResponse;
use Drupal\Core\Controller\ControllerBase;
use Drupal\image\Entity\ImageStyle;
use Drupal\node\Entity\Node;
use Symfony\Component\HttpFoundation\JsonResponse;
use Drupal\Core\Ajax\HtmlCommand;
use Drupal\Core\Ajax\OpenModalDialogCommand;
use Drupal\Core\Ajax\ReplaceCommand;
use Drupal\Core\Render\Element\Value;
use Drupal\node\NodeInterface;
use Drupal\node\Plugin\views\argument\Nid;
use Drupal\historical_timeline\ZSLHelpers as ZSLH;
use Symfony\Component\HttpFoundation\Response;
use Symfony\Component\Validator\Constraints\Length;

/**
 * Returns responses for Historical Timeline routes.
 */
class TimelineController extends ControllerBase
{

	public function get_all_themes()
	{
		$query = \Drupal::entityQuery('node')
			->condition('type', 'theme')
			->condition('status', 1)
			->accessCheck(FALSE);

		$results = $query->execute();

		$results = \Drupal\node\Entity\Node::loadMultiple($results);

		$resultArray = [];

		foreach ($results as $index => $node) {

			$output = [];

			$output['id'] = $node->id();
			$output['title'] = $node->getTitle();
			$output['description'] = $node->get('field_description')->value;
			$output['short_description'] = $node->get('field_short_description')->value;


			$image_url = null;
			$image_url_banner = null;
			if (isset($node->get('field_theme_image')->getValue()[0]['target_id'])) {
				$image_uri = $node->get('field_theme_image')->entity->field_media_image->entity->getFileUri();

				$style = ImageStyle::load('16_9');
				$image_url = $style->buildUrl($image_uri);
			}

			$output['image'] = $image_url;
			$output['image_banner'] = $image_url_banner;

			$markers = $node->get('field_markers')->referencedEntities();
			$output['markers'] = [];

			foreach ($markers as $marker) {

				// only add if marker can be rendered.
				$addMarker = ZSLH::validMarker($marker);

				if ($addMarker) {
					$output['markers'][] = $marker->id();
				}
			}

			if (!$node->get('field_theme_quiz')->isEmpty()) {
				// load the quiz
				$themeQuiz = ZSLH::get_quiz($node->id(), $node->get('field_theme_quiz')[0]->target_id);
				if($themeQuiz){
					$output['quiz'] = $themeQuiz;
				}
			}

			$resultArray[] = $output;
		}

		shuffle($resultArray);

		return $resultArray;
	}




	public function get_all_maps()
	{

		return ZSLH::get_maps();
	}

	public function get_all_markers()
	{

		$query = \Drupal::entityQuery('node')
			->condition('type', 'marker')
			->exists('field_position_horizontal')
			->exists('field_position_vertical')
			->condition('status', 1)
			->accessCheck(FALSE);

		$results = $query->execute();

		$results = \Drupal\node\Entity\Node::loadMultiple($results);

		$resultArray = [];

		foreach ($results as $index => $node) {

			// only add if marker can be rendered.
			$addMarker = ZSLH::validMarker($node);

			if ($addMarker) {
				$resultArray[] = self::get_marker_data($node);
			}
			
		}

		return $resultArray;
	}

	public function get_theme($themeID)
	{

		// TODO with reference to how you did it for /api_get_map/nid  do the same for a theme. done

		$resultArray = [];

		$node = Node::load($themeID);
		if (empty($node)) {
			return new JsonResponse($resultArray);
		}
		if ($node->getType() !== 'theme') {
			return new JsonResponse($resultArray);
		}

		return new JsonResponse($resultArray);
	}


	public function load_marker_panel(NodeInterface $marker, NodeInterface $current_theme)
	{

		$header_links = [];
		$navigation_links = [];
		$footer_links = [];

		$markerID = intval($marker->nid->value);

		// marker map:
		$markerMap = Node::load($marker->get('field_map')[0]->target_id);

		// Load the current theme

		$themeMarkers = [];
		foreach ($current_theme->get('field_markers')->referencedEntities() as $item) {
			// only add if marker can be rendered.
			$addMarker = ZSLH::validMarker($item);

			if ($addMarker) {
				$themeMarkers[] = $item->nid->value;
			}

		}

		// link to theme?
		if (in_array($markerID, $themeMarkers)) {
			$header_links[] = [
				'label' => $current_theme->getTitle(),
				'link' => null,
				'onclick' => 'window.timeline.showThemeInfo()',
				'class' => 'theme-breadcrumb'
			];
		}

		// map link
		$header_links[] = [
			'label' => $markerMap->getTitle(),
			'link' => null,
			'onclick' => 'window.timeline.showMapInfo()',
			'class' => 'year-breadcrumb'
		];

		// set the nav based on current theme...
		if (in_array($markerID, $themeMarkers)) {

			$markerIndex = array_search($marker->nid->value, $themeMarkers);
			// is there a previous?
			if ($markerIndex > 0) {
				$navigation_links[] = [
					'label' => 'Previous',
					'link' => null,
					'onclick' => 'window.timeline.showAjaxMarker(' . $themeMarkers[$markerIndex - 1] . ')',
					'class' => 'marker-button previous-button'
				];
			}
			// is there a next?
			if ($markerIndex + 1 < count($themeMarkers)) {
				$navigation_links[] = [
					'label' => 'Next',
					'link' => null,
					'onclick' => 'window.timeline.showAjaxMarker(' . $themeMarkers[$markerIndex + 1] . ')',
					'class' => 'marker-button next-button'
				];
			} else {
				// show all themes button
				$navigation_links[] = [
					'label' => 'All Themes',
					'link' => null,
					'onclick' => 'window.timeline.showThemePicker()',
					'class' => 'marker-button next-button'
				];
			}
		} else {
		
			$thisMarker = Node::load($markerID);
			$markerData = self::get_marker_data($thisMarker);

			$header_links[] = [
				'label' => 'This marker is part of the "' . $markerData['theme_title']  . '" theme. Explore this theme.',
				'link' => null,
				'onclick' => 'window.timeline.resetMap('. $markerData['map_id'] .'); window.timeline.pickTheme(' . $markerData['theme_id'] . ');',
				'class' => 'not-in-theme'
			];
		}

		// is there a quiz on the theme?
		if (!$current_theme->get('field_theme_quiz')->isEmpty()) {
			$header_links[] = [
				'label' => 'Theme Quiz',
				'link' => null,
				'onclick' => 'window.timeline.showQuizModal()',
				'class' => 'quiz-breadcrumb'
			];
		}



		$build = [
			'#theme' => 'historical_timeline_marker_side_panel',
			'#content_vars' => [
				'title' => $marker->getTitle(),
				'header_links' => $header_links,
				'navigation_links' => $navigation_links,
				'footer_links' => $footer_links,
				'content' => \Drupal::service('renderer')->renderRoot($marker->get('field_description')->view("full"))
			]
		];

		$rendered = \Drupal::service('renderer')->renderRoot($build);

		$response = new AjaxResponse();

		$selector = "#main-sidebar";

		$response->addCommand(
			new HtmlCommand(
				$selector,
				$rendered
			)
		);


		return $response;
	}



	public function get_marker_data($node)
	{
		$resultArray = [];

		if (empty($node)) {
			return false;
		}
		if ($node->getType() !== 'marker') {
			return new JsonResponse($resultArray);
		}


		$resultArray['id'] = $node->id();
		$resultArray['title'] = $node->getTitle();

		$resultArray['map_id'] = $node->get('field_map')->target_id;
		$resultArray['position_horizontal'] = $node->get('field_position_horizontal')->value;
		$resultArray['position_vertical'] = $node->get('field_position_vertical')->value;


		if (isset($node->get('field_marker_icon')->getValue()[0]['target_id'])) {
			$image_uri = $node->get('field_marker_icon')->entity->field_media_image->entity->getFileUri();

			$style = ImageStyle::load('map_icon');
			$image_url = $style->buildUrl($image_uri);

			$resultArray['icon_url'] = $image_url;

			// colour
			if ($node->get('field_marker_type')->getValue()) {

				$term = \Drupal::entityTypeManager()->getStorage('taxonomy_term')->load($node->get('field_marker_type')->target_id);

				$resultArray['icon_type'] = $term->name->value;
				$resultArray['icon_colour'] = $term->get('field_marker_colour')->color;
			}
		}

		// what theme is this marker on?
		$query = \Drupal::entityQuery('node')
			->condition('type', 'theme')
			->condition('status', 1)
			->condition('field_markers', $node->id())
			->accessCheck(FALSE);

		$results = $query->execute();

		$resultArray['theme_id'] = current($results);
		if($resultArray['theme_id']){

			$resultArray['theme_title'] = Node::load($resultArray['theme_id'])->getTitle();
		}
		


		return $resultArray;
	}

	public function get_data()
	{

		$resultArray["themes"] = self::get_all_themes();
		$resultArray["maps"] = self::get_all_maps();
		$resultArray["markers"] = self::get_all_markers();
		// TODO - not surrently used. 
		$resultArray["marker_types"] = ZSLH::get_marker_types();

		return new JsonResponse($resultArray);
	}

	public function load_quiz_modal(NodeInterface $quiz)
	{

		return [
			"#theme" => 'historical_timeline_quiz',
			"#quiz" => $quiz 
		];
	}

	public function load_score_modal(NodeInterface $quiz, int $score) {

		$thresholds = $quiz->get("field_score_thresholds")->referencedEntities();

		$scoreMapping = [];

		foreach ($thresholds as $threshold){

			$minScore = $threshold->get("field_lower_limit")->value;

			$message = \Drupal::service('renderer')->renderRoot($threshold->get("field_score_message")->view("full"));

			$scoreMapping[$minScore] = $message;
			
		}

		ksort($scoreMapping);

		$message = null;

		foreach($scoreMapping as $lowerLimit => $thresholdMessage){

			if($score >= intval($lowerLimit)){

				$message = $thresholdMessage;

				$message.= "<div class='quiz-score-buttons-wrapper'><button class='theme-info-button-start primary-button ' onclick='window.timeline.restartQuiz()' >Start over</button> <button class='theme-info-button-start primary-button' onclick='window.timeline.showThemePicker()'>Show all themes</button></div>";

			}

		}

		return new Response($message);

	}

	public function timeline()
	{

		return [
			"#theme" => 'historical_timeline'
		];
	}
}
