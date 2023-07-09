const User = require("../models/User.model");
const HttpError = require("../models/HttpError");
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const ProgressModel = require("../models/Progress.model.js");
const SheetModel = require("../models/Sheet.model");
const TopicModel = require("../models/Topic.model");
const BookmarkModel = require("../models/Bookmark.model");
const NotesModel = require("../models/Notes.model");
const QuestionModel = require("../models/Question.model");
const nodemailer = require("nodemailer");
const OtpModel = require("../models/Otp.model");
const UserModel = require("../models/User.model");
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

    let userid = userId;
    // console.log(req.query);
    let sheets = await SheetModel.find();
    sheets = sheets?.map((sheet) => {
      return {
        _id: sheet._id,
        title: sheet.title,
        description: sheet.description,
      };
    });
    const sheetsWithData = [];
    const allTopics = await TopicModel.find({
      $or: [
        ...sheets.map((sheet) => {
          return { sheetId: sheet._id };
        }),
      ],
    });
    // console.log(
    //   [
    //     ...sheets.map((sheet) => {
    //       return { sheetId: sheet._id };
    //     }),
    //   ],
    //   allTopics
    // );
    // const allQuestions = await QuestionModel.find({
    //   topicId: { $in: allTopics.map((topic) => topic._id) },
    // });
    for (let sheet of sheets) {
      let topics = [...allTopics];
      topics = topics.filter((topic) => {
        // console.log(topic.sheetId, sheet._id);
        return topic.sheetId.toString() == sheet._id.toString();
      });
      // console.log({ topics });
      sheet.topics = topics;
      sheet.questions = 0;
      for (let topic of topics) {
        sheet.questions += topic.questions;
      }
      sheetsWithData?.push(sheet);
    }
    // console.log(sheetsWithData);
    // console.log(userid);

    const progress = await ProgressModel.find({
      userId: userid,
    });
    // console.log(progress);
    // console.log(userid, progress, notes);
    let sheetsWithProgress = [];
    for (let sheet of sheetsWithData) {
      let progressData = progress.filter(
        (p) => p?.sheetId == sheet?._id.toString()
      );
      // console.log(progressData, sheet?._id, progress[0]?._id);
      if (progressData?.length > 0) {
        sheet.completed = progressData?.length;
        const completedToday = progressData.filter((p) => {
          const today = new Date();
          const date = new Date(p.completedAt);
          return (
            date.getDate() === today.getDate() &&
            date.getMonth() === today.getMonth() &&
            date.getFullYear() === today.getFullYear()
          );
        });
        sheet.completedToday = completedToday.map((q) => ({
          questionId: q.questionId,
        }));
        const toRevisit = progressData.filter((p) => {
          if (p?.revisited) return false;
          const today = new Date();
          const date = new Date(p.completedAt);
          return (
            today.getTime() - date.getTime() >=
            existingUser.revisitDays * 24 * 60 * 60 * 1000
          );
        });
        sheet.toRevisit = toRevisit.map((q) => ({
          questionId: q.questionId,
        }));
      } else {
        sheet.completed = 0;
        sheet.completedToday = [];
        sheet.toRevisit = [];
      }
      sheetsWithProgress.push(sheet);
    }
    // console.log(sheetsWithProgress[0].questions);
    // console.log({ sheetsWithProgress });

    res.status(200).json({
      userId: existingUser._id,
      email: existingUser.email,
      username: existingUser.username,
      name: existingUser.name,
      friends: existingUser.friends,
      isAdmin: existingUser.isAdmin,
      dailyGoal: existingUser.dailyGoal,
      revisitDays: existingUser.revisitDays,
      currentStreak: existingUser?.currentStreak || 0,
      longestStreak: existingUser?.longestStreak || 0,
      lastGoal: existingUser?.lastGoal || null,
      college: existingUser.college,
      sheets: sheetsWithProgress,
    });
  } catch (err) {
    console.log(err);
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
  const { userId, sheetId, duration, withs } = req.body;
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
    } else if (duration === -1) {
      //store oldest date in day to compare
      dayToCompare = new Date(
        Date.now() - 100 * 365 * 24 * 60 * 60 * 1000
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
      let friends = user?.friends;
      if (withs === "ALL") {
        friends = await User.find();
        friends = friends
          .map((f) => f._id.toString())
          .filter((f) => f !== userId);
      } else if (withs != "Friends") {
        friends = await User.find({ college: withs });
        friends = friends
          .map((f) => f._id.toString())
          .filter((f) => f !== userId);
      }
      const leaderboard = [];
      leaderboard.push({
        name: user?.name,
        username: user?.username,
        questions: userProgress?.length || 0,
        currentStreak: user?.currentStreak || 0,
        longestStreak: user?.longestStreak || 0,
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
          currentStreak: friend?.currentStreak || 0,
          longestStreak: friend?.longestStreak || 0,
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
    let friends = user?.friends;
    if (withs === "ALL") {
      friends = await User.find();
      friends = friends
        .map((f) => f._id.toString())
        .filter((f) => f !== userId);
    } else if (withs != "Friends") {
      friends = await User.find({ college: withs });
      friends = friends
        .map((f) => f._id.toString())
        .filter((f) => f !== userId);
    }
    const leaderboard = [];
    leaderboard.push({
      name: user?.name,
      username: user?.username,
      questions: userProgress?.length || 0,
      currentStreak: user?.currentStreak || 0,
      longestStreak: user?.longestStreak || 0,
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
        currentStreak: friend?.currentStreak || 0,
        longestStreak: friend?.longestStreak || 0,
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

exports.updateUser = async (req, res, next) => {
  const { userId, name, dailyGoal, revisitDays, college } = req.body;
  console.log(req.body);
  try {
    const user = await User.findOneAndUpdate(
      { _id: userId },
      {
        name: name,
        dailyGoal: parseInt(dailyGoal) || 0,
        revisitDays: parseInt(revisitDays) || 0,
        college,
      }
    );
    res.status(200).json({
      user: user,
      message: "User updated successfully",
    });
  } catch (err) {
    console.log(err);
    return next(new HttpError("Something went wrong", 500));
  }
};

const mail = (email, otp) => {
  const transporter = nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: "thebookbajaar@gmail.com",
      pass: "yihuoxpbqpcqhobv",
    },
  });

  const mailOptions = {
    from: "thebookbajaar@gmail.com",
    to: email,
    subject: `OTP to set password`,
    text: `The otp to set your password is ${otp}. Thanks,Sheet Code`,
    replyTo: "thebookbajaar@gmail.com",
  };
  transporter.sendMail(mailOptions, function (err, res) {
    if (err) {
      console.error("there was an error: ", err);
    } else {
      console.log("here is the res: ", res);
    }
  });
};
const generateOtp = async (req, res, next) => {
  let email = req.body.email;
  if (!email) {
    return next(new HttpError("Email is required", 404));
  }
  let user;
  try {
    user = await User.findOne({ email: email });
  } catch (err) {
    console.log(err);
    return next(new HttpError("something went wrong", 404));
  }
  if (!user) {
    return next(new HttpError("User not found", 404));
  }
  if (user) {
    let code = await OtpModel.findOne({ email: email });
    let otp = Math.floor(Math.random() * (9999 - 1000) + 1000);
    if (code) {
      code.expiresIn = new Date().getTime() + 300 * 1000;
      code.code = otp;
      try {
        await code.save();
      } catch (err) {
        console.log(err);
        return next(new HttpError("something went wrong", 404));
      }
    } else {
      code = new OtpModel({
        email: email,
        code: otp,
        expiresIn: new Date().getTime() + 300 * 1000,
      });
      try {
        await code.save();
      } catch (err) {
        console.log(err);
        return next(new HttpError("something went wrong", 404));
      }
    }
    mail(email, otp);
    res.json({ message: "otp sent to your number", status: "success" });
  } else {
    return next(new HttpError("user does not exists", 404));
  }
};
const checkOtp = async (req, res, next) => {
  const { email, password, otp } = req.body;
  console.log(req.body);
  if (!email || !password || !otp) {
    return next(new HttpError("All fields are required", 404));
  }
  let userOtp;
  try {
    userOtp = await OtpModel.findOne({ email: email, code: otp });
  } catch (err) {
    console.log(err);
    return next(new HttpError("something went wrong", 404));
  }
  if (userOtp) {
    let expiry = new Date(userOtp.expiresIn);
    if (expiry > new Date()) {
      let user;
      try {
        user = await User.findOne({ email: email });
      } catch (err) {
        console.log(err);
        return next(new HttpError("something went wrong", 500));
      }
      let hashedPassword;
      try {
        hashedPassword = await bcrypt.hash(password, 12);
      } catch (err) {
        console.log(err);
        return next(
          new HttpError("something went wrong , please try again later", 500)
        );
      }
      user.password = hashedPassword;
      try {
        console.log(userOtp);
        await user.save();
      } catch (err) {
        console.log(err);
        return next(
          new HttpError("something went wrong , please try again later", 500)
        );
      }

      res.json({ message: "password changed succesfuuly", status: "success" });
    } else {
      return next(new HttpError("Otp expired", 404));
    }
  } else {
    return next(new HttpError("wrong otp", 404));
  }
};
exports.generateOtp = generateOtp;
exports.checkOtp = checkOtp;

exports.generateOtpforRegister = async (req, res, next) => {
  const { email, username: userName } = req.body;
  if (!email || !userName) {
    return next(new HttpError("All fields are required", 404));
  }
  let user;
  try {
    user = await UserModel.findOne({
      $or: [
        { email: email },
        {
          username: userName,
        },
      ],
    });
    if (user) {
      return next(new HttpError("User already exists", 404));
    }
    let code = await OtpModel.findOne({ email: email });
    let otp = Math.floor(Math.random() * (9999 - 1000) + 1000);
    if (code) {
      code.expiresIn = new Date().getTime() + 300 * 1000;
      code.code = otp;
      try {
        await code.save();
      } catch (err) {
        console.log(err);
        return next(new HttpError("something went wrong", 404));
      }
    } else {
      code = new OtpModel({
        email: email,
        code: otp,
        expiresIn: new Date().getTime() + 300 * 1000,
      });
      try {
        await code.save();
      } catch (err) {
        console.log(err);
        return next(new HttpError("something went wrong", 404));
      }
    }
    mail(email, otp);
    res.json({ message: "otp sent to your email", status: "success" });
  } catch (err) {
    console.log(err);
    return next(new HttpError("something went wrong", 404));
  }
};
exports.checkOtpforRegister = async (req, res, next) => {
  const { email, otp } = req.body;
  console.log(req.body);
  if (!email || !otp) {
    return next(new HttpError("All fields are required", 404));
  }
  let userOtp;
  try {
    userOtp = await OtpModel.findOne({ email: email, code: otp });
  } catch (err) {
    console.log(err);
    return next(new HttpError("something went wrong", 404));
  }
  if (userOtp) {
    let expiry = new Date(userOtp.expiresIn);
    if (expiry > new Date()) {
      res.status(200).json({ message: "correct otp", status: 200 });
    } else {
      return next(new HttpError("Otp expired", 404));
    }
  } else {
    return next(new HttpError("wrong otp", 404));
  }
};
exports.getUniqueColleges = async (req, res, next) => {
  try {
    let colleges = await User.find().select("college");
    colleges = colleges.map((college) => college.college);
    colleges = colleges.filter((college) => !!college);
    console.log(new Set(colleges));
    res.json({ colleges: Array.from(new Set(colleges)) });
  } catch (err) {
    console.log(err);
    return next(new HttpError("something went wrong", 404));
  }
};

exports.getTopPerformers = async (req, res, next) => {
  try {
    let progressThisYear = await ProgressModel.find({
      completedAt: {
        $gte: new Date(new Date().getFullYear(), 0, 1),
        $lt: new Date(new Date().getFullYear(), 11, 31),
      },
    });
    // console.log(progressThisYear);
    let progressPerMonth = {};
    progressThisYear.forEach((progress) => {
      let month = new Date(progress.completedAt).getMonth();
      if (progressPerMonth[month]) {
        progressPerMonth[month].push(progress);
      }
      if (!progressPerMonth[month]) {
        progressPerMonth[month] = [progress];
      }
    });
    // console.log(progressPerMonth);
    let userPerMonth = {};
    for (let month in progressPerMonth) {
      let users = [];
      progressPerMonth[month].forEach((progress) => {
        let user = users.find((user) => user._id == progress.userId.toString());
        if (user) {
          user.questions += 1;
        } else {
          users.push({ _id: progress.userId.toString(), questions: 1 });
        }
      });
      userPerMonth[month] = users;
    }
    console.log(userPerMonth);
    let topPerformersPerMonth = {};
    for (let month in userPerMonth) {
      let users = userPerMonth[month];
      users.sort((a, b) => b.questions - a.questions);
      topPerformersPerMonth[month] = users.slice(0, 3);
    }
    console.log(topPerformersPerMonth);
    for (let month in topPerformersPerMonth) {
      let users = topPerformersPerMonth[month];
      for (let i = 0; i < users.length; i++) {
        let user = await User.findById(users[i]._id);
        users[i].username = user.username;
        users[i].name = user.name;
      }
    }
    console.log(topPerformersPerMonth);
    res.json({
      topPerformersPerMonth: topPerformersPerMonth,
    });
  } catch (err) {
    console.log(err);
    return next(new HttpError("something went wrong", 500));
  }
};
