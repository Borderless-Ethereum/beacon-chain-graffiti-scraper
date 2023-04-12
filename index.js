const axios = require('axios')
const express = require('express')
const mongoose = require('mongoose')
const sleep = require('util').promisify(setTimeout)

const app = express()
const port = 3000

const APIKEY = process.env.API_KEY

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
    exec_block_hash: String,
    exec_block_number: Number
  })

  return mongoose.model('slots', slot)
}

async function getEpochSlots(epoch = 'finalized') {
  console.log('\nretrieving data for', epoch)

  const url = `https://beaconcha.in/api/v1/epoch/${epoch}/slots?apikey=${APIKEY}`

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
      exec_block_hash: s.exec_block_hash,
      exec_block_number: s.exec_block_number
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
  let csv = '"Epoch","Slot","Graffiti","Proposer","Fee Recipient,Exec Block Hash,Exec Block Number"\n'

  try {
    const query = epoch != undefined && !isNaN(epoch) ? { epoch } : {}

    data = await slots.find(query)

    console.log('exporting data, epoch: ', epoch)

    csv += data
      .map(
        (slot) => ([
          `"${slot.epoch}"`,
          `"${slot.slot_number}"`,
          `"${slot.graffiti.replace(/"/g, '"')}"`,
          `"${slot.proposer}"`,
          `"${slot.exec_fee_recipient}"`,
          `"${slot.exec_block_hash}"`,
          `"${slot.exec_block_number}"`
        ]).join(',')
      ).join('\n')
  } catch (err) {
    console.log(err)
  }

  return csv
}

const slots = getDbModel()

async function getLastSynchedEpoch() {
  const lastSyncedEpoch = slots.findOne({})
    .sort({ epoch: 'desc' })
    .exec()

  return lastSyncedEpoch
}

async function getLatestFinalizedEpochNumber() {
  const url = `https://beaconcha.in/api/v1/epoch/finalized?apikey=${APIKEY}`

  let res = {}

  try {
    res = await axios.get(url)
  } catch (e) {
    console.error(e.code, url)
  }

  const data = res && res.data && res.data.data

  return data.epoch
}

async function syncSlotsToDb(from, to, data = []) {
  if (from > to) {
    console.log('\n completed sync')

    return data
  }

  const graffiti = await getEpochSlots(from)

  data = [ ...data, ...graffiti ]

  try {
    slots.insertMany(graffiti)
  } catch (e) {
    console.error(e)
  }

  from = from == 'finalized' ? graffiti[0].epoch : from

  from++

  await sleep(1000)

  return await syncSlotsToDb(from, to, data)
}

app.get('/sync', async (req, res) => {
  let lastSyncedEpoch, latestFinalizedEpochNumber, results

  const now = new Date().toUTCString()

  console.log('\nsyncing DB at:', now)

  // first get last known sync point from DB
  try {
    const lastSyncedSlot = await getLastSynchedEpoch()

    lastSyncedEpoch = lastSyncedSlot ? lastSyncedSlot.epoch : 'finalized'

    console.log('\nlast synced epoch', lastSyncedEpoch)
  } catch(e) {
    console.error('\nerror getting last known sync point from DB:', e.message)

    res.send(e)

    return
  }

  // then get the number of the last finalized epoch
  try {
    latestFinalizedEpochNumber = await getLatestFinalizedEpochNumber()
  } catch(e) {
    console.error('\nerror getting the number of the last finalized epoch:', e.message)

    res.send(e)

    return
  }

  // iterate over each epoch until the last finalized one
  try {
    results = await syncSlotsToDb(lastSyncedEpoch, latestFinalizedEpochNumber)
  } catch(e) {
    console.error('\nerror iterating over each epoch until the last finalized one:', e.message)

    res.send(e)

    return
  }

  res.send(results)
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
