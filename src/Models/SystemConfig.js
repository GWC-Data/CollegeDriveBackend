const mongoose = require('mongoose');

const SystemConfigSchema = new mongoose.Schema({
  testActive: {
    type: Boolean,
    default: true
  },
  shuffleQuestions: {
    type: Boolean,
    default: true
  },
  shuffleOptions: {
    type: Boolean,
    default: true
  },
  totalQuestionsToServe: {
    type: Number,
    default: 30
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('SystemConfig', SystemConfigSchema);
