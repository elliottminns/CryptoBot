const SimpleCCI = require('strategies/simpleCCI')
const Candlestick = require('candlestick')
const StrategyFactory = require('strategies/factory')

class Trader {
  constructor({ product, gdax, interval, period = 30, isLive = false, strategy }) {
    this.product = product
    this.exchange = gdax
    this.client = gdax.client
    this.client.productID = product
    this.interval = interval
    this.period = period
    this.isLive = isLive
    this.strategyType = strategy
  }

  async start() {
    if (this.isLive) {
      console.log('Heads up, we are running live')
    }
    console.log(`Running trader with strategy: ${this.strategyType}`)

    this.accounts = await this.client.getAccounts()
    const history = await this.client.getProductHistoricRates({
      granularity: this.interval
    })
    this.candlesticks = history.map(stick => {
      return new Candlestick({
        startTime: new Date(stick[0]),
        low: stick[1],
        high: stick[2],
        open: stick[3],
        close: stick[4],
        interval: this.interval
      })
    }).reverse()
    this.orders = await this.client.getOrders()
    this.fills = await this.client.getFills()
    this.strategy = StrategyFactory.create({
      type: this.strategyType,
      period: this.period,
      ticks: this.candlesticks,
      onBuySignal: (price) => { this.onBuySignal(price) },
      onSellSignal: (price) => { this.onSellSignal(price) }
    })
    await this.strategy.initialize()
    // Start Ticker
    this.ticker = await this.exchange.ticker({
      product: this.product,
      onTick: async data => {
        await this.onTick(data)
      },
      onError: this.onTickerError
    })
    // Start OrderBook
    // Start User Feed
    // Set State
  }

  async onTick(data) {
    console.log(`Time: ${new Date}    Price: ${data.price}`)
    if (!this.currentCandle) {
      this.currentCandle = new Candlestick({
        price: parseFloat(data.price),
        interval: this.interval
      })
    } else {
      this.currentCandle.onPrice(parseFloat(data.price))
      if (this.currentCandle.state === 'closed') {
        const candle = this.currentCandle
        this.currentCandle = null
        this.candlesticks.push(candle)
        await this.strategy.onTick({ tick: candle, time: new Date() })
        this.strategy.trades.forEach(t => t.print())
      }
    }
  }

  async onTickerError(error) {
  }

  async onBuySignal(price) {
    try {
      const buyParams = {
        size: 0.001,
        product_id: this.product
      }
      if (this.isLive) {
        await this.client.buy(buyParams)
      }
      this.strategy.positionOpened({ price, time: new Date() })
    } catch (error) {
      console.log(error)
    }
  }

  async onSellSignal(price) {
    try {
      const sellParams = {
        size: 0.001,
        product_id: this.product
      }
      if (this.isLive) {
        await this.client.sell(sellParams)
      }
      this.strategy.positionClosed({ price, time: new Date() })
    } catch (error) {
      console.log(error)
    }
  }
}

module.exports = exports = Trader
