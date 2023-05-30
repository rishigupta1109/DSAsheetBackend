const HttpError = require("./models/HttpError");
const express = require("express");
const app = express();
const mongoose = require("mongoose");
const bodyParser = require("body-parser");
var cors = require("cors");
app.use(bodyParser.json());

app.use(cors());

//routes
const { userRoutes } = require("./routes/User.route");
const { dataRoutes } = require("./routes/Data.route");

app.use("/api/user", userRoutes);
app.use("/api/data", dataRoutes);

app.use((req, res, next) => {
  return next(new HttpError("could not find this route", 404));
});
app.use((error, req, res, next) => {
  if (res.headerSent) {
    return next(error);
  }
  res
    .status(error.code || 500)
    .json({ message: error.message || "an unknown error occured" });
});

mongoose
  .connect(
    `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@${process.env.DB_NAME}.z0nv6c1.mongodb.net/?retryWrites=true&w=majority`
  )
  .then(() => {
    app.listen(process.env.PORT || 5000);
    console.log("connected");
  })
  .catch((err) => {
    console.log(err);
  });
