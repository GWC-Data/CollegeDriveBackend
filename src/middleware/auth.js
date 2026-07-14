const jwt = require('jsonwebtoken');
const User = require('../Models/User');
const Student = require('../Models/Student');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('FATAL: JWT_SECRET environment variable is not set!');

// Middleware to authenticate any Administrative User (Admin or Staff)
const authUser = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(decoded.id).select('-password');
    if (!user) {
      return res.status(401).json({ message: 'User not found, authorization denied' });
    }

    req.user = user;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid or has expired' });
  }
};

// Middleware to verify Admin (Super Admin) role only
const authAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.user.role !== 'Admin') {
    return res.status(403).json({ message: 'Access denied: Requires Admin role' });
  }

  next();
};

// Middleware to verify Staff or Admin role
const authStaffOrAdmin = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ message: 'Unauthorized' });
  }

  if (req.user.role !== 'Admin' && req.user.role !== 'Staff') {
    return res.status(403).json({ message: 'Access denied: Requires Staff or Admin role' });
  }

  next();
};

// Middleware to authenticate Students
const authStudent = async (req, res, next) => {
  try {
    const authHeader = req.header('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const token = authHeader.split(' ')[1];
    const decoded = jwt.verify(token, JWT_SECRET);

    if (decoded.role !== 'Student') {
      return res.status(403).json({ message: 'Access denied: Student token required' });
    }

    const student = await Student.findById(decoded.id).select('-password');
    if (!student) {
      return res.status(401).json({ message: 'Student not found, authorization denied' });
    }

    req.student = student;
    next();
  } catch (err) {
    res.status(401).json({ message: 'Token is not valid or has expired' });
  }
};

module.exports = {
  authUser,
  authAdmin,
  authStaffOrAdmin,
  authStudent
};
