# Beacon Chain Graffiti Scraper

Simple script to scrape graffiti fields from beacon chain blocks

## Usage:

Sync beacon chain slots for latest epoch - writes slots into database

    curl -s http://localhost:3000/sync

Export all slots that are stored in the database in CSV format

    curl -s http://localhost:3000/slots

Export all slots for a specified epoch in CSV format

    curl -s http://localhost:3000/slots/<epoch_number>
