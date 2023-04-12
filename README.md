# Beacon Chain Graffiti Scraper

Simple script to scrape graffiti fields from beacon chain blocks.  This script is intended to run as a daemon / service that runs in the background.  It should be pinged at regular intervals to perform a sync, this can be done via cron.

## Usage:

First install the dependencies: `npm install` and then boot it up by simply runing: `npm start`.

This boots up a web server which exposes a simple API.

**Syncing**: This syncs the beacon chain slots from the last recorded finalized epoch that is found in the DB up until and including the latest finalized epoch.  If this is the first run, and the DB is empty, then it simply fetches slots from the last finalized epoch.

    curl -s http://localhost:3000/sync

**Export**: This exports all the slots that are stored in the database in CSV format

    curl -s http://localhost:3000/slots


**Export**: This exports all the slots that are stored in the database in CSV format, but from a specific epoch number onwards

    curl -s http://localhost:3000/slots/:epoch

----

## Development:

To run unit tests and code coverage, run the following command, (uses Jest):

    npm test

To run linting on the files, then use this command, which runes eslint on all JavaScript files:

    npm run lint

In order to format the JavaScript files correctly, you can run prettify accross all JS files in order to rewrite them with correct formet:

    npm run prettify