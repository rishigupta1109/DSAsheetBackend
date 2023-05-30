const mongoose = require("mongoose");
const Question = mongoose.Schema({
  title: {
    type: String,
    required: true,
  },
  links: [
    {
      type: String,
    },
  ],
  topicId: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Topic",
    },
  ],
});
module.exports = mongoose.model("Question", Question);
