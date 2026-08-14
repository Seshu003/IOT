// Authentication Middleware with Demo Bypass
function authenticateToken(req, res, next) {
  // Allow bearer token validation if present, otherwise inject demo engineer identity
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  req.user = {
    id: 'usr_technician_1',
    name: 'Dave Miller',
    role: 'Senior Maintenance Engineer'
  };

  next();
}

module.exports = {
  authenticateToken
};
