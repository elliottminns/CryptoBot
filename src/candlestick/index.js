class Candlestick {
  constructor({
    low, high, close, open, price, interval, startTime = new Date(), volume
  }) {
    this.startTime = startTime
    this.interval = interval
    this.open = open || price
    this.close = close || price
    this.high = high || price
    this.low = low || price
    this.volume = volume || 0
    this.state = close ? 'closed' : 'open'
  }

  average() {
    return (this.close + this.high + this.low) / 3
  }

  onPrice({ p, v = 0 }) {
    const price = parseFloat(p)
    if (this.state === 'closed') { return }
    this.volume = this.volume + v

    if (this.high < price) {
      this.high = price
    }

    if (this.low > price) {
      this.low = price
    }

    this.close = price

    const currentDate = new Date()
    const delta = (currentDate - this.startTime) * 0.001
    if (delta >= this.interval) {
      this.state = 'closed'
    }
  }
}

module.exports = exports = Candlestick
