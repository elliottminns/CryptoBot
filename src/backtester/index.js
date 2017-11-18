const Candlestick = require('candlestick')
const StrategyFactory = require('strategies/factory')
const Average = require('strategies/movingAverage')

class Backtester {
  constructor({ start, end, period, interval, gdax, product, strategy }) {
    this.startTime = start
    this.endTime = end
    this.period = period
    this.interval = interval
    this.exchange = gdax
    this.client = gdax.client
    this.client.productID = product
    this.product = product
    this.strategyType = strategy
  }

  async start() {
      try {
    const history = await this.client.getProductHistoricRates({
      granularity: this.interval,
      start: this.startTime,
      end: this.endTime
    })
    this.candlesticks = history.map(stick => {
      return new Candlestick({
        startTime: new Date(stick[0] * 1000),
        low: stick[1],
        high: stick[2],
        open: stick[3],
        close: stick[4],
        interval: this.interval
      })
    }).reverse()
    this.strategy = StrategyFactory.create({
      type: this.strategyType,
      period: this.period,
      onBuySignal: (price) => { this.onBuySignal(price) },
      onSellSignal: (price) => { this.onSellSignal(price) }
    })

    const length = this.candlesticks.length
    for (let i = 0; i < length; i++) {
      const tick = this.candlesticks[i]
      const ticks = this.candlesticks.slice(0, i + 1)
      this.currentTime = tick.startTime
      await this.strategy.run({ ticks, time: tick.startTime })
    }

    const trades = this.strategy.trades
    trades.forEach(trade => {
      trade.print()
    })
    } catch (error) {
      console.log(error)
    }
  }

  async onBuySignal(price) {
    this.strategy.positionOpened({ price, time: this.currentTime })
  }

  async onSellSignal(price) {
    this.strategy.positionClosed({ price, time: this.currentTime })
  }
}

module.exports = exports = Backtester
