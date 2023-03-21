// API that get the data
const axios = require('axios');

const getData = async function (req, res) {
  const { user } = req.query;
  // console.log('user: ', user);
  try {
    const fetchResult = await axios.get(
      'https://hacker-news.firebaseio.com/v0/topstories.json?print=pretty'
    );
    // console.log('fetchResult: ', fetchResult);
    return res.status(200).json({ result: fetchResult.data });
  } catch (error) {
    console.log('[Controller Error] Error when calling axios get', error);
    return res.status(500);
  }
};

module.exports = { getData };
