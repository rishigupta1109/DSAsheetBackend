const HttpError = require("../models/HttpError");
const Sheet = require("../models/Sheet.model");
exports.createSheet = async (req, res, next) => {
  const { title, description } = req.body;
  const topics = [],
    questions = [];
  const sheet = new Sheet({
    title,
    description,
    topics,
    questions,
  });
  try {
    await sheet.save();
    res.status(201).json({
      message: "Sheet created successfully",
    });
  } catch (err) {
    return next(new HttpError("Something went wrong", 500));
  }
};
exports.getSheets = async (req, res, next) => {
  try {
    const sheets = await Sheet.find();
    res.status(200).json({
      sheets: sheets,
    });
  } catch (err) {
    console.log(err);
    return next(new HttpError("Something went wrong", 500));
  }
};
