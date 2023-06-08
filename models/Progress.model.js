const mongoose = require("mongoose");
const Progress = mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  sheetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Sheet",
  },
  topicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Topic",
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Question",
  },
  completedAt: {
    type: Date,
    default: Date.now(),
  },
});

module.exports = mongoose.model("Progress", Progress);
