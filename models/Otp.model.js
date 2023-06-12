const mongoose = require("mongoose");
const otpSchema = mongoose.Schema({
  email: { type: String, required: true },
  code: { type: Number, required: true },
  expiresIn: { type: Number, required: true },
});
module.exports = mongoose.model("otp", otpSchema);
