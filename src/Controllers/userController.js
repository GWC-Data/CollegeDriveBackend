const User = require('../Models/User');
const Student = require('../Models/Student');
const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('FATAL: JWT_SECRET environment variable is not set!');

const MAIN_ADMIN_EMAIL = (process.env.MAIN_ADMIN_EMAIL || '').toLowerCase().trim();
const MAIN_ADMIN_PASSWORD = process.env.MAIN_ADMIN_PASSWORD || '';

// @desc    Unified Login (Student, Admin, Staff)
// @route   POST /api/users/login
// @access  Public
const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email) {
      return res.status(400).json({ message: 'Please provide email' });
    }
    if (!password) {
      return res.status(400).json({ message: 'Please provide password' });
    }

    const emailLower = email.toLowerCase().trim();

    // 1. Check if Administrative User (Admin/Staff) in DB
    const user = await User.findOne({ email: emailLower });
    if (user) {
      // Always verify password for all admin/staff users
      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const token = jwt.sign(
        { id: user._id, role: user.role },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      return res.json({
        token,
        role: user.role,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      });
    }

    // 2. Check if Student in DB
    const student = await Student.findOne({ email: emailLower });
    if (student) {
      const isMatch = await student.comparePassword(password);
      if (!isMatch) {
        return res.status(401).json({ message: 'Invalid email or password' });
      }

      const token = jwt.sign(
        { id: student._id, role: 'Student' },
        JWT_SECRET,
        { expiresIn: '8h' }
      );

      return res.json({
        token,
        role: 'Student',
        student: {
          id: student._id,
          studentId: student.studentId,
          name: student.name,
          email: student.email,
          usn: student.usn,
          collegeName: student.collegeName,
          assignedSet: student.assignedSet,
          testStarted: student.testStarted,
          testSubmitted: student.testSubmitted,
          testAllowed: student.testAllowed,
          score: student.score
        }
      });
    }

    return res.status(401).json({ message: 'Invalid email or password' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during login' });
  }
};

// @desc    Create Admin/Staff (Admin only)
// @route   POST /api/users
// @access  Private/Admin
const createUser = async (req, res) => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password || !role) {
      return res.status(400).json({ message: 'Please provide name, email, password and role' });
    }

    if (!['Admin', 'Staff'].includes(role)) {
      return res.status(400).json({ message: 'Invalid role. Must be Admin or Staff' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters' });
    }

    const userExists = await User.findOne({ email: email.toLowerCase().trim() });
    if (userExists) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    const newUser = new User({
      name,
      email: email.toLowerCase().trim(),
      password,
      role
    });

    await newUser.save();

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during user creation' });
  }
};

// @desc    Get all Admin/Staff users (Admin only)
// @route   GET /api/users
// @access  Private/Admin
const getUsers = async (req, res) => {
  try {
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json(users);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error fetching users' });
  }
};

// @desc    Delete user (Admin only)
// @route   DELETE /api/users/:id
// @access  Private/Admin
const deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    // Prevent deleting oneself
    if (req.user._id.toString() === userId) {
      return res.status(400).json({ message: 'You cannot delete your own account' });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    await User.findByIdAndDelete(userId);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error deleting user' });
  }
};

module.exports = {
  loginUser,
  createUser,
  getUsers,
  deleteUser
};
