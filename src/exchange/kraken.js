const config = require('configuration')
const key = config.get('KRAKEN_API_KEY')
const secret = config.get('KRAKEN_API_SECRET')
const KrakenClient = require('kraken-api')
// const kraken = new KrakenClient(key, secret, { timeout: 60000 })
const Candlestick = require('candlestick')
const kraken = 0
module.exports = {
  name: 'Kraken',
  client: kraken,
  supportsShort: true,
  async getAccounts() {
    return kraken.api('Balance')
  },
  ticker: function ({ product, onTick, onError }) {
  },
  userFeed: function ({ product, onUpdate, onError }) {
  },
  async getBalanceForProductPair(pair) {
    const balance = await this.getAccounts().then(d => d.result)
    const products = pair.split('-')
    return products.reduce((d, p) => {
      var amount = '0.00000'
      switch (p) {
        case 'BTC':
          amount = balance['XXBT']
          break
        default:
          amount = balance[p]
          break
      }

      if (!amount) { amount = '0.00000000' }
      d[p] = amount
      return d
    }, {})
  },
  async getProductHistoricRates({ interval, product }) {
    const pair = this.currencyForProduct(product)
    const minutes = Math.floor(interval / 60)
    const history = await kraken.api('OHLC', { pair, interval: minutes })
    .then(d => {
      return d.result[pair]
    })
    return history.map(h => {
      return new Candlestick({startTime: h[0], open: h[1], high: h[2],
                             low: h[3], close: h[4], interval })
    })
  },
  async placeShortOrder({ price, amount, product }) {
    const currency = this.currencyForProduct(product)
    const order = await kraken.api('AddOrder', {
      pair: currency,
      type: sell,
      ordertype: 'limit',
      price: price,
      leverage: 1,
      volume: amount
    })
    return order
  },
  async placeBuyOrder({ amount, price, product }) {
    const currency = this.currencyForProduct(product)
    console.log(amount)
    const order = await kraken.api('AddOrder', {
      pair: currency,
      type: 'buy',
      ordertype: 'limit',
      price: price,
      volume: amount
    })
    return order
  },
  async currentPriceForProduct(product) {
    const currency = this.currencyForProduct(product)
    const ticker = await kraken.api('Ticker', { pair: currency })
    const res = ticker['result'][currency]
    return { ask: parseFloat(res.a[0]), bid: parseFloat(res.b[0]) }
  },
  currencyForProduct(product) {
    switch (product) {
      case 'BTC-USD':
      return 'XXBTZUSD'
      case 'BTC-EUR':
        return 'XXBTZEUR'
      default:
        return null
    }
  }
}
