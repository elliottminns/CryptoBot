const Trade = require('trade')
const TradeModel = require('models/trade')

class Strategy {
  constructor({ period, onBuySignal, onSellSignal, bot, isLive = false }) {
    this.trades = []
    this.period = period
    this.onBuySignal = onBuySignal
    this.onSellSignal = onSellSignal
    this.isLive = isLive
    this.bot = bot
    this.maxActiveTrades = 1
  }

  async positionOpened({ price, time, amount, order }) {
    console.log('BUY ORDER')
    var model
    if (this.bot) {
      model = await TradeModel.create({
        state: 'open',
        bot: this.bot,
        enter: { time, amount, order, price }
      })
    }
    this.trades.push(new Trade({ price, time, model, amount }))
  }

  async positionClosed({ price, time, amount, order }) {
    console.log('SELL ORDER')
    const openTrades = this.trades.filter(t => t.state === 'open')
    openTrades.forEach(async t => {
      var model
      if (this.bot) {
        model = t.model
        model.exit = { time, amount, order, price }
        model = await model.save()
      }
      t.close({ price, time, model, amount })
    })
  }
}

module.exports = exports = Strategy

