# Octophin Drupal project

This is the code repository for the default Octophin Drupal template. 

## Requirements

* PHP
* Composer
* Node.js
* npm 
* MySQL

## Installation / update instructions

As these need to be run often, there's a bash script that runs all of them. Simply run the `update` file in the root folder (`./update`)

### Installing for the first time

When installing for the first time, you will need to run the install from config Drupal installation. 

#### Prerequisites

* your hosts file must have a record for the local domain pointing to the /web folder

#### Install Process

* From /var/www clone the git project `git clone [clone link]`
* Temporarily set the file ownership to www-data: `sudo chown -R www-data:www-data [git repo name]`
* Copy the `default.settings.php` file in `web/sites/default` to `settings.php` and in this `settings.php` file add `$settings["config_sync_directory"] = "../config/sync";`
* Install the required files: `cd [git repo name]; composer install`
* Visit the domain in your browser to do the Drupal setup. On the profile setup page, select `use existing config` to install from the config in the git project 
* Reset the ownership to `[user]:www-data`

### Exporting configuration

To export configuration so that it can be updated in git, run: `/vendor/bin/drush config:export`

### Watching stylesheet / compiling scss 

To compile changes in scss into the css, run the following in the root folder of the project (remember to run `npm install` for the first time as above if you haven't done dependencies):
`npx webpack`
