const Question = require('../Models/Question');
const xlsx = require('xlsx');

// @desc    Get all questions
// @route   GET /api/questions
// @access  Private/Staff or Admin
const getQuestions = async (req, res) => {
  try {
    const questions = await Question.find().sort({ setName: 1, createdAt: -1 });
    res.json(questions);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error retrieving questions' });
  }
};

// @desc    Create a question
// @route   POST /api/questions
// @access  Private/Staff or Admin
const createQuestion = async (req, res) => {
  try {
    const { questionText, options, correctOptionIndex, setName } = req.body;

    if (!questionText || !options || correctOptionIndex === undefined || !setName) {
      return res.status(400).json({ message: 'Please provide all question fields' });
    }

    if (!['A', 'B', 'C', 'D'].includes(setName)) {
      return res.status(400).json({ message: 'Set Name must be A, B, C, or D' });
    }

    if (!Array.isArray(options) || options.length !== 4) {
      return res.status(400).json({ message: 'Must provide exactly 4 options' });
    }

    const correctIndexNum = Number(correctOptionIndex);
    if (isNaN(correctIndexNum) || correctIndexNum < 0 || correctIndexNum > 3) {
      return res.status(400).json({ message: 'Correct option index must be between 0 and 3' });
    }

    const question = new Question({
      questionText,
      options,
      correctOptionIndex: correctIndexNum,
      setName
    });

    await question.save();
    res.status(201).json({ message: 'Question created successfully', question });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error creating question' });
  }
};

// @desc    Update a question
// @route   PUT /api/questions/:id
// @access  Private/Staff or Admin
const updateQuestion = async (req, res) => {
  try {
    const { questionText, options, correctOptionIndex, setName } = req.body;
    const questionId = req.params.id;

    const question = await Question.findById(questionId);
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    if (setName && !['A', 'B', 'C', 'D'].includes(setName)) {
      return res.status(400).json({ message: 'Set Name must be A, B, C, or D' });
    }

    if (options && (!Array.isArray(options) || options.length !== 4)) {
      return res.status(400).json({ message: 'Must provide exactly 4 options' });
    }

    if (correctOptionIndex !== undefined) {
      const correctIndexNum = Number(correctOptionIndex);
      if (isNaN(correctIndexNum) || correctIndexNum < 0 || correctIndexNum > 3) {
        return res.status(400).json({ message: 'Correct option index must be between 0 and 3' });
      }
      question.correctOptionIndex = correctIndexNum;
    }

    if (questionText) question.questionText = questionText;
    if (options) question.options = options;
    if (setName) question.setName = setName;

    await question.save();
    res.json({ message: 'Question updated successfully', question });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error updating question' });
  }
};

// @desc    Delete a question
// @route   DELETE /api/questions/:id
// @access  Private/Staff or Admin
const deleteQuestion = async (req, res) => {
  try {
    const questionId = req.params.id;
    const question = await Question.findById(questionId);
    
    if (!question) {
      return res.status(404).json({ message: 'Question not found' });
    }

    await Question.findByIdAndDelete(questionId);
    res.json({ message: 'Question deleted successfully' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error deleting question' });
  }
};

// @desc    Import Questions from Excel
// @route   POST /api/questions/upload-excel
// @access  Private/Staff or Admin
const uploadExcelQuestions = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an Excel file' });
    }

    const { setName } = req.body; // A, B, C, or D
    if (!setName || !['A', 'B', 'C', 'D'].includes(setName)) {
      return res.status(400).json({ message: 'Please specify a valid Set (A, B, C, or D)' });
    }

    // Read buffer
    const workbook = xlsx.read(req.file.buffer, { type: 'buffer' });
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    
    // Convert sheet to JSON
    const rows = xlsx.utils.sheet_to_json(sheet);
    
    if (rows.length === 0) {
      return res.status(400).json({ message: 'The Excel file is empty' });
    }

    const importedQuestions = [];
    const skippedRows = [];
    
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const rowNum = i + 2; // +1 for 1-index, +1 for header row

      // Exact column names from user's Excel file
      const questionText = row['Question'];
      const optionA = row['optionA'];
      const optionB = row['option B'];
      const optionC = row['optionC'];
      // optionD column: handle both "optionD" and "option D" variants
      const optionD = row['optionD'] !== undefined ? row['optionD'] : row['option D'];
      const correctAnswer = row['correct Answer'];

      if (!questionText || optionA === undefined || optionB === undefined || optionC === undefined || optionD === undefined || correctAnswer === undefined) {
        skippedRows.push(rowNum);
        continue;
      }

      // Format options array
      const options = [
        String(optionA).trim(),
        String(optionB).trim(),
        String(optionC).trim(),
        String(optionD).trim()
      ];

      // Resolve correctOptionIndex from correctAnswer letter (A/B/C/D)
      let correctOptionIndex = 0;
      const ansStr = String(correctAnswer).trim().toUpperCase();
      if (ansStr === 'A' || ansStr === '1') {
        correctOptionIndex = 0;
      } else if (ansStr === 'B' || ansStr === '2') {
        correctOptionIndex = 1;
      } else if (ansStr === 'C' || ansStr === '3') {
        correctOptionIndex = 2;
      } else if (ansStr === 'D' || ansStr === '4') {
        correctOptionIndex = 3;
      } else {
        // Fallback: match answer text to one of the option texts
        const idx = options.findIndex(opt => opt.toUpperCase() === ansStr);
        if (idx !== -1) {
          correctOptionIndex = idx;
        }
      }

      importedQuestions.push({
        questionText: String(questionText).trim(),
        options,
        correctOptionIndex,
        setName
      });
    }

    // Get existing question texts for this set from DB to prevent duplicates
    const existingQuestions = await Question.find({ setName }).select('questionText');
    const existingTexts = new Set(existingQuestions.map(q => q.questionText.trim().toLowerCase()));

    // Filter out duplicates
    const uniqueQuestions = [];
    let duplicateCount = 0;

    for (const q of importedQuestions) {
      if (existingTexts.has(q.questionText.toLowerCase())) {
        duplicateCount++;
      } else {
        uniqueQuestions.push(q);
        existingTexts.add(q.questionText.toLowerCase()); // prevent duplicates within the uploaded file itself
      }
    }

    if (uniqueQuestions.length === 0) {
      return res.status(400).json({ 
        message: `No new questions could be imported. (Parsed ${importedQuestions.length} questions, but all were identified as duplicates of existing questions in Set ${setName}).`,
        skippedRows
      });
    }

    // Bulk insert into DB
    await Question.insertMany(uniqueQuestions);

    let resMsg = `Successfully imported ${uniqueQuestions.length} new question${uniqueQuestions.length !== 1 ? 's' : ''} into Set ${setName}!`;
    if (duplicateCount > 0) {
      resMsg += ` (${duplicateCount} duplicate questions skipped).`;
    }

    res.json({
      message: resMsg,
      imported: uniqueQuestions.length,
      skipped: skippedRows.length + duplicateCount,
      skippedRows: skippedRows.length > 0 ? skippedRows : undefined
    });
  } catch (error) {
    console.error('Excel upload error:', error);
    res.status(500).json({ message: 'Failed to process Excel upload: ' + error.message });
  }
};

module.exports = {
  getQuestions,
  createQuestion,
  updateQuestion,
  deleteQuestion,
  uploadExcelQuestions
};
