const { TickerStream, OrderBookStream, Bitstamp } = require("node-bitstamp")

const config = require('configuration')
const Candlestick = require('candlestick')
const key = config.get('BITSTAMP_API_KEY')
const secret = config.get('BITSTAMP_API_SECRET')
const clientId = config.get('BITSTAMP_API_CLIENT_ID')
/*
const bitstamp = new Bitstamp({
    key,
    secret,
    clientId,
    timeout: 60000,
    rateLimit: true //turned on by default
})*/

module.exports = {
  name: 'Bitstamp',
  async getAccounts() {
    return await bitstamp.balance().then(({ body:data }) => data)
  },
  async getBalanceForProductPair(product) {
    const products = product.split('-')
    const accounts = await this.getAccounts()
    const keys = products.reduce((d, p) => {
      const key = `${p.toLowerCase()}_available`
      d[p] = accounts[key]
      return d
    }, {})
    return keys
  },
  async openOrders({ product }) {
    const currency = this.currencyForProduct(product)
    const orders = await bitstamp.openOrders(currency)
      .then(({ body: data }) => data)
    return orders
  },
  async orderStatus({ id }) {
    const status = await bitstamp.orderStatus(id)
    .then(({ body:data }) => data)
    return data.status
  },
  async getProductHistoricRates({ interval, product }) {
    const currency = this.currencyForProduct(product)
    const minutes = Math.floor(interval / 60)
    const transactions = await bitstamp.transactions(currency, "day")
    .then(({ status, headers, body }) => body)
    const history = transactions.reverse().reduce((d, t, i) => {
      const lastIndex = d.length - 1
      const current = d[lastIndex]
      if (current.length == 0) {
        current.push(t);
        return d
      }
      const first = current[0]
      const tDate = parseInt(t.date)
      const firstDate = parseInt(first.date)
      if (tDate - firstDate > interval) {
        d.push([])
      } else {
        current.push(t)
      }
      return d
    }, [[]]).map((chunk, index) => {
      if (chunk.length === 0) { return null }
      const candlestick = new Candlestick({
        interval: interval,
        price: parseFloat(chunk[0].price),
        startTime: parseInt(chunk[0].date)
      })

      chunk.slice(1).forEach(c => {
        candlestick.onPrice(c.price)
      })

      candlestick.state = 'closed'
      return candlestick
    }).filter(c => c !== null)
    return history
  },
  async placeBuyOrder({ product, amount, price }) {
    const currency = this.currencyForProduct(product)
    const order = await bitstamp.buyLimitOrder(amount, price, currency)
    return order
  },
  async placeSellOrder({ product, amount, cost }) {
    const currency = this.currencyForProduct(product)
    const order = await bitstamp.sellMarketOrder(cost, currency)
    return order
  },
  async currentPriceForProduct(product) {
    const currency = this.currencyForProduct(product)
    const ticker = await bitstamp.ticker(currency).then(({status, headers, body}) => body)
    return { ask: parseFloat(ticker.ask), bid: parseFloat(ticker.bid) }
  },
  currencyForProduct(product) {
    const reduced = product.replace('-','').toLowerCase()
    return reduced
  }
}
