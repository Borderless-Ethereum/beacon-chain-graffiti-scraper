const Scraper = require('./scraper.js')

const API_KEY = process.env.API_KEY
const PORT = process.env.PORT
const DB_CONNECT_STRING = process.env.DB_CONNECT_STRING
const API_BASE_URL = process.env.API_BASE_URL

const scraper = new Scraper(PORT, API_KEY, DB_CONNECT_STRING, API_BASE_URL)

scraper.start()
