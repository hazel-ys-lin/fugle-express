// Websocket server
require('dotenv').config();
const { httpServer } = require('./app');
const WebSocket = require('ws');
const port = process.env.PORT;

const wss = new WebSocket.Server({ noServer: true });

const bitstampWs = new WebSocket('wss://ws.bitstamp.net');

const pairs = [
  'btcusd',
  'btceur',
  'btcgbp',
  'btcpax',
  'gbpusd',
  'gbpeur',
  'eurusd',
  'xrpusd',
  'xrpeur',
  'xrpbtc',
];
const ohlcData = {};

pairs.forEach((pair) => {
  ohlcData[pair] = {
    open: 0,
    high: 0,
    low: 0,
    close: 0,
    lastUpdated: 0,
  };
});

function updateOHLC(pair, price) {
  const now = Date.now();
  const currentMinute = Math.floor(now / 60000);

  if (ohlcData[pair].lastUpdated < currentMinute) {
    ohlcData[pair] = {
      open: price,
      high: price,
      low: price,
      close: price,
      lastUpdated: currentMinute,
    };
  } else {
    if (price > ohlcData[pair].high) {
      ohlcData[pair].high = price;
    }
    if (price < ohlcData[pair].low) {
      ohlcData[pair].low = price;
    }
    ohlcData[pair].close = price;
  }
}

bitstampWs.on('open', () => {
  console.log('[Bitstamp] Connected to WebSocket API');

  // Subscribe to the "live_trades_btcusd" channel for each currency pair
  pairs.forEach((pair) => {
    const subscribeMsg = {
      event: 'bts:subscribe',
      data: {
        channel: `live_trades_${pair}`,
      },
    };
    bitstampWs.send(JSON.stringify(subscribeMsg));
  });
});

bitstampWs.on('message', (data) => {
  const msg = JSON.parse(data);
  if (msg.channel && msg.channel.startsWith('live_trades_')) {
    const pair = msg.channel.substring(12);
    if (pairs.includes(pair)) {
      const price = parseFloat(msg.data.price);
      updateOHLC(pair, price);
      const ohlc = ohlcData[pair];
      wss.clients.forEach((client) => {
        client.send(JSON.stringify({ pair, ohlc }));
      });
    }
  }
});

wss.on('connection', (socket) => {
  console.log(`[Websocket] Client connected: ${socket.id}`);
  pairs.forEach((pair) => {
    const ohlc = ohlcData[pair];
    socket.send(JSON.stringify({ pair, ohlc }));
  });
});
httpServer.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`)
    .pathname;

  if (pathname !== '/streaming') {
    socket.destroy();
    return;
  }

  wss.handleUpgrade(request, socket, head, (socket) => {
    wss.emit('connection', socket, request);
  });
});

httpServer.listen(port, () => {
  console.log(`[Websocket] Server started on port ${port}!`);
});
