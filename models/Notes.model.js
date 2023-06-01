const mongoose = require("mongoose");
const Note = mongoose.Schema({
  content: {
    type: String,
    required: true,
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
  },
  questionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Question",
  },
  topicId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Topic",
  },
});

module.exports = mongoose.model("Note", Note);
