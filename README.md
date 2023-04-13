# Beacon Chain Graffiti Scraper

This is a simple script to scrape graffiti fields from beacon chain blocks.  This script is intended to run as a daemon / service that runs in the background.  It should be pinged at regular intervals to perform a sync, and can be subsequently used to bulk export the scraped data in CSV format for analysis. It uses the [beaconcha.in](https://beaconcha.in/) API to retrieve data.

----

## Setting up:

First install the dependencies: `npm install` and then boot it up by simply runing: `npm start`.

Then you need to add configuration parameters by creating a file in the root of the project called `.env`.  This file shoudl contain the following configuration parameters (where API_KEY is your beaconcha.in API key):

```
API_KEY=abcde12345
PORT=3000
DB_CONNECT_STRING=mongodb://localhost:27017/slots
API_BASE_URL=https://beaconcha.in/api/v1/epoch
```

If you are running locally, make sure that these parameters are set as environment variables.

### Using Docker Compose:

If you are running docker-compose, make sure your DB connection string is set to:

    mongodb://mongo:27017/slots

Change in to the root folder and run: `docker-compose up -d`

----

## Usage:

To run the app, change into the root folder and run `npm start`.  This boots up a web server which exposes a simple API. By default, the server listens on port 3000.

Note: make sure you have MongoDB installed and running and the connection string is in the configuration file.

Once the web server is running you can synchronize the data from the remote API to the DB instance, and you can query the DB to export data in CSV format.

This service is intended to be invoked via a cron job at regular intervals, e.g. once per slot (i.e. every 12 seconds) or once per minute.  A crontab entry could be something like:

    * * * * * curl -s http://localhost:3000/sync >/dev/null 2>&1

----

## API:

This will start the API on port 3000.

The Scraper API provides the following endpoints:

### GET `/sync`

Syncs slot data from the Beacon Chain API to the database for all epochs between the last synced epoch and the latest finalized epoch. If this is the first run, and the DB is empty, then it simply fetches slots from the last finalized epoch.

Returns an array containing the synced slot data.

### GET `/slots`

Retrieves data from the database for all slots and returns them in CSV format.

Returns the slot data in CSV format.

### GET `/slots/:epoch`

Retrieves data from the database from a specific epoch number onwards until the latest stored epoch, in CSV format.

- `epoch` - The epoch to retrieve data for.

----

## Development:

To run unit tests and code coverage, run the following command, (uses Jest):

    npm test

To run linting on the files, then use this command, which runes eslint on all JavaScript files:

    npm run lint

In order to format the JavaScript files correctly, you can run prettify accross all JS files in order to rewrite them with correct format:

    npm run prettify

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE)