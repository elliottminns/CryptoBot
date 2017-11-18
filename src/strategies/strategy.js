const Trade = require('trade')

class Strategy {
  constructor({ period, onBuySignal, onSellSignal }) {
    this.trades = []
    this.period = period
    this.onBuySignal = onBuySignal
    this.onSellSignal = onSellSignal
    this.maxActiveTrades = 1
  }

  positionOpened({ price, time }) {
    console.log('BUY ORDER')
    this.trades.push(new Trade({ price, time }))
  }

  positionClosed({ price, time }) {
    console.log('SELL ORDER')
    const openTrades = this.trades.filter(t => t.state === 'open')
    openTrades.forEach(t => {
      t.close({ price, time })
    })
  }
}

module.exports = exports = Strategy

