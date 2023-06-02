const HttpError = require("../models/HttpError");
const User = require("../models/User.model");

module.exports = async (req, res, next) => {
  console.log("inn check auth", req.method);
  if (req.method === "OPTIONS") return next();
  try {
    console.log(req.userData);
    const user = await User.findOne({ _id: req.userData.userId });
    console.log(user);
    if (!user) {
      throw new Error("Authorization Failed");
    }
    if (!user.isAdmin) {
      throw new Error("Authorization Failed");
    }
    req.userData = user;
    console.log(req.userData);
    console.log("out check admin");
    next();
  } catch (err) {
    console.log(err);
    console.log("out check admin");
    return next(new HttpError("Authorization Failed", 401));
  }
};
