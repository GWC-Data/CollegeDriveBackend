const express = require('express');
const router = express.Router();
const { getConfig, updateConfig } = require('../Controllers/configController');
const { authUser, authStaffOrAdmin } = require('../middleware/auth');

// Public route to fetch configuration
router.get('/', getConfig);

// Protected route to update config
router.put('/', authUser, authStaffOrAdmin, updateConfig);

module.exports = router;
