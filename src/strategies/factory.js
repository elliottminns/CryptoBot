const Crossover = require('./crossover')
const SimpleCCI = require('./cci')

exports.create = function({ type, period, ticks, onBuySignal, onSellSignal }) {
  switch (type) {
    case 'crossover':
      return new Crossover({ period, ticks, onBuySignal, onSellSignal })
    default:
      return new SimpleCCI({ period, onBuySignal, onSellSignal })
  }
}
