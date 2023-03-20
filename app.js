require('dotenv').config();
const express = require('express');
const app = express();
const port = process.env.PORT;

app.use(express.json());
app.set('view engine', 'pug');
app.use(express.json());

app.get('/', (req, res) => {
  res.render('index');
});

// 404 error handler
app.use(function (req, res, next) {
  console.log('404', req.url);
  return res.render('error404');
});

// 500 error handler
app.use(function (req, res, next) {
  console.log('error handler: ', err);
  return res.render('error500');
});

app.listen(port, () => {
  console.log(`Server started on ${port}`);
});
