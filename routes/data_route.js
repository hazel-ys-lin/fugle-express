const router = require('express').Router();
const { wrapAsync } = require('../util');
const { getData } = require('../controllers/data_controller');

router.route('/data').get(wrapAsync(getData));

module.exports = router;
