
class ArbitragePosition {
  constructor({ longPrice, shortPrice, exchanges, prices, time, longOrder, shortOrder }) {
    this.state = 'pending-open'
    this.trades = {
      long: new Trade({ price: longPrice, time }),
      short: new Trade({ price: shortPrice, time })
    }
    this.prices = prices
    this.exchanges = exchanges
    this.exit = undefined
    this.orders = {
      open: {
        short: shortOrder,
        long: longOrder
      }
    }
  }

  async checkOrderState() {
    const orders = this.state === 'pending-close' ? this.orders.close : this.orders.open

    const longStatus = await this.exchanges.long
      .orderStatus(orders.long.id)
    const shortStatus = await this.exchanges.short
      .orderStatus(orders.short.id)

    if (longStatus === 'Finished' && shortStatus === 'Finished') {
      if (this.state === 'pending-open') {
        this.state = 'open'
      } else if (this.state === 'pending-close') {
        this.state = 'closed'
      }
    }
  }

  opened() {
    this.state = 'open'
  }

  closing() {
    this.state = 'pending-close'
  }

  close({ longPrice, shortPrice, time }) {
    this.state = 'closed'
    this.trades.long.close({ price: longPrice, time })
    this.trades.short.close({ price: shortPrice, time })
  }

  calculateProfit() {
    if (this.state !== 'closed') { return null }
    const fee = 0.0025
    const longProfit = this.trades.long.profit()
    const shortTrade = this.trades.short
    const shortSell = (shortTrade.enter.price * (1 - fee))
    const shortBuy = (shortTrade.exit.price * (1 + fee))
    const shortProfit = shortSell - shortBuy
    /*
    const shortSale = (this.enter.short * (1 - fee)) - (this.exit.short * (1 - fee))
    const longSale = (this.exit.long * (1 - fee)) - (this.enter.short * (1 - fee))
*/
    return shortProfit + longProfit
  }

  print() {
    const enter = `Long: ${this.trades.long.enter.price}   Short: ${this.trades.short.enter.price}`
    const exit = this.state == 'closed' ? `Long: ${this.trades.long.exit.price}   Short: ${this.trades.short.exit.price}` : ''
    const profit = this.calculateProfit()
    const prof = this.state == 'closed' ? `${profit}` : ''
    const colored = profit > 0 ? colors.green(prof) : colors.red(prof)
    const end = this.state == 'closed' ? `| Exit - ${exit} | Profit: ${colored}` : ''
    console.log(`${this.state} | Enter - ${enter} ${end}`)
  }
}

module.exports = exports = ArbitragePosition
