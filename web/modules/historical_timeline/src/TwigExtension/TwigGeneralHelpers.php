<?php

namespace Drupal\historical_timeline\TwigExtension;


use Drupal\node\Entity\Node;
use Twig\Extension\AbstractExtension;
use Twig\TwigFunction; 


use Drupal\historical_timeline\Helpers as ZSLH;


class TwigGeneralHelpers extends AbstractExtension 
{
    public function getName()
    {
        return 'historical_timeline.twig_general_helpers';
    }

    public function getFunctions()
    {
        return [
            new TwigFunction('get_map_buttons', [$this, 'get_map_buttons']),

        ];
    }

    
    public function get_map_buttons()
    {   
        $maps = ZSLH::get_maps();



        return ZSLH::get_maps();
    }




}