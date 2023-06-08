const User = require("../models/User.model");
const HttpError = require("../models/HttpError");
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const ProgressModel = require("../models/Progress.model.js");

exports.signup = async (req, res, next) => {
  const errors = validationResult(req);
  console.log(req.body);
  if (!errors.isEmpty()) {
    return next(new HttpError("Invalid inputs passed", 422));
  }
  const { name, email, password, username } = req.body;
  let existingUser;
  try {
    existingUser = await User.findOne({
      $or: [{ email: email }, { username: username }],
    });
    if (existingUser) {
      return next(new HttpError("User already exists", 422));
    }
    const friends = [];
    const hashedPassword = await bcrypt.hash(password, 12);
    const user = new User({
      name,
      email,
      password: hashedPassword,
      username,
      friends,
    });
    await user.save();
    res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    return next(new HttpError("Signup failed, please try again later", 500));
  }
};

exports.login = async (req, res, next) => {
  const errors = validationResult(req);
  console.log(errors);
  if (!errors.isEmpty()) {
    return next(new HttpError("Invalid inputs passed", 422));
  }
  const { email, password } = req.body;
  let existingUser;
  try {
    existingUser = await User.findOne({ email: email });
    if (!existingUser) {
      return next(new HttpError("User does not exists", 422));
    }
    const isPasswordValid = await bcrypt.compare(
      password,
      existingUser.password
    );
    if (!isPasswordValid) {
      return next(new HttpError("Invalid credentials", 401));
    }
    const token = jwt.sign(
      { userId: existingUser._id, email: existingUser.email },
      process.env.SECRET_KEY
    );
    res.status(200).json({
      userId: existingUser._id,
      email: existingUser.email,
      token: token,
      username: existingUser.username,
      name: existingUser.name,
      friends: existingUser.friends,
      isAdmin: existingUser.isAdmin,
    });
  } catch (err) {
    return next(new HttpError("Login failed, please try again later", 500));
  }
};

exports.checkUsername = async (req, res, next) => {
  const { username } = req.body;
  let existingUser;
  try {
    existingUser = await User.findOne({ username: username });
    res.status(200).json({
      exists: existingUser ? true : false,
    });
  } catch (err) {
    return next(new HttpError("Something went wrong", 500));
  }
};

exports.validateSession = async (req, res, next) => {
  const { userId } = req.userData;
  let existingUser;
  try {
    existingUser = await User.findOne({ _id: userId });
    res.status(200).json({
      userId: existingUser._id,
      email: existingUser.email,
      username: existingUser.username,
      name: existingUser.name,
      friends: existingUser.friends,
      isAdmin: existingUser.isAdmin,
    });
  } catch (err) {
    return next(new HttpError("Something went wrong", 500));
  }
};

exports.findUser = async (req, res, next) => {
  const { query } = req.body;
  try {
    const users = await User.find({
      username: { $regex: query, $options: "i" },
    });
    res.status(200).json({
      users: users,
    });
  } catch (err) {
    return next(new HttpError("Something went wrong", 500));
  }
};

exports.toggleFriend = async (req, res, next) => {
  const { userId, friendId } = req.body;
  try {
    const user = await User.findOne({ _id: userId });
    if (!user) {
      return next(new HttpError("User not found", 404));
    }
    if (user.friends.includes(friendId)) {
      user.friends.pull(friendId);
      await user.save();
      return res.status(200).json({
        message: "Friend removed successfully",
      });
    }
    user.friends.push(friendId);
    await user.save();
    res.status(200).json({
      message: "Friend added successfully",
    });
  } catch (err) {
    console.log(err);
    return next(new HttpError("Something went wrong", 500));
  }
};

exports.getLeaderBoardData = async (req, res, next) => {
  const { userId, sheetId, duration } = req.body;
  try {
    let dayToCompare;
    if (duration === 1) {
      let date = new Date().getDate();
      let month = new Date().getMonth();
      month++;
      let year = new Date().getFullYear();
      if (date < 10) date = `0${date}`;
      if (month < 10) month = `0${month}`;

      console.log(
        date,
        month,
        year,
        new Date(`${year}-${month}-${date}T00:00:00.000`)
      );
      dayToCompare = new Date(
        `${year}-${month}-${date}T00:00:00.000`
      ).toISOString();
    } else {
      dayToCompare = new Date(
        Date.now() - duration * 24 * 60 * 60 * 1000
      ).toISOString();
    }
    if (sheetId === "ALL") {
      const userProgress = await ProgressModel.find({
        userId: userId,
        completedAt: {
          $gte: dayToCompare,
        },
      });
      // console.log(userProgress);

      const user = await User.findOne({ _id: userId });
      if (!user) {
        return next(new HttpError("User not found", 404));
      }
      const friends = user?.friends;
      const leaderboard = [];
      leaderboard.push({
        name: user?.name,
        username: user?.username,
        questions: userProgress?.length || 0,
      });
      if (friends.length === 0)
        return res.status(200).json({
          leaderboard: leaderboard,
        });
      for (let i = 0; i < friends.length; i++) {
        const friend = await User.findOne({ _id: friends[i] });
        const friendProgress = await ProgressModel.find({
          userId: friends[i],
          completedAt: {
            $gte: dayToCompare,
          },
        });
        leaderboard.push({
          name: friend?.name,
          username: friend?.username,
          questions: friendProgress?.length || 0,
        });
      }
      leaderboard.sort((a, b) => b.questions - a.questions);
      return res.status(200).json({
        leaderboard: leaderboard,
      });
    }

    const userProgress = await ProgressModel.find({
      userId: userId,
      sheetId: sheetId,
      completedAt: {
        $gte: dayToCompare,
      },
    });
    // console.log(userProgress);
    const user = await User.findOne({ _id: userId });
    if (!user) {
      return next(new HttpError("User not found", 404));
    }
    const friends = user?.friends;
    const leaderboard = [];
    leaderboard.push({
      name: user?.name,
      username: user?.username,
      questions: userProgress?.length || 0,
    });
    if (friends.length === 0)
      return res.status(200).json({
        leaderboard: leaderboard,
      });
    for (let i = 0; i < friends.length; i++) {
      const friend = await User.findOne({ _id: friends[i] });
      const friendProgress = await ProgressModel.find({
        userId: friends[i],
        sheetId: sheetId,
        completedAt: {
          $gte: dayToCompare,
        },
      });
      leaderboard.push({
        name: friend?.name,
        username: friend?.username,
        questions: friendProgress?.length || 0,
      });
    }
    return res.status(200).json({
      leaderboard: leaderboard,
    });
  } catch (err) {
    console.log(err);
    return next(new HttpError("Something went wrong", 500));
  }
};
