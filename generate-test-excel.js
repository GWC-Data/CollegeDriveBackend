const xlsx = require('xlsx');
const path = require('path');

const data = [
  {
    "QuestionsNo": 1,
    "Question": "What is the capital of France?",
    "optionA": "London",
    "option B": "Berlin",
    "optionC": "Paris",
    "optionD": "Rome",
    "correct Answer": "Paris"
  },
  {
    "QuestionsNo": 2,
    "Question": "Which programming language is mainly used for web interactivity?",
    "optionA": "Python",
    "option B": "C++",
    "optionC": "JavaScript",
    "optionD": "SQL",
    "correct Answer": "C"
  },
  {
    "QuestionsNo": 3,
    "Question": "What is 15 + 25?",
    "optionA": "30",
    "option B": "40",
    "optionC": "50",
    "optionD": "60",
    "correct Answer": "B"
  }
];

const ws = xlsx.utils.json_to_sheet(data);
const wb = xlsx.utils.book_new();
xlsx.utils.book_append_sheet(wb, ws, "Questions");

const filePath = path.join(__dirname, 'mock_questions.xlsx');
xlsx.writeFile(wb, filePath);
console.log("Generated mock Excel file at:", filePath);
