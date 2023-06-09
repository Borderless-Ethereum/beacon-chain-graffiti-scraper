const axios = require('axios')
const mongoose = require('mongoose')
const Scraper = require('./scraper')

jest.mock('axios')
jest.mock('mongoose')

describe('Graffiti Scraper', () => {
  let scraper

  beforeAll(async () => {
    mongoose.connect.mockReturnValue(Promise.resolve())
    mongoose.connection = { once: () => ({}) }

    scraper = new Scraper(
      3000,
      'abcdef12345',
      'mongodb://mongo:27017/slots',
      'https://beaconcha.in/api/v1/epoch'
    )

    await scraper.start()
  })

  beforeEach(() => {
    jest.spyOn(console, 'log').mockImplementation(() => {})
    jest.spyOn(console, 'error').mockImplementation(() => {})
  })

  test('should create a new Scraper instance', () => {
    expect(scraper).toBeInstanceOf(Scraper)
  })

  test('should return a mongoose model for the "slots" collection', () => {
    const collection = {
      collectionName: 'slots',
      findOne: jest.fn(),
      insertMany: jest.fn(),
    }

    const model = { model: jest.fn(() => collection) }

    mongoose.connect.mockReturnValue(Promise.resolve())
    mongoose.connection = { once: () => ({}) }
    mongoose.Schema.mockReturnValue({})
    mongoose.model.mockReturnValue(model)

    expect(mongoose.connect).toHaveBeenCalledWith('mongodb://mongo:27017/slots', {
      useUnifiedTopology: true,
      useNewUrlParser: true,
    })
  })

  test('should retrieve slot data for the specified epoch', async () => {
    const epoch = 1

    const data = {
      data: {
        data: [
          {
            epoch: 1,
            slot: 1,
            graffiti_text: 'foo',
            exec_fee_recipient: 'bar',
            proposer: 0,
            exec_block_hash: '',
            exec_block_number: 0,
          },
          {
            epoch: 2,
            slot: 2,
            graffiti_text: '',
            exec_fee_recipient: '',
            proposer: 1,
            exec_block_hash: '',
            exec_block_number: 0,
          },
        ],
      },
    }

    axios.get.mockResolvedValueOnce(data)

    const result = await scraper.getEpochSlots(epoch)

    expect(result).toHaveLength(2)
    expect(result[0]).toHaveProperty('epoch', epoch)
    expect(result[0]).toHaveProperty('slot_number', 1)
    expect(result[0]).toHaveProperty('graffiti', 'foo')
    expect(result[0]).toHaveProperty('exec_fee_recipient', 'bar')
    expect(result[0]).toHaveProperty('proposer', 0)
    expect(result[0]).toHaveProperty('exec_block_hash', '')
    expect(result[0]).toHaveProperty('exec_block_number', 0)
  })

  test('should retrieve slot data for all epochs if no epoch is specified', async () => {
    const data = [
      {
        epoch: 1,
        slot_number: 1,
        graffiti: 'foo',
        proposer: 0,
        exec_fee_recipient: 'bar',
        exec_block_hash: '',
        exec_block_number: 0,
      },
      {
        epoch: 1,
        slot_number: 2,
        graffiti: '',
        proposer: 1,
        exec_fee_recipient: '',
        exec_block_hash: '',
        exec_block_number: 0,
      },
      {
        epoch: 2,
        slot_number: 1,
        graffiti: 'baz',
        proposer: 2,
        exec_fee_recipient: 'qux',
        exec_block_hash: '',
        exec_block_number: 0,
      },
    ]

    const find = () => {
      return new Promise((resolve) => {
        resolve(data)
      })
    }

    const collection = { find, findOne: jest.fn() }
    const model = { model: jest.fn(() => collection) }

    mongoose.connect.mockReturnValue(Promise.resolve())
    mongoose.connection = { once: () => ({}) }
    mongoose.Schema.mockReturnValue({})
    mongoose.model.mockReturnValue(model)

    scraper.slots = scraper.slots ? { ...scraper.slots, find } : { find }

    const result = await scraper.getSlotData()

    expect(result).toContain(
      '"Epoch","Slot","Graffiti","Proposer","Fee Recipient","Exec Block Hash","Exec Block Number","Exec Block Timestamp"\n'
    )

    expect(result).toContain('"1","1","foo","0","bar","","0"')
    expect(result).toContain('"1","2","","1","","","0"')
    expect(result).toContain('"2","1","baz","2","qux","","0"')
  })

  test('should retrieve slot data for the specified epoch', async () => {
    const epoch = 1

    const data = [
      {
        epoch: 1,
        slot_number: 1,
        graffiti: 'foo',
        proposer: 0,
        exec_fee_recipient: 'bar',
        exec_block_hash: '',
        exec_block_number: 0,
      },
      {
        epoch: 1,
        slot_number: 2,
        graffiti: '',
        proposer: 1,
        exec_fee_recipient: '',
        exec_block_hash: '',
        exec_block_number: 0,
      },
    ]

    const find = (epoch) => {
      findCalled = epoch
      return new Promise((resolve) => {
        resolve(data)
      })
    }

    const collection = { find, findOne: jest.fn() }
    const model = { model: jest.fn(() => collection) }

    mongoose.connect.mockReturnValue(Promise.resolve())
    mongoose.connection = { once: () => ({}) }
    mongoose.Schema.mockReturnValue({})
    mongoose.model.mockReturnValue(model)

    let findCalled

    scraper.slots = scraper.slots ? { ...scraper.slots, find } : { find }

    const result = await scraper.getSlotData(epoch)

    expect(result).toMatch(
      /^"Epoch","Slot","Graffiti","Proposer","Fee Recipient","Exec Block Hash","Exec Block Number","Exec Block Timestamp"\n/
    )
    expect(result).toContain('"1","1","foo","0","bar","","0"')
    expect(result).toContain('"1","2","","1","","","0"')
    expect(findCalled.epoch).toEqual({ $gte: 1 })
  })

  test('should return the epoch number of the last synced slot', async () => {
    const data = { epoch: 1 }

    const findOne = jest.fn(() => ({
      sort: () => ({
        exec: () => Promise.resolve(data),
      }),
    }))

    const collection = { findOne, insertMany: jest.fn() }
    const model = { model: jest.fn(() => collection) }

    mongoose.connect.mockReturnValue(Promise.resolve())
    mongoose.connection = { once: () => ({}) }
    mongoose.Schema.mockReturnValue({})
    mongoose.model.mockReturnValue(model)

    scraper.slots = scraper.slots ? { ...scraper.slots, findOne } : { findOne }

    const result = await scraper.getLastSynchedEpoch()

    expect(result).toMatchObject({ epoch: data.epoch })
    expect(findOne).toHaveBeenCalled()
  })

  test('should retrieve the epoch number of the latest finalized epoch', async () => {
    const data = { data: { data: { epoch: 1 } } }

    axios.get.mockResolvedValueOnce(data)

    const result = await scraper.getLatestFinalizedEpochNumber()

    expect(result).toBe(data.data.data.epoch)
    expect(axios.get).toHaveBeenCalledWith(
      `https://beaconcha.in/api/v1/epoch/finalized?apikey=abcdef12345`
    )
  })

  test('should sync slot data for all epochs between the "from" and "to" epochs', async () => {
    const from = 1
    const to = 2

    const data1 = [
      {
        epoch: 1,
        slot: 1,
        graffiti_text: 'foo',
        proposer: 0,
        exec_fee_recipient: 'bar',
        exec_block_hash: '',
        exec_block_number: 0,
        exec_timestamp: 12345678,
      },
      {
        epoch: 1,
        slot: 2,
        graffiti_text: '',
        proposer: 1,
        exec_fee_recipient: '',
        exec_block_hash: '',
        exec_block_number: 0,
        exec_timestamp: 12345678,
      },
    ]

    const data2 = [
      {
        epoch: 2,
        slot: 3,
        graffiti_text: 'baz',
        proposer: 2,
        exec_fee_recipient: 'qux',
        exec_block_hash: '',
        exec_block_number: 0,
        exec_timestamp: 12345678,
      },
      {
        epoch: 2,
        slot: 4,
        graffiti_text: 'quux',
        proposer: 3,
        exec_fee_recipient: 'corge',
        exec_block_hash: '',
        exec_block_number: 0,
        exec_timestamp: 12345678,
      },
    ]

    const graffiti1 = [
      {
        epoch: 1,
        slot_number: 1,
        graffiti: 'foo',
        proposer: 0,
        exec_fee_recipient: 'bar',
        exec_block_hash: '',
        exec_block_number: 0,
        exec_timestamp: 12345678,
      },
      {
        epoch: 1,
        slot_number: 2,
        graffiti: '',
        proposer: 1,
        exec_fee_recipient: '',
        exec_block_hash: '',
        exec_block_number: 0,
        exec_timestamp: 12345678,
      },
    ]

    const graffiti2 = [
      {
        epoch: 2,
        slot_number: 3,
        graffiti: 'baz',
        proposer: 2,
        exec_fee_recipient: 'qux',
        exec_block_hash: '',
        exec_block_number: 0,
        exec_timestamp: 12345678,
      },
      {
        epoch: 2,
        slot_number: 4,
        graffiti: 'quux',
        proposer: 3,
        exec_fee_recipient: 'corge',
        exec_block_hash: '',
        exec_block_number: 0,
        exec_timestamp: 12345678,
      },
    ]

    const insertMany = jest.fn()
    const collection = { findOne: jest.fn(), insertMany }

    scraper.slots = scraper.slots ? { ...scraper.slots, insertMany } : { insertMany }

    const model = { model: jest.fn(() => collection) }

    axios.get.mockResolvedValueOnce({ data: { data: data1 } })
    axios.get.mockResolvedValueOnce({ data: { data: data2 } })

    mongoose.connect.mockReturnValue(Promise.resolve())
    mongoose.connection = { once: () => ({}) }
    mongoose.Schema.mockReturnValue({})
    mongoose.model.mockReturnValue(model)

    const result = await scraper.syncSlotsToDb(from, to)

    expect(result).toHaveLength(4)
    expect(result).toEqual([...graffiti1, ...graffiti2])
    // expect(insertMany).toHaveBeenCalledTimes(2)
  })
})
