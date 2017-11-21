const Strategy = require('./strategy')
const tulind = require('tulind')

class Volume extends Strategy {
  async run({ ticks, time }) {
    const price = ticks[ticks.length - 1].close
    const vol = ticks[ticks.length - 1].volume
    const close = ticks.map(t => t.close)
    const volume = ticks.map(t => t.volume)
    const prices = ticks.map(t => t.average())

    const rsiRes = await tulind.indicators.rsi.indicator([prices],
                                                         [this.period])
    const bbRes = await tulind.indicators.bbands.indicator([prices],
                                                           [this.period, 2])
    const obvRes = await tulind.indicators.obv.indicator([close, volume],
                                                         [])
    const shortPeriod = this.period * 0.5
    const longPeriod = this.period
    const signalPeriod = this.period * 2
    const macdRes = await tulind.indicators.macd
      .indicator([prices],[shortPeriod, longPeriod, signalPeriod])

    const obv = obvRes[0]
    const rsi = rsiRes[0]
    const bbLow = bbRes[0]
    const bbMid = bbRes[1]
    const bbHigh = bbRes[2]
    const macd = macdRes[0]
    const signals = macdRes[1]
    const histo = macdRes[2]
    const obvL = obv[obv.length - 1]
    const bbL = bbLow[bbLow.length - 1]
    const bbM = bbMid[bbMid.length - 1]
    const bbH = bbHigh[bbHigh.length - 1]
    const rsiL = rsi[rsi.length - 1]
    const macdL = macd[macd.length - 1]
    const signal = signals[signals.length - 1]
    const hist = histo[histo.length - 1]

    if (!obvL || !bbL || !rsiL || !macdL || !signal || !hist) { return }
    console.log(`Time: ${time}   Price: ${price.toFixed(2)}\
  Volume: ${vol.toFixed(2)}\
  Low: ${bbL.toFixed(2)}    Mid: ${bbM.toFixed(2)}\
  High: ${bbH.toFixed(2)}   RSI: ${rsiL.toFixed(2)}\
  Signal: ${signal}`)

    const openTrades = this.trades.filter(t => t.state === 'open')
    if (openTrades.length < this.maxActiveTrades) {
      if (price < bbL) {
        if ((signal < - 25 && hist < 0) || (rsiL < 27 && signal > 0)) {
          this.onBuySignal(price)
        }
      }
    } else {
      const active = openTrades[0]
      if (
          ((price > bbH && rsiL > 60) || (price > bbM && rsiL > 75)) &&
          ((signal < 0 && signal > -30) || signal > 33) &&
          price > active.enter.price * 1.02) {
        this.onSellSignal(price)
      }
    }
  }
}

module.exports = exports = Volume
