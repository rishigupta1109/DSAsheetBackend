const User = require("../models/user.model.js");
const HttpError = require("../models/HttpError");
const { validationResult } = require("express-validator");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");

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
      process.env.SECRET_KEY,
      { expiresIn: "1h" }
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
