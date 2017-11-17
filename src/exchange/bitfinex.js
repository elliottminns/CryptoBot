const BFX = require('bitfinex-api-node')
const config = require('configuration')
const key = config.get('BITFINEX_API_KEY')
const secret = config.get('BITFINEX_API_SECRET')

const opts = {
  version: 1
}
/*
const bfx = new BFX(key, secret, opts)
const bfx2 = new BFX(key, secret, { version: 2, transform: true })
*/

module.exports = {
  name: 'Bitfinex',
  supportsShort: true,
  getBalanceForProductPair(pair) {
    return new Promise((resolve, reject) => {
      bfx.rest.wallet_balances((err, balances) => {
        if (err) { return reject(error) }

        const wallets = balances.filter(b => b.type === 'trading')
        .reduce((d, wallet) => {
          d[wallet.currency] = wallet
          return d
        }, {})
        const currs = pair.split('-')
        let result = currs.reduce((d, p) => {
          d[p] = wallets[p.toLowerCase()].available
          return d
        }, {})
        return resolve(result)
      })
    })
  },
  openOrders({ product }) {
    return new Promise((resolve, reject) => {
      bfx.rest.active_orders((err, orders) => {
        if (err) { return reject(err) }
        return resolve(orders)
      })
    })
  },
  placeBuyOrder({ price, amount, product }) {
    return new Promise((resolve, reject) => {
      const currency = product.replace('-', '').toLowerCase()
      console.log(currency)
      bfx.rest.new_order(currency, amount, price,
                         'bitfinex', 'buy', 'limit', (err, order) => {
                           if (err) { return reject(err) }
                           return resolve(order)
                         })
    })
  },
  placeShortOrder({ price, amount, product }) {
    return new Promise((resolve, reject) => {
      const currency = product.replace('-', '').toLowerCase()
      console.log(currency)
      bfx.rest.new_order(currency, amount, price, 'bitfinex', 'sell', 'limit',
                         (err, order) => {
                           if(err) { return reject(err) }
                           return resolve(order)
                         })
    })
  },
  currentPriceForProduct(product) {
    return new Promise((resolve, reject) => {
      const currency = this.currencyForProduct(product)
      bfx2.rest.ticker(currency, (err, ticker) => {
        if (err) { return reject(err) }
        return resolve({ ask: ticker.ASK, bid: ticker.BID })
      })
    })
  },
  currencyForProduct(product) {
    const reduced = product.replace('-','')
    return `t${reduced}`
  },
  orderStatus({ id }) {
    return new Promise((resolve, reject) => {
      bfx.rest.order_status(id, (err, order) => {
        if (err) { return reject(err) }
        if (order['is_live'] === true) { return 'Open' }
        if (order['is_live'] === false) { return 'Finished' }
        if (order['is_cancelled'] === true) { return 'Finished' }
      })
    })
  }
}
