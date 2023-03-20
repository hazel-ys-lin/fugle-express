const router = require('express').Router();
const { wrapAsync } = require('./util');

router.route('/data').get(wrapAsync());

module.exports = router;
