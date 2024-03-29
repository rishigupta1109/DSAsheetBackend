const mongoose = require("mongoose");
const User = mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  username: {
    type: String,
    unique: true, // unique index and unique constraint
    required: true,
  },
  email: {
    type: String,
    unique: true, // unique index and unique constraint
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  friends: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  ],
  isAdmin: {
    type: Boolean,
    default: false,
  },
  dailyGoal: {
    type: Number,
    default: 5,
  },
  revisitDays: {
    type: Number,
    default: 5,
  },
  college: {
    type: String,
    default: "",
  },
  currentStreak: {
    type: Number,
    default: 0,
  },
  longestStreak: {
    type: Number,
    default: 0,
  },
  lastGoal: {
    type: Date,
    default: null,
  },
  completedQuestions: [
    {
      type: Object,
    },
  ],
});
module.exports = mongoose.model("User", User);
