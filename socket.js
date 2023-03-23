// Websocket server
require('dotenv').config();
// const { httpServer } = require('./app');
const http = require('http');
const server = http.createServer();
const WebSocket = require('ws');
const port = process.env.PORT;

const wss = new WebSocket.Server({ noServer: true });

const bitstampWs = new WebSocket('wss://ws.bitstamp.net');

const currencyPairs = [
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
const latestPrices = {};

bitstampWs.on('open', () => {
  console.log('[Bitstamp] Connected to WebSocket API');

  // Subscribe to the "live_trades" channel for each currency pair
  for (const currencyPair of currencyPairs) {
    const subscribeMsg = {
      event: 'bts:subscribe',
      data: {
        channel: `live_trades_${currencyPair}`,
      },
    };
    bitstampWs.send(JSON.stringify(subscribeMsg));
  }
});

bitstampWs.on('message', (data) => {
  const msg = JSON.parse(data);
  const currencyPair = msg.channel.replace('live_trades_', '');
  if (currencyPairs.includes(currencyPair)) {
    console.log(`[Bitstamp] ${currencyPair.toUpperCase()}: ${msg.data.price}`);
    // Save the latest deal price for the currency pair
    latestPrices[currencyPair] = msg.data.price;
    // Broadcast the latest deal price to all connected clients for the currency pair
    wss.clients.forEach((client) => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({ currencyPair, price: msg.data.price }));
      }
    });
  }
});

wss.on('connection', (ws) => {
  console.log(`[Websocket] Client connected: ${ws._socket.remoteAddress}`);

  // Emit the latest deal price for each currency pair to the client
  for (const currencyPair of currencyPairs) {
    if (latestPrices[currencyPair]) {
      ws.send(
        JSON.stringify({ currencyPair, price: latestPrices[currencyPair] })
      );
    }
  }

  ws.on('close', () => {
    console.log(`[Websocket] Client disconnected: ${ws._socket.remoteAddress}`);
  });
});

server.on('upgrade', (request, socket, head) => {
  const pathname = new URL(request.url, `http://${request.headers.host}`)
    .pathname;

  if (pathname === '/streaming') {
    wss.handleUpgrade(request, socket, head, (socket) => {
      wss.emit('connection', socket, request);
    });
  } else {
    socket.destroy();
  }
});

server.listen(port, () => {
  console.log(`[Websocket] Server started on port ${port}!`);
});
