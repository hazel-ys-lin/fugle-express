require('dotenv').config();
const redis = require('./models/cache');
const moment = require('moment');

const wrapAsync = function (fn) {
  return function (req, res, next) {
    fn(req, res, next).catch(next);
  };
};

// Middleware to rate limiting
const slidingWindowCounter = async function (req, res, next) {
  let userIp =
    req.headers['x-forwarded-for'] || req.connection.remoteAddress || null;

  let userId = req.query.id;

  let now = moment().valueOf();
  console.log('[Rate Limiter] Sliding Window Counter Triggered', now);
  let threshold = 10;
  let windowSize = 60000;

  let luaScript = `
  local ip = KEYS[1]
  local now = tonumber(ARGV[1])
  local windowSize = tonumber(ARGV[2])
  local threshold = tonumber(ARGV[3])   
  local currentWindow = math.floor(now/1000)
  local prev_count = 0
  local cur_count = 0

  local prev_req = redis.call('get', ip .. tostring(currentWindow-1))
  if prev_req then
    prev_count = prev_req
  end
  local curr_req = redis.call('get', ip .. tostring(currentWindow))
  if curr_req then
  cur_count = curr_req
  end

  local last_contribute = windowSize - (now - currentWindow * 1000);
  local ec = (prev_count * (last_contribute / windowSize)) + cur_count + 1
  if ec <= threshold then 
    redis.call('incr', ip .. tostring(currentWindow))
    redis.call('expire', ip .. tostring(currentWindow), 2, 'NX')
    return 0
  else
    return ec .. " " .. prev_count .. " " .. cur_count
  end
  `;

  redis.defineCommand('slidingWindow', {
    numberOfKeys: 1,
    lua: luaScript,
  });

  redis.slidingWindow(
    `IP:${userIp}`,
    now,
    windowSize,
    threshold,
    function (err, result) {
      if (err) {
        console.log('[Rate Limiter] Lua Script Error');
      }
      console.log('[Rate Limiter] result: ', result);
      if (result === 0) {
        console.log('[Rate Limiter] 1 request');
        return next();
      }
      console.log('[Rate Limiter] Too many requests');
      return res
        .status(429)
        .json({ ip: 'ip request times', id: 'id request times' });
    }
  );
};

module.exports = {
  wrapAsync,
  slidingWindowCounter,
};
