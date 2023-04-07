const axios = require('axios')
const express = require('express')
const mongoose = require('mongoose')

const app = express()
const port = 3000

/**
 * Sets up connection to DB and returns the DB model for storing data for bacon chain slots
 *
 * @return Object mongoose model for slot documents
 */
function getDbModel() {
  const uri = 'mongodb://localhost:27017/slots'

  mongoose.connect(uri, { useUnifiedTopology: true, useNewUrlParser: true })

  const connection = mongoose.connection

  connection.once('open', function () {
    console.log('MongoDB database connection established successfully')
  })

  const Schema = mongoose.Schema

  const slot = new Schema({
    epoch: Number,
    slot_number: Number,
    graffiti: String,
    proposer: Number,
    exec_fee_recipient: String,
  })

  return mongoose.model('slots', slot)
}

const slots = getDbModel()

/**
 * Fetches data for all the slots in a given epoch
 *
 * @param {Number} epoch The epoch to retrieve data for
 * @return Object array of slot objects to be stored in DB
 */
async function getEpochSlots(epoch) {
  const APIKEY = process.env.API_KEY

  const slug = epoch || 'latest'

  console.log('\nretrieving data for', slug)

  const url = `https://beaconcha.in/api/v1/epoch/${slug}/slots?apikey=${APIKEY}`

  let res = {}

  try {
    res = await axios.get(url)
  } catch (e) {
    console.error(e.code, url)
  }

  let data = []

  data = res && res.data && res.data.data

  console.log('retrieved data for', data[0].epoch)

  const graffiti = data
    .filter((s) => s.graffiti_text.length)
    .map((s) => ({
      epoch: s.epoch,
      slot_number: s.slot,
      graffiti: s.graffiti_text,
      exec_fee_recipient: s.exec_fee_recipient,
      proposer: s.proposer,
    }))

  return graffiti
}

/**
 * Retrieves data from DB for either all slots or slots from a specific epoch
 *
 * @param {Number} epoch The epoch to retrieve data for
 * @return String the parsed slot data in CSV format
 */
async function getSlotData(epoch) {
  let csv = '"Epoch", "Slot", "Graffiti", "Proposer", "Fee Recipient"\n'

  try {
    const query = epoch != undefined && !isNaN(epoch) ? { epoch } : {}

    data = await slots.find(query)

    console.log('exporting data, epoch: ', epoch)

    csv += data
      .map(
        (d) =>
          `"${d.epoch}", "${d.slot_number}", "${d.graffiti.replace(/"/g, '"')}", "${
            d.proposer
          }", "${d.exec_fee_recipient}"`
      )
      .join('\n')
  } catch (err) {
    console.log(err)
  }

  return csv
}

app.get('/sync', async (req, res) => {
  const graffiti = await getEpochSlots()

  try {
    slots.insertMany(graffiti)

    res.send(graffiti)
  } catch (e) {
    console.log(e)
    res.send(e)
  }
})

app.get('/slots', async (req, res) => {
  const slotdata = await getSlotData()

  res.set('Content-Type', 'text/csv')

  res.send(slotdata)
})

app.get('/slots/:epoch', async (req, res) => {
  const slotdata = await getSlotData(req.params.epoch)

  res.set('Content-Type', 'text/csv')

  res.send(slotdata)
})

app.listen(port, () => {
  console.log(`Scraper app listening on port ${port}`)
})
