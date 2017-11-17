const Candlestick = require('candlestick')
const StrategyFactory = require('strategies/factory')

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
      ticks: [],
      onBuySignal: (price) => { this.onBuySignal(price) },
      onSellSignal: (price) => { this.onSellSignal(price) }
    })

    this.candlesticks.forEach(async tick => {
      this.currentTime = tick.startTime
      await this.strategy.onTick({ tick, time: tick.startTime })
    })

    const trades = this.strategy.trades
    trades.forEach(trade => {
      trade.print()
    })
  }

  async onBuySignal(price) {
    this.strategy.positionOpened({ price, time: this.currentTime })
  }

  async onSellSignal(price) {
    this.strategy.positionClosed({ price, time: this.currentTime })
  }
}

module.exports = exports = Backtester
