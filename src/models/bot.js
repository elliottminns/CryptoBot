const mongoose = require('mongoose')
const { Schema } = require('mongoose')

const BotSchema = new Schema({
  name: {
    type: String,
    required: true,
    index: {
      unique: true
    }
  },
  type: {
    type: String,
    enum: ['trader'],
    required: true
  },
  product: {
    type: String,
    required: true
  },
  strategy: {
    type: String
  },
  period: {
    type: Number
  },
  amount: {
    type: Number
  },
  interval: {
    type: Number
  },
  isLive: {
    type: Boolean,
    required: true
  }
})

BotSchema.statics.botWithData = async function({
  name, product, strategy, period, amount, interval, isLive
}) {
  const bot = await Bot.findOneAndUpdate({
    name, product, strategy, period, amount, interval, isLive }, {}, {
      new: true,
      runValidators: true,
      upsert: true
    })

  return bot
}

BotSchema.statics.botWithName = async function(name) {
  const bot = await Bot.findOne({ name })
  if (bot) { return bot }
}

const Bot = mongoose.model('Bot', BotSchema)

module.exports = exports = Bot
