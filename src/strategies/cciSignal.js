class CCISignal {
  constructor({ cciResults, upper = 100, lower = -100 }) {
    this.cci = cciResults
    this.upper = upper
    this.lower = lower
  }

  shouldSell() {
    const data = this.cci.reverse()
    const threshold = this.upper
    if (data.length === 0) { return false }

    const first = data[0]
    if (first < threshold || first > threshold * 2) { return false }
    var crossed = false
    const crossedIndex = data.reduce((res, val, index) => {
      if (crossed) { return res }
      if (val > threshold) {
        return index
      } else if (res != null) {
        crossed = true
        return index
      } else {
        return null
      }
    }, null)

    if (!crossedIndex) { return false }

    const slice = data.slice(0, crossedIndex).reverse()
    const isDownwards = slice.reduce((res, value, index) => {
      if (index == 0) { return false }
      const previous = slice[index - 1]
      const marker = previous
      return value < marker
    }, false)

    return isDownwards
  }

  shouldBuy() {
    const data = this.cci.reverse()
    const threshold = this.lower
    if (data.length === 0) { return false }

    const first = data[0]
    if (first > threshold || first < threshold * 2) { return false }
    var crossed = false

    const crossedIndex = data.reduce((res, val, index) => {
      if (crossed) { return res }
      if (val < threshold) {
        return index
      } else if (res != null) {
        crossed = true
        return index
      } else {
        return null
      }
    }, null)

    if (!crossedIndex) { return false }

    const slice = data.slice(0, crossedIndex).reverse()
    const isUpwards = slice.reduce((res, value, index) => {
      if (index == 0) { return false }
      const previous = slice[index - 1]
      const marker = previous
      return value > marker
    }, false)

    return isUpwards
  }
}

module.exports = CCISignal
