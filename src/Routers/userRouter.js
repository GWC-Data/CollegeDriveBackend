const express = require('express');
const router = express.Router();
const { loginUser, createUser, getUsers, deleteUser } = require('../Controllers/userController');
const { authUser, authAdmin } = require('../middleware/auth');

// Public login route
router.post('/login', loginUser);

// Admin-only management routes
router.post('/', authUser, authAdmin, createUser);
router.get('/', authUser, authAdmin, getUsers);
router.delete('/:id', authUser, authAdmin, deleteUser);

module.exports = router;
