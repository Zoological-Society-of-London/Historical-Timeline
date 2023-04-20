# Historical Timeline

This is the code repository for the Historical Timeline project, originally built for ZSL London Zoo by Octophin Digital. The original version can be seen at [The Timetravellers Guide to London Zoo](https://www.londonzoo.org/zoo-stories/history-of-london-zoo/time-travel)

It is a Drupal 9 project with a full configuration set, theme and custom content types.

## Features

* Multiple historical maps to explore over time
* A system for setting up content for specific markers and placing them in themes
* A quiz system per theme

## Requirements

* Apache 2 or Nginx webserver
* PHP
* Composer
* Node.js
* npm 
* MySQL

### Installing for the first time

When installing for the first time, you will need to run the install from config Drupal installation. 

#### Prerequisites

* your hosts file must have a record for the local domain pointing to the /web folder

#### Install Process

* Temporarily set the file ownership to www-data: `sudo chown -R www-data:www-data [git repo name]`
* Copy the `default.settings.php` file in `web/sites/default` to `settings.php` and in this `settings.php` file add `$settings["config_sync_directory"] = "../config/sync";`
* Install the required files: `cd [git repo name]; composer install`
* Visit the domain in your browser to do the Drupal setup. On the profile setup page, select `use existing config` to install from the config in the git project 
* Reset the ownership to `[user]:www-data`

### Exporting configuration

To export configuration so that it can be updated in git, run: `/vendor/bin/drush config:export`

### Compiling scss and JavaScript 

To compile changes in scss into the css, run the following in the root folder of the project (remember to run `npm install` for the first time as above if you haven't done dependencies):
`npx webpack`
