const jwt = require('jsonwebtoken');

const protect = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Not authorized, no token' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Token invalid or expired' });
  }
};

const adminProtect = (req, res, next) => {
  protect(req, res, () => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Admin access only' });
    }
    next();
  });
};

const workerProtect = (req, res, next) => {
  protect(req, res, () => {
    if (req.user.role !== 'worker' && req.user.role !== 'admin') {
      return res.status(403).json({ success: false, message: 'Worker access only' });
    }
    next();
  });
};

module.exports = { protect, adminProtect, workerProtect };
