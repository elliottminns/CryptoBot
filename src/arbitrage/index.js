const PromiseTool = require('promise-tool')
const colors = require('colors/safe')
const Trade = require('trade')
const ArbitragePosition = require('./position')

class Arbitrage {
  constructor({ amount, exchanges, isLive, product }) {
    this.amount = amount
    this.exchanges = exchanges
    this.exchangesDict = exchanges.reduce((d, e) => {
      d[e.name] = e
      return d
    }, {})
    this.numberActivePositions = 0
    this.isLive = isLive
    this.product = product
    this.accounts = {}
    this.positions = []
    this.pairs = this.createPairs()
    this.spreadStats = this.pairs.reduce((d, e) => {
      d[`${e.long}-${e.short}`] = {
        min: undefined,
        max: undefined
      }
      return d
    }, {})
  }

  async start() {
    console.log(`We going live with amount ${this.amount}`)
    await this.load()
  }
  async load() {
    try {
      const balances = await Promise.all(this.exchanges.map(exchange => {
        return exchange.getBalanceForProductPair(this.product)
      }))

      this.accounts = balances.reduce((d, balance, index) => {
        const exchange = this.exchanges[index]
        d[exchange.name] = balance
        return d
      }, {})

      console.log(this.accounts)

      this.loop()
      const delay = 3000

    } catch (error) {
      console.log(error)
      await this.load()
    }
  }

  async getOpenOrders() {
    const orders = await Promise.all(this.exchanges.map(ex => {
      return ex.openOrders({ product: this.product })
    }))

    console.log(orders)

    return orders.reduce((d, o, i) => {
      const ex = this.exchanges[i]
      d[ex.name] = o
      return d
    }, {})
  }

  getAverageSpreads(history) {
    const counts = Object.keys(history).map((key) => {
      return history[key].length
    })

    const equal = counts.reduce((isEqual, current, index) => {
      if (index === 0) { return true }
      const previous = counts[index - 1]
      return previous === current
    }, true)

    console.log(`Counts are equal: ${equal}`)
  }

  createPairs() {
    const pairs = this.exchanges.map(e => {
      if (!e.supportsShort) { return }
      const paired = this.exchanges.map(other => {
        return {
          short: e.name,
          long: other.name
        }
      }).filter(d => d.short !== d.long)
      return paired
    }).filter(p => p !== undefined).reduce((a, p) => {
      return a.concat(p)
    }, [])
    return pairs
  }

  async checkPendingOpens() {
    const pendings = this.positions.filter(p => p.state === 'pending-open')
    await Promise.all(pendings.map(t => {
      return t.checkOrderState()
    }))
  }

  async loop() {
    try {
      /*
      await this.checkPendingOpens()
      const openOrders = await this.getOpenOrders()
      const hasOpen = Object.keys(openOrders).reduce((has, key) => {
        const orders = openOrders[key]
        return has || orders.length > 0
      }, false)

      if (hasOpen) { return }
      */
      const prices = await this.currentPrices()

      const pricePairs = this.pairs.map(pair => {
        const shrt = pair.short
        const lng = pair.long
        const price = {
          long: prices[lng],
          short: prices[shrt],
        }
        const exchanges = {
          long: this.exchangesDict[lng],
          short: this.exchangesDict[shrt]
        }
        return { prices: price, exchanges }
      })

      for (let pair of pricePairs) {
        this.checkSpread(pair)
      }
      console.log('')
    } catch (error) {
    }
    try {
      this.positions.forEach(p => p.print())
    } catch (error) {
    }
    const delay = 3000
    await PromiseTool.setTimeout(delay)
    this.loop()
  }

  async checkSpread({ prices, exchanges }) {
    const openPositions = this.positions.filter(p => p.state === 'open')
    const hasOpen = openPositions.length > 0

    const longPrice = hasOpen ? prices.long.ask : prices.long.bid
    const shortPrice = hasOpen ? prices.short.bid : prices.short.ask
    const longStr = `${exchanges.long.name}: ${longPrice.toFixed(2)}`
    const shortStr = `${exchanges.short.name}: ${shortPrice.toFixed(2)}`

    const spread = (100 - (longPrice / shortPrice * 100)).toFixed(2)
    const spreadStats = this.spreadStats[`${exchanges.long.name}-${exchanges.short.name}`]

    if (spreadStats.min === undefined) { spreadStats.min = spread }
    if (spreadStats.max === undefined) { spreadStats.max = spread }

    if (spread < spreadStats.min) {
      spreadStats.min = spread
    }
    if (spread > spreadStats.max) {
      spreadStats.max = spread
    }

    const spreadStr = `Spread: ${spread}% | Min: ${spreadStats.min} | Max: ${spreadStats.max}`
    const full = [`${new Date()}`, longStr, shortStr, spreadStr].join(' | ')
    console.log(full)

    if (openPositions.length < this.numberActivePositions) {
      if (spread >= 1.0) {
        const product = this.product
        const amountLong = this.amount / longPrice
        const amountShort = this.amount / amountShort

        await exchanges.long.placeBuyOrder({
          amount: `${amountLong}`,
          price: `${longPrice}`,
          product
        })
        await exchanges.short.placeShortOrder({
          amount: `${amountShort}`,
          price: `${shortPrice}`,
          product
        })
        console.log(`LONG ORDER: ${longPrice}`)
        console.log(`SHORT ORDER: ${shortPrice}`)
        const position = new ArbitragePosition({
          prices: {
            long: longPrice,
            short: shortPrice
          },
          longPrice,
          shortPrice,
          time: new Date(),
          exchanges: exchanges
        })
        this.positions.push(position)
      }
    } else {
      if (spread < -0.5) {
        openPositions.forEach(async p => {
          if (p.exchanges.long.name !== exchanges.long.name &&
              p.exchanges.short.name !== exchanges.short.name) { return }
            console.log('CLOSING ORDER')
          const data = ({ cost: this.amount, product: this.product })
          const amountLong = this.amount / longPrice
          const amountShort = this.amount / amountShort
          await this.exchanges.short.placeBuyOrder({
            amount: `${amountLong}`,
            price: longPrice,
            product: this.product
          })
          await this.exchanges.long.placeSellOrder({
            amount: `${amountLong}`,
            price: longPrice,
            product: this.product
          })
          console.log(`LONG ORDER: ${longPrice}`)
          console.log(`SHORT ORDER: ${shortPrice}`)
          p.close({
            longPrice,
            shortPrice,
            time: new Date()
          })
        })
      }
    }
  }

  async currentPrices() {
    const prices = await Promise.all(this.exchanges.map(e => {
      return e.currentPriceForProduct(this.product)
    }))

    return prices.reduce((d, price, index) => {
      const exchange = this.exchanges[index]
      d[exchange.name] = price
      return d
    }, {})
  }

  async averageSpread() {
  }
}

module.exports = exports = Arbitrage
