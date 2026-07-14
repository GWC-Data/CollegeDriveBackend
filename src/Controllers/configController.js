const SystemConfig = require('../Models/SystemConfig');

// @desc    Get global config
// @route   GET /api/config
// @access  Public
const getConfig = async (req, res) => {
  try {
    let config = await SystemConfig.findOne();
    if (!config) {
      config = new SystemConfig();
      await config.save();
    }
    res.json(config);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error retrieving system configuration' });
  }
};

// @desc    Update global config
// @route   PUT /api/config
// @access  Private/Staff or Admin
const updateConfig = async (req, res) => {
  try {
    const { testActive, shuffleQuestions, shuffleOptions, totalQuestionsToServe, testDuration } = req.body;
    
    let config = await SystemConfig.findOne();
    if (!config) {
      config = new SystemConfig();
    }

    // Admins can update everything; Staff can update shuffle configurations
    if (req.user.role === 'Admin') {
      if (testActive !== undefined) config.testActive = testActive;
      if (shuffleQuestions !== undefined) config.shuffleQuestions = shuffleQuestions;
      if (shuffleOptions !== undefined) config.shuffleOptions = shuffleOptions;
      if (totalQuestionsToServe !== undefined) config.totalQuestionsToServe = Number(totalQuestionsToServe);
      if (testDuration !== undefined) config.testDuration = Number(testDuration);
    } else if (req.user.role === 'Staff') {
      // Staff cannot toggle testActive, only shuffle options/questions as requested
      if (shuffleQuestions !== undefined) config.shuffleQuestions = shuffleQuestions;
      if (shuffleOptions !== undefined) config.shuffleOptions = shuffleOptions;
      if (testActive !== undefined || totalQuestionsToServe !== undefined || testDuration !== undefined) {
        return res.status(403).json({ message: 'Access denied: Staff cannot change test active status, questions count, or test duration' });
      }
    }

    await config.save();
    res.json({ message: 'Configuration updated successfully', config });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating configuration' });
  }
};

module.exports = {
  getConfig,
  updateConfig
};
