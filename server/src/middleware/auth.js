const jwt = require('jsonwebtoken');

// Verifies the "Authorization: Bearer <token>" header and attaches req.user = { id, name, role }
function authenticate(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ message: 'Please log in to continue.', code: 'AUTH_REQUIRED' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Your session has expired. Please log in again.', code: 'AUTH_REQUIRED' });
  }
}

// Role-based access control: authorize('doctor', 'admin')
function authorize(...roles) {
  return (req, res, next) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'You do not have permission to do that.' });
    }
    next();
  };
}

// Lets route handlers be async without repeating try/catch
const asyncHandler = (fn) => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);

module.exports = { authenticate, authorize, asyncHandler };
