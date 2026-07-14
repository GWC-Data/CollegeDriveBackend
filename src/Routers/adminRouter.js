const express = require('express');
const router = express.Router();
const { 
  getDashboardStats, 
  getStudentSubmissions, 
  resetStudentTest,
  getBatches,
  createBatch,
  deleteBatch,
  assignStudentsBatch,
  removeStudentFromBatch,
  startTestForStudents,
  stopTestForStudents,
  startExamForBatch,
  stopExamForBatch
} = require('../Controllers/adminController');
const { authUser, authAdmin } = require('../middleware/auth');

// Protected admin routes
router.get('/stats', authUser, authAdmin, getDashboardStats);
router.get('/students', authUser, authAdmin, getStudentSubmissions);
router.post('/students/:id/reset', authUser, authAdmin, resetStudentTest);
router.post('/students/:id/remove-batch', authUser, authAdmin, removeStudentFromBatch);

// Batch & Group Test controls
router.get('/batches', authUser, authAdmin, getBatches);
router.post('/batches', authUser, authAdmin, createBatch);
router.delete('/batches/:name', authUser, authAdmin, deleteBatch);
router.post('/students/assign-batch', authUser, authAdmin, assignStudentsBatch);
router.post('/students/start-test', authUser, authAdmin, startTestForStudents);
router.post('/students/stop-test', authUser, authAdmin, stopTestForStudents);
router.post('/batches/:name/start-exam', authUser, authAdmin, startExamForBatch);
router.post('/batches/:name/stop-exam', authUser, authAdmin, stopExamForBatch);

module.exports = router;
