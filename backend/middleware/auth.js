const crypto = require('crypto');

function getConfiguredToken() {
  if (process.env.API_TOKEN) return process.env.API_TOKEN;
  if (process.env.NODE_ENV === 'production') return null;
  return 'demo-token';
}

function authenticateToken(req, res, next) {
  const configuredToken = getConfiguredToken();
  const authHeader = req.headers.authorization || '';
  const [scheme, token] = authHeader.split(' ');

  if (!configuredToken) {
    return res.status(500).json({ error: 'API_TOKEN must be configured in production' });
  }

  if (!isValidBearerToken(scheme, token, configuredToken)) {
    return res.status(401).json({ error: 'A valid bearer token is required' });
  }

  req.user = {
    id: 'usr_technician_1',
    name: 'Ravi Kulkarni',
    role: 'Senior Maintenance Engineer'
  };
  return next();
}

function isValidBearerToken(scheme, token, configuredToken = getConfiguredToken()) {
  return Boolean(configuredToken && scheme === 'Bearer' && token && safeEqual(token, configuredToken));
}

function safeEqual(left, right) {
  const leftBuffer = Buffer.from(left);
  const rightBuffer = Buffer.from(right);
  return leftBuffer.length === rightBuffer.length && crypto.timingSafeEqual(leftBuffer, rightBuffer);
}

module.exports = {
  authenticateToken,
  getConfiguredToken,
  isValidBearerToken
};
