const Candlestick = require('candlestick')
const StrategyFactory = require('strategies/factory')
const randomToken = require('random-token')
const uuidv1 = require('uuid/v1');

class Trader {
  constructor({ product, gdax, amount = 0.01, interval, period = 30, isLive = false, strategy }) {
    this.product = product
    this.exchange = gdax
    this.client = gdax.client
    this.client.productID = product
    this.interval = interval
    this.period = period
    this.amount = amount
    this.isLive = isLive
    this.strategyType = strategy
    this.state = 'initializing'
    this.tokens = {}
  }

  async start() {
    if (this.isLive) {
      console.log('Heads up, we are running live')
    }
    console.log(`Running trader with strategy: ${this.strategyType} for amount: ${this.amount}`)

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
        volume: stick[5],
        interval: this.interval
      })
    }).reverse()
    this.orders = await this.client.getOrders().then((orders) => {
      return orders.reduce((d, o) => {
        d[o.side][o.id] = o
        return d
      }, { buy: {}, sell: {}})
    })
    this.fills = await this.client.getFills()
    this.strategy = StrategyFactory.create({
      type: this.strategyType,
      period: this.period,
      ticks: this.candlesticks,
      onBuySignal: (price) => { this.onBuySignal(price) },
      onSellSignal: (price) => { this.onSellSignal(price) }
    })
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
    this.userFeed = await this.exchange.userFeed({
      product: this.product,
      onUpdate: async data => {
        await this.onUserUpdate(data)
      },
      onError: this.onUserFeedError
    })
    // Set State
  }

  async onTick(data) {
    try {
    console.log(`Time: ${new Date}    Price: ${data.price}`)
    if (!this.currentCandle) {
      this.currentCandle = new Candlestick({
        price: parseFloat(data.price),
        volume: parseFloat(data.volume),
        interval: this.interval
      })
    } else {
      this.currentCandle.onPrice({
        p: parseFloat(data.price),
        v: parseFloat(data.volume)
      })
    }
    const ticks = this.candlesticks.slice()
    ticks.push(this.currentCandle)
    await this.strategy.run({
      ticks: ticks,
      time: new Date()
    })

    this.strategy.trades.forEach(t => t.print())

    if (this.currentCandle.state === 'closed') {
      const candle = this.currentCandle
      this.currentCandle = null
      this.candlesticks.push(candle)
    }
    } catch (err) {
      console.log(err)
    }
  }

  async onUserUpdate(data) {
    var side
    var orderId
    switch (data.type) {
    case 'received':
      const clientId = data['client_oid']
      orderId = data['order_id']
      side = data['side']
      if (this.tokens[clientId] === side) {
        this.orders[side][orderId] = data
      }
      break;
    case 'match':
      orderId = data['taker_order_id']
      side = data['side'] === 'sell' ? 'buy' : 'sell'

      const price = parseFloat(data['price'])
      const time = new Date(data['time'])

      if (this.orders[side][orderId]) {
        if (side === 'sell') {
          this.strategy.positionClosed({ price, time })
          this.selling = false
        } else {
          this.strategy.positionOpened({ price, time })
          this.buying = false
        }
      }
      break
      default: break
    }
  }

  async onUserFeedError(error) {
  }

  async onTickerError(error) {
  }

  async onBuySignal(price) {
    if (this.buying) { return }
    this.buying = true
    try {
      const token = uuidv1()
      this.tokens[token] = 'buy'
      const buyParams = {
        size: this.amount,
        product_id: this.product,
        type: 'market',
        client_oid: token
      }
      if (this.isLive) {
        const order = await this.client.buy(buyParams)
        if (order.message) {
          throw new Error(order.message)
        }
      } else {
        this.strategy.positionOpened({ price, time: new Date() })
        this.buying = false
      }
    } catch (error) {
      console.log(error)
      this.buying = false
    }
  }

  async onSellSignal(price) {
    if (this.selling) { return }
    this.selling = true
    try {
      const token = uuidv1()
      this.tokens[token] = 'sell'
      const sellParams = {
        size: this.amount,
        product_id: this.product,
        type: 'market',
        client_oid: token
      }
      if (this.isLive) {
        const order = await this.client.sell(sellParams)
        if (order.message) {
          throw new Error(order.message)
        }
      } else {
        this.strategy.positionClosed({ price, time: new Date() })
        this.selling = false
      }
    } catch (error) {
      console.log(error)
      this.selling = false
    }
  }
}

module.exports = exports = Trader
