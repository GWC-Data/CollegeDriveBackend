const express = require('express');
const router = express.Router();
const { registerStudent, loginStudent, getProfile, startTest, submitTest } = require('../Controllers/studentController');
const { authStudent } = require('../middleware/auth');

// Public routes
router.post('/register', registerStudent);
router.post('/login', loginStudent);

// Protected student routes
router.get('/profile', authStudent, getProfile);
router.post('/start-test', authStudent, startTest);
router.post('/submit-test', authStudent, submitTest);

module.exports = router;
