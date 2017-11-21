const CCISignal = require('./cciSignal')
const tulind = require('tulind')
const Strategy = require('./strategy')

class Crossover extends Strategy {

  constructor(data) {
    super(data)
    this.previous = {
    }
  }

  async run({ ticks, time }) {
    const sma = tulind.indicators.sma
    const cci = tulind.indicators.cci
    const adxI = tulind.indicators.adx
    const high = ticks.map(t => t.high)
    const low = ticks.map(t => t.low)
    const close = ticks.map(t => t.close)

    const longResults = await sma.indicator([close], [this.period]).then(d => d[0])
    const shortResults = await sma.indicator([close], [this.period * 4]).then(d => d[0])
    const cciResults = await cci.indicator([high, low, close], [this.period]).then(d => d[0])
    const adxResults = await adxI.indicator([high, low, close], [this.period]).then(d => d[0])
    const signal = new CCISignal({ cciResults })
    const avgLng = longResults[longResults.length - 1]
    const avgSrt = shortResults[shortResults.length - 1]
    const adx = adxResults[adxResults.length - 1]
    const oscilation = cciResults[cciResults.length - 1]

    const price = ticks[ticks.length - 1].close
    const previousBelow = this.previous.short < this.previous.long

    if (!avgLng || !avgSrt || !oscilation || !adx) { return }

    console.log(`Time: ${time}\
   Price: ${price.toFixed(2)}   Long: ${avgLng.toFixed(2)}\
   Short: ${avgSrt.toFixed(2)}  Osci: ${oscilation.toFixed(2)}\
   ADX: ${adx.toFixed(2)}`)

    /*const last = ticks.slice(ticks.length - 4)
    console.log(last)*/
    const openTrades = this.trades.filter(t => t.state === 'open' )

    try {
      if (openTrades.length < this.maxActiveTrades) {
        if (avgSrt > avgLng &&
           ((previousBelow && oscilation < -100 && oscilation > -200)
            || signal.shouldBuy() && adx > 25 && adx < 30)) {
          this.onBuySignal(price)
        }
      } else if (avgSrt < avgLng &&
                 ((!previousBelow && oscilation > 100 && oscilation < 200) ||
                  signal.shouldSell() && adx < 20)) {
        const open = openTrades[0]
        if (price - (price * 0.0025) > (open.enter.price * 1.0025)) {
          this.onSellSignal(price)
        }
      }
    } catch (err) {
      console.log(err)
    }

    this.previous.short = avgSrt
    this.previous.long = avgLng
  }
}

module.exports = exports = Crossover
