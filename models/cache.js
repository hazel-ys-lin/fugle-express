// Connection config to redis
require('dotenv').config();
const Redis = require('ioredis');
const { CACHE_HOST, CACHE_PORT, CACHE_USER, CACHE_PASSWORD } = process.env;

const redis = new Redis({
  host: CACHE_HOST,
  port: CACHE_PORT,
  username: CACHE_USER,
  password: CACHE_PASSWORD,

  retryStrategy() {
    const delay = 5000;
    return delay;
  },
  maxRetriesPerRequest: 1,
  enableReadyCheck: false,
});

module.exports = redis;
