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
});
module.exports = mongoose.model("Topic", Topic);
