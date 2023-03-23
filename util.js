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
  // console.log('[Rate Limiter] Sliding Window Counter Triggered', now);
  let ipThreshold = 10;
  let idThreshold = 5;
  let windowSize = 60;

  // Return the count of the id or ip if request threshold reach the limit
  let luaScript = `
  local ip = KEYS[1]
  local userId = KEYS[2]
  local now = tonumber(ARGV[1])
  local windowSize = tonumber(ARGV[2])
  local ipThreshold = tonumber(ARGV[3])
  local idThreshold = tonumber(ARGV[4])
  local currentWindow = math.floor(now/1000)
  local ipCount = 0
  local idCount = 0

  -- Get previous and current IP request counts
  local ipPrevReq = redis.call('get', ip .. tostring(currentWindow-1))
  if ipPrevReq then
    ipCount = ipCount + tonumber(ipPrevReq)
  end

  local ipCurReq = redis.call('get', ip .. tostring(currentWindow))
  if ipCurReq then
    ipCount = ipCount + tonumber(ipCurReq)
  end

  -- Get previous and current userId request counts
  local userIdPrevReq = redis.call('get', userId .. tostring(currentWindow-1))
  if userIdPrevReq then
    idCount = idCount + tonumber(userIdPrevReq)
  end

  local userIdCurReq = redis.call('get', userId .. tostring(currentWindow))
  if userIdCurReq then
    idCount = idCount + tonumber(userIdCurReq)
  end

  -- Check if the IP or User ID has exceeded the rate limit
  if ipCount >= ipThreshold then
    return { ipCount, idCount }
  elseif idCount >= idThreshold then
    return { ipCount, idCount }
  else
    -- Increment the request counter and set expiration time
    redis.call('incr', ip .. tostring(currentWindow))
    redis.call('incr', userId .. tostring(currentWindow))
    redis.call('expire', ip .. tostring(currentWindow), windowSize)
    redis.call('expire', userId .. tostring(currentWindow), windowSize)
    return { 0, 0 }
  end
  `;

  redis.defineCommand('slidingWindow', {
    numberOfKeys: 2,
    lua: luaScript,
  });

  redis.slidingWindow(
    `IP:${userIp}`,
    `userId:${userId}`,
    now,
    windowSize,
    ipThreshold,
    idThreshold,
    function (err, result) {
      if (err) {
        console.log('[Rate Limiter] Lua Script Error');
      }
      // console.log('[Rate Limiter] result: ', result);
      if (result[0] === 0 && result[1] === 0) {
        // console.log('[Rate Limiter] 1 request');
        return next();
      }
      console.log('[Rate Limiter] Too many requests');
      return res.status(429).json({ ip: result[0], id: result[1] });
    }
  );
};

module.exports = {
  wrapAsync,
  slidingWindowCounter,
};
