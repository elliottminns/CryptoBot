const config = require('configuration')
const key = config.get('GDAX_API_KEY')
const secret = config.get('GDAX_API_SECRET')
const passphrase = config.get('GDAX_API_PASSPHRASE')
const Gdax = require('gdax')

const apiURL = process.env.GDAX_API_URL || 'https://api.gdax.com'
const wsUrl = process.env.GDAX_WS_FEED || 'wss://ws-feed.gdax.com'

const client = new Gdax.AuthenticatedClient(key, secret, passphrase, apiURL)

module.exports = {
  client,
  supportsShort: false,
  ticker({ product, onTick, onError }) {
    const socket = new Gdax.WebsocketClient(
      [product],
      wsUrl,
      { key, secret, passphrase },
      { channels: ['ticker', 'heartbeat'] })

    socket.on('message', async data => {
      if (data.type === 'ticker') {
        await onTick(data)
      }
    })
    socket.on('error', err => {
      onError(err)
      socket.connect()
    })
    socket.on('close', () => {
      socket.connect()
    })

    return socket
  },

  userFeed({ product, onUpdate, onError }) {
    const socket = new Gdax.WebscoketClient(
      [product],
      wsUrl,
      { key, secret, passphrase },
      { channels: ['user', 'heartbeat'] })
    socket.on('message', data => {
      if (data.type === 'heartbeat') { return }
      onUpdate(data)
    })
    socket.on('error', err => {
      onError(err)
      socket.open()
    })
    socket.on('close', () => {
      socket.open()
    })
  }
}
