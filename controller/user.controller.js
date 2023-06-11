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
    for (let sheet of sheets) {
      const topics = await TopicModel.find({
        sheetId: sheet?._id,
      });
      sheet.topics = topics;
      sheet.questions = [];
      for (let topic of topics) {
        const questions = await QuestionModel.find({
          topicId: { $in: topic._id },
        });
        sheet.questions = [...sheet.questions, ...questions];
      }
      sheetsWithData?.push(sheet);
    }
    // console.log(sheetsWithData);
    // console.log(userid);

    const progress = await ProgressModel.find({
      userId: userid,
    });

    const notes = await NotesModel.find({
      userId: userid,
    });

    const bookmarks = await BookmarkModel.find({
      userId: userid,
    });

    // console.log(userid, progress, notes);
    let sheetsWithProgress = [];
    sheetsWithProgress = sheetsWithData.map((sheet) => {
      return {
        ...sheet,
        questions: sheet?.questions?.map((question) => {
          question.isCompleted =
            !!progress?.find((p) => {
              return p.questionId.toString() === question._id.toString();
            }) || false;
          question.notes =
            notes?.find((n) => {
              return n.questionId.toString() === question._id.toString();
            })?.content || "";
          question.completedAt =
            progress?.find((p) => {
              return p.questionId.toString() === question._id.toString();
            })?.completedAt || "";
          question.revisited =
            progress?.find((p) => {
              return p.questionId.toString() === question._id.toString();
            })?.revisited || false;
          question.bookmarked =
            !!bookmarks?.find((b) => {
              return b.questionId.toString() === question._id.toString();
            }) || false;
          return {
            ...question._doc,
            isCompleted: question?.isCompleted,
            notes: question?.notes,
            completedAt: question?.completedAt,
            revisited: question?.revisited,
            bookmarked: question?.bookmarked,
          };
        }),
      };
    });
    // console.log(sheetsWithProgress[0].questions);

    res.status(200).json({
      userId: existingUser._id,
      email: existingUser.email,
      username: existingUser.username,
      name: existingUser.name,
      friends: existingUser.friends,
      isAdmin: existingUser.isAdmin,
      dailyGoal: existingUser.dailyGoal,
      revisitDays: existingUser.revisitDays,
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

exports.updateUser = async (req, res, next) => {
  const { userId, name, dailyGoal, revisitDays } = req.body;
  console.log(req.body);
  try {
    const user = await User.findOneAndUpdate(
      { _id: userId },
      {
        name: name,
        dailyGoal: parseInt(dailyGoal) || 0,
        revisitDays: parseInt(revisitDays) || 0,
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
