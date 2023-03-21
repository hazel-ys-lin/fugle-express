const router = require('express').Router();
const { wrapAsync, slidingWindowCounter } = require('../util');
const { getData } = require('../controllers/data_controller');

router.route('/data').get(slidingWindowCounter, wrapAsync(getData));

module.exports = router;
