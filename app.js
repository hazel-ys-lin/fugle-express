require('dotenv').config();
const express = require('express');
const app = express();
const httpServer = require('http').createServer(app);
// const port = process.env.PORT;

app.use(express.json());

app.get('/', (req, res) => {
  res.status(200).json({ message: 'This is index' });
});

// The routes
app.use('/', [require('./routes/data_route')]);

// 404 error handler
app.use(function (req, res, next) {
  // console.log('404', req.url);
  return res.status(400).json({ message: 'Page not found' });
});

// 500 error handler
app.use(function (req, res, next) {
  console.log('error handler: ', err);
  return res.status(500).json({ message: 'Server Error' });
});

// app.listen(port, () => {
//   console.log(`Server started on port ${port}`);
// });

module.exports = { httpServer };
