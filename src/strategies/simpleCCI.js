const { CCI, ADX }  = require('technicalindicators')
const Trade = require('trade')
const CCISignal = require('strategies/cciSignal')

class SimpleCCI {
  constructor({ period, ticks, onBuySignal, onSellSignal }) {
    const open = ticks.map(tick => tick.open)
    const high = ticks.map(tick => tick.high)
    const low = ticks.map(tick => tick.low)
    const close = ticks.map(tick => tick.close)
    this.cci = new CCI({ open, high, low, close, period })
    this.adx = new ADX({ period, high, low, close })
    this.trades = []
    this.numberActiveTrades = 1
    this.onBuySignal = onBuySignal
    this.onSellSignal = onSellSignal
    this.signal = new CCISignal({ cci: this.cci })
  }

  async initialize() {
    const initialCCI = await this.cci.getResult()
    const initialADX = await this.adx.getResult()
    console.log(initialCCI[initialCCI.length - 1])
    console.log(initialADX[initialADX.length - 1])
  }

  onTick({ tick, time }) {
    const cciResult = this.cci.nextValue({
      close: tick.close, high: tick.high, low: tick.low
    })

    if (cciResult) {
      this.cci.result.push(cciResult)
    }

    const adxResult = this.adx.nextValue({
      high: tick.high, close: tick.close, low: tick.low
    })

    const price = tick.close

    if (!cciResult || !adxResult) { return }

    console.log(`Time: ${time}    Average ${tick.average().toFixed(2)}\
    Price: ${price.toFixed(2)}    CCI: ${cciResult}\
    ADX: ${adxResult.adx}  \
    PDI: ${adxResult.pdi}  \
    MDI: ${adxResult.mdi}`)

    const openTrades = this.trades.filter(t => t.state === 'open' )

    try {
    const res = this.cci.getResult()
    if (openTrades.length < this.numberActiveTrades) {
      if (this.signal.shouldBuy()) {
      //if (cciResult < -100) { && adxResult.adx > 20 &&
          //adxResult.mdi < adxResult.pdi + 5) {
        this.onBuySignal(price)
      }
    } else {
      const open = openTrades[0]
      if (this.signal.shouldSell() && adxResult.adx > 15) {
      //if (cciResult > 100) { && adxResult.adx > 20 &&
          //adxResult.mdi > adxResult.pdi - 5) {
        if (price - (price * 0.0025) > (open.enter.price * 1.0025)) {
          this.onSellSignal(price)
        }
      }
    }
    } catch (err) {
      console.log(err)
    }
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

module.exports = exports = SimpleCCI
