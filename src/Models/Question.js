const mongoose = require('mongoose');

const QuestionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: true,
    trim: true
  },
  options: {
    type: [String],
    required: true,
    validate: {
      validator: function(v) {
        return Array.isArray(v) && v.length === 4;
      },
      message: 'A question must have exactly 4 options.'
    }
  },
  correctOptionIndex: {
    type: Number,
    required: true,
    min: 0,
    max: 3
  },
  setName: {
    type: String,
    required: true,
    enum: ['A', 'B', 'C', 'D'],
    trim: true
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Question', QuestionSchema);
