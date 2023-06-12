const mongoose = require("mongoose");
const Topic = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  sheetId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "Sheet",
  },
  questions: {
    type: Number,
    default: 0,
  },
});
module.exports = mongoose.model("Topic", Topic);
