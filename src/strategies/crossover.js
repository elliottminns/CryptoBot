const { SMA, CCI, ADX } = require('technicalindicators')
const CCISignal = require('./cciSignal')
const Trade = require('trade')

class Crossover {
  constructor({ period, ticks, onBuySignal, onSellSignal }) {
    const prices = ticks.map(tick => tick.average())
    this.period = period
    this.smaShort = new SMA({ period, values: prices })
    this.smaLong = new SMA({ period: period * 5, values: prices })
    const open = ticks.map(tick => tick.open)
    const high = ticks.map(tick => tick.high)
    const low = ticks.map(tick => tick.low)
    const close = ticks.map(tick => tick.close)
    this.cci = new CCI({ open, high, low, close, period: period * 1 })
    this.numberActiveTrades = 1
    this.onBuySignal = onBuySignal
    this.onSellSignal = onSellSignal
    this.trades = []
    this.signal = new CCISignal({ cci: this.cci })
    this.adx = new ADX({ period, high, low, close })
    this.previous = {
      long: 0,
      short: 0
    }
  }

  async initialize() {
    const smaL = await this.smaLong.getResult()
    const smaS = await this.smaShort.getResult()
    const oscil = await this.cci.getResult()
    const adx = await this.adx.getResult()
    this.previous.long = smaL[smaL.length - 1]
    this.previous.short = smaL[smaL.length - 1]
  }

  onTick({ tick, time }) {
    const avgLng = this.smaLong.nextValue(tick.average())
    const avgSrt = this.smaShort.nextValue(tick.average())
    const oscilation = this.cci.nextValue({
      close: tick.close, high: tick.high, low: tick.low
    })
    const adxResult = this.adx.nextValue({
      close: tick.close, high: tick.high, low: tick.low
    })

    if (oscilation) {
      this.cci.result.push(oscilation)
    }

    const price = tick.close
    const previousBelow = this.previous.short < this.previous.long

    if (!avgLng || !avgSrt || !oscilation || !adxResult) { return }

    console.log(`Time: ${time}   Average ${tick.average().toFixed(2)}\
   Price: ${price.toFixed(2)}   Long: ${avgLng.toFixed(2)}\
   Short: ${avgSrt.toFixed(2)}  Osci: ${oscilation.toFixed(2)}\
   ADX: ${adxResult.adx.toFixed(2)}`)

    const openTrades = this.trades.filter(t => t.state === 'open' )

    try {
      if (openTrades.length < this.numberActiveTrades) {
        if (avgSrt > avgLng && ((previousBelow && oscilation < -100) || this.signal.shouldBuy() && adxResult.adx > 25 && adxResult.adx < 30)) {
          this.onBuySignal(price)
        }
      } else if (avgSrt < avgLng && ((!previousBelow && oscilation > 100) || this.signal.shouldSell() && adxResult.adx < 20)) {
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

  positionOpened({ price, time }) {
    console.log('BUY ORDER')
    this.trades.push(new Trade({ price, time }))
  }

  positionClosed({ price, time }) {
    console.log('SELL ORDER')
    const openTrades = this.trades.filter(t => t.state === 'open')
    openTrades.forEach(t => {
      t.close({ price, time })
    })
  }
}

module.exports = exports = Crossover
