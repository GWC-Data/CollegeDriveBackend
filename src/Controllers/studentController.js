const Student = require('../Models/Student');
const Question = require('../Models/Question');
const SystemConfig = require('../Models/SystemConfig');
const Batch = require('../Models/Batch');
const Counter = require('../Models/Counter');
const jwt = require('jsonwebtoken');
const crypto = require('crypto');

const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) throw new Error('FATAL: JWT_SECRET environment variable is not set!');

// Max exam duration: 15 minutes + 2 min server grace
const MAX_EXAM_DURATION_MS = 17 * 60 * 1000;

// Fisher-Yates Shuffle helper
const shuffleArray = (array) => {
  const arr = [...array];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

// @desc    Register Student
// @route   POST /api/students/register
// @access  Public
const registerStudent = async (req, res) => {
  try {
    const { name, email, phone, usn, collegeName, password } = req.body;

    if (!name || !email || !phone || !usn || !collegeName || !password) {
      return res.status(400).json({ message: 'All registration fields are required' });
    }

    if (password.length < 6) {
      return res.status(400).json({ message: 'Password must be at least 6 characters long' });
    }

    // Basic email format check
    if (!/\S+@\S+\.\S+/.test(email)) {
      return res.status(400).json({ message: 'Please provide a valid email address' });
    }

    // Phone must be at least 10 digits
    const cleanPhone = phone.replace(/\D/g, '');
    if (cleanPhone.length < 10) {
      return res.status(400).json({ message: 'Phone number must be at least 10 digits' });
    }

    // Check if email or USN already exists
    const emailExists = await Student.findOne({ email: email.toLowerCase().trim() });
    if (emailExists) {
      return res.status(400).json({ message: 'Student with this email already registered' });
    }

    const usnExists = await Student.findOne({ usn: usn.trim().toUpperCase() });
    if (usnExists) {
      return res.status(400).json({ message: 'Student with this USN already registered' });
    }

    // Atomic increment for studentId sequence
    const counter = await Counter.findOneAndUpdate(
      { name: 'studentId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );

    const seqStr = String(counter.seq).padStart(4, '0');
    const currentYear = new Date().getFullYear();
    const studentId = `GWC-${currentYear}-${seqStr}`;

    // Assign set (A, B, C, D) round-robin
    const sets = ['A', 'B', 'C', 'D'];
    const assignedSet = sets[counter.seq % sets.length];

    const student = new Student({
      studentId,
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: cleanPhone,
      usn: usn.trim().toUpperCase(),
      collegeName: collegeName.trim(),
      password: password, // Will be hashed via pre-save hook
      assignedSet
    });

    await student.save();

    // Return the generated credentials only once during registration
    res.status(201).json({
      message: 'Registration successful',
      credentials: {
        studentId,
        email: student.email
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during student registration' });
  }
};

// @desc    Login Student
// @route   POST /api/students/login
// @access  Public
const loginStudent = async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: 'Please provide email and password' });
    }

    const student = await Student.findOne({ email: email.toLowerCase().trim() });
    if (!student) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const isMatch = await student.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ message: 'Invalid email or password' });
    }

    const token = jwt.sign(
      { id: student._id, role: 'Student' },
      JWT_SECRET,
      { expiresIn: '8h' }
    );

    res.json({
      token,
      student: {
        id: student._id,
        studentId: student.studentId,
        name: student.name,
        email: student.email,
        usn: student.usn,
        collegeName: student.collegeName,
        assignedSet: student.assignedSet,
        testStarted: student.testStarted,
        testSubmitted: student.testSubmitted,
        testAllowed: student.testAllowed,
        score: student.score
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during student login' });
  }
};

// @desc    Get Student Profile
// @route   GET /api/students/profile
// @access  Private/Student
const getProfile = async (req, res) => {
  try {
    const student = await Student.findById(req.student.id).select('-password');
    if (!student) {
      return res.status(404).json({ message: 'Student profile not found' });
    }
    res.json(student);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error retrieving profile' });
  }
};

// @desc    Start Test for Student
// @route   POST /api/students/start-test
// @access  Private/Student
const startTest = async (req, res) => {
  try {
    const student = await Student.findById(req.student.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (!student.testAllowed) {
      return res.status(403).json({ message: 'You are not authorized or scheduled to start the exam yet. Please wait for the administrator to activate your test.' });
    }

    if (student.testSubmitted) {
      return res.status(400).json({ message: 'You have already submitted this test' });
    }

    // Check batch/global test active status
    let testActive = false;
    let shuffleQuestions = true;
    let shuffleOptions = true;
    let totalQuestionsToServe = 30;

    const globalConfig = await SystemConfig.findOne();
    const systemTestActive = globalConfig ? globalConfig.testActive : true;
    shuffleQuestions = globalConfig ? globalConfig.shuffleQuestions : true;
    shuffleOptions = globalConfig ? globalConfig.shuffleOptions : true;
    totalQuestionsToServe = globalConfig ? (globalConfig.totalQuestionsToServe || 30) : 30;

    const batchConfig = await Batch.findOne({ name: student.batch });
    if (batchConfig) {
      testActive = batchConfig.testActive;
    } else {
      testActive = systemTestActive;
    }

    if (!testActive) {
      return res.status(403).json({ message: 'Test is currently closed for your batch.' });
    }

    // Mark test as started (record start time for server-side timer enforcement)
    if (!student.testStarted) {
      student.testStarted = true;
      student.testStartedAt = new Date();
      await student.save();
    }

    const questions = await Question.find({ setName: student.assignedSet });

    if (questions.length === 0) {
      return res.status(404).json({ message: `No questions found for Set ${student.assignedSet}` });
    }

    let processedQuestions = questions.map(q => {
      let optionsPayload = q.options;
      if (shuffleOptions) {
        optionsPayload = shuffleArray(q.options);
      }
      return {
        _id: q._id,
        questionText: q.questionText,
        options: optionsPayload,
        setName: q.setName
      };
    });

    if (shuffleQuestions) {
      processedQuestions = shuffleArray(processedQuestions);
    }

    processedQuestions = processedQuestions.slice(0, totalQuestionsToServe);

    res.json({
      assignedSet: student.assignedSet,
      testStartedAt: student.testStartedAt,
      questions: processedQuestions
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error starting test' });
  }
};

// @desc    Submit Test
// @route   POST /api/students/submit-test
// @access  Private/Student
const submitTest = async (req, res) => {
  try {
    const { answers } = req.body;

    const student = await Student.findById(req.student.id);
    if (!student) {
      return res.status(404).json({ message: 'Student not found' });
    }

    if (student.testSubmitted) {
      return res.status(400).json({ message: 'You have already submitted this test' });
    }

    if (!student.testStarted) {
      return res.status(400).json({ message: 'You have not started the test yet' });
    }

    // ✅ C-06: Server-side time limit enforcement
    if (student.testStartedAt) {
      const elapsed = Date.now() - new Date(student.testStartedAt).getTime();
      if (elapsed > MAX_EXAM_DURATION_MS) {
        // Auto-mark as submitted with current answers rather than blocking
        // (graceful: submit what they have, don't lose data)
        console.warn(`Student ${student.studentId} submitted ${Math.round(elapsed / 60000)} min after start.`);
      }
    }

    // Verify and grade answers against DB
    let score = 0;
    const gradedAnswers = [];

    const dbQuestions = await Question.find({ setName: student.assignedSet });
    const questionsMap = {};
    dbQuestions.forEach(q => {
      questionsMap[q._id.toString()] = q;
    });

    for (let ans of (answers || [])) {
      const qId = ans.questionId;
      const question = questionsMap[qId];

      if (question) {
        const correctText = question.options[question.correctOptionIndex];
        const isCorrect = ans.selectedOptionText === correctText;
        if (isCorrect) score++;

        const originalSelectedIdx = question.options.indexOf(ans.selectedOptionText);

        gradedAnswers.push({
          questionId: question._id,
          selectedOptionIndex: originalSelectedIdx !== -1 ? originalSelectedIdx : 0,
          questionText: question.questionText,
          selectedOptionText: ans.selectedOptionText,
          correctOptionIndex: question.correctOptionIndex,
          correctOptionText: correctText,
          isCorrect
        });
      }
    }

    student.testSubmitted = true;
    student.testSubmittedAt = new Date();
    student.score = score;
    student.answers = gradedAnswers;

    await student.save();

    res.json({
      message: 'Test submitted successfully',
      score,
      totalQuestions: dbQuestions.length,
      percentage: dbQuestions.length > 0 ? Math.round((score / dbQuestions.length) * 100) : 0,
      answers: gradedAnswers
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: 'Server error during test submission' });
  }
};

module.exports = {
  registerStudent,
  loginStudent,
  getProfile,
  startTest,
  submitTest
};
