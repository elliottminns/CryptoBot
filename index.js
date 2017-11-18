const program = require('commander')
const Trader = require('trader')
const Backtester = require('backtester')
const Arbitrage = require('arbitrage')
const gdax = require('exchange')
const database = require('database')
const kraken = require('exchange/kraken')
const bitstamp = require('exchange/bitstamp')
const bitfinex = require('exchange/bitfinex')

program.version('0.1.0')
  .option('-t, --type [type]', 'Run type [backtest, trade, arbitrage]', 'backtest')
  .option('-p, --product [product]', 'Product [BTC-EUR, LTC-EUR, ETH_EUR]', 'BTC-EUR')
  .option('-s, --short [shortExchange]', 'The exchange to short on (arbitrage only)', 'kraken')
  .option('-l, --long [longExchange]', 'The exchange to long on (arbitrage only)',
          'bitstamp')
  .option('-L, --live', 'Run live in arbitrage')
  .option('-a, --amount <n>', 'The amount for arbitrage', parseFloat)
  .option('-S, --strategy [strategy]', 'The strategy for trading [cci, crossover]', 'cci')
  .option('-P, --period <n>', 'The period to use', parseInt)
  .option('-h, --hours <n>', 'The number of hours in the past', parseInt, 0)
  .option('-d, --days <n>', 'The number of days in the past', parseInt, 0)
  .parse(process.argv)

const main = async function() {
  switch (program.type) {
  case 'trade':
      const trader = new Trader({
      gdax,
      product: program.product,
      interval: 300,
      period: program.period,
      isLive: program.live,
      strategy: program.strategy,
      amount: program.amount
    })
    await trader.start()
    break
  case 'backtest':
    console.log(`Starting backtest`)
    console.log(program.days)
    const days = program.days * 24 * 60 * 60
    const hours = program.hours * 60 * 60
    const now = new Date() - (days + hours + (-1 * 60)) * 1000
    const backtester = new Backtester({
      gdax,
      product: program.product,
      interval: 300,
      period: program.period,
      start: new Date(now - 36 * 60 * 60 * 1000),
      end: new Date(now),
      strategy: program.strategy
    })
    await backtester.start()
    break
    default:
      console.log('Begin backtest')
    break
  case 'arbitrage':
    const live = program.live
    const amount = program.amount || 10
    const arbitrage = new Arbitrage({
      product: program.product,
      amount,
      exchanges: [bitfinex.load(), bitstamp.load()]
    })
    await arbitrage.start()
    break
  }
}

main()
