const jwt = require("jsonwebtoken");
const HttpError = require("../models/HttpError");
module.exports = (req, res, next) => {
  console.log("inn check auth", req.method);
  if (req.method === "OPTIONS") return next();
  try {
    let token = req.headers.authorization.split(" ")[1];
    console.log(token);
    if (!token) {
      throw new Error("Authorization Failed");
    }
    const decodedToken = jwt.verify(token, process.env.SECRET_KEY);
    console.log(decodedToken);
    req.userData = { userId: decodedToken.userId };
    console.log(req.userData);
    console.log("out check auth");
    next();
  } catch (err) {
    console.log(err);
    console.log("out check auth");
    return next(new HttpError("Authorization Failed", 401));
  }
};
