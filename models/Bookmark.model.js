const mongoose = require("mongoose");
const Bookmark = mongoose.Schema({
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
});
module.exports = mongoose.model("Bookmark", Bookmark);
