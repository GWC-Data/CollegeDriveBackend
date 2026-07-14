const express = require('express');
const router = express.Router();
const multer = require('multer');
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

const { getQuestions, createQuestion, updateQuestion, deleteQuestion, uploadExcelQuestions } = require('../Controllers/questionController');
const { authUser, authStaffOrAdmin } = require('../middleware/auth');

// Protected admin/staff CRUD routes
router.get('/', authUser, authStaffOrAdmin, getQuestions);
router.post('/', authUser, authStaffOrAdmin, createQuestion);
router.put('/:id', authUser, authStaffOrAdmin, updateQuestion);
router.delete('/:id', authUser, authStaffOrAdmin, deleteQuestion);
router.post('/upload-excel', authUser, authStaffOrAdmin, upload.single('file'), uploadExcelQuestions);

module.exports = router;
