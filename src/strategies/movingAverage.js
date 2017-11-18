const Strategy = require('./strategy')
const tulind = require('tulind')

class MovingAverage extends Strategy {
  async run({ ticks, time }) {

    const price = ticks[ticks.length - 1].close
    const close = ticks.map(t => t.close)
    const results = await tulind.indicators.sma.indicator([close], [this.period])
    const result = results[0]

    if (result.length == 0) { return }

    console.log(result[result.length - 1])
  }
}

module.exports = exports = MovingAverage
