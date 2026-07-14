const mongoose = require('mongoose');
const bcrypt = require('bcrypt');

const StudentAnswerSchema = new mongoose.Schema({
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Question',
    required: true
  },
  selectedOptionIndex: {
    type: Number,
    required: true
  },
  questionText: String,
  selectedOptionText: String,
  correctOptionIndex: Number,
  correctOptionText: String,
  isCorrect: Boolean
});

const StudentSchema = new mongoose.Schema({
  studentId: {
    type: String,
    required: true,
    unique: true
  },
  name: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  email: {
    type: String,
    required: true,
    unique: true,
    lowercase: true,
    trim: true
  },
  usn: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  collegeName: {
    type: String,
    required: true,
    trim: true
  },
  password: {
    type: String,
    required: true
  },
  assignedSet: {
    type: String,
    enum: ['A', 'B', 'C', 'D'],
    default: 'A'
  },
  batch: {
    type: String,
    default: 'Unassigned'
  },
  testAllowed: {
    type: Boolean,
    default: false
  },
  testStarted: {
    type: Boolean,
    default: false
  },
  testStartedAt: {
    type: Date
  },
  testSubmitted: {
    type: Boolean,
    default: false
  },
  testSubmittedAt: {
    type: Date
  },
  score: {
    type: Number,
    default: 0
  },
  answers: [StudentAnswerSchema]
}, {
  timestamps: true
});

// Pre-save hook to hash passwords
StudentSchema.pre('save', async function() {
  if (!this.isModified('password')) return;
  const salt = await bcrypt.genSalt(10);
  this.password = await bcrypt.hash(this.password, salt);
});

// Helper method to compare passwords
StudentSchema.methods.comparePassword = async function(candidatePassword) {
  return await bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model('Student', StudentSchema);
