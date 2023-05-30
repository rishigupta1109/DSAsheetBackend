const express = require("express");
const router = express.Router();
const userController = require("../controller/user.controller.js");
const checkAuth = require("../middlewares/check-auth");
const { check } = require("express-validator");
router.post(
  "/signup",
  [
    check("name").not().isEmpty(),
    check("email").normalizeEmail().isEmail(),
    check("password").isLength({ min: 6 }),
    check("username").not().isEmpty(),
  ],
  userController.signup
);
router.post(
  "/login",
  [
    check("email").normalizeEmail().isEmail(),
    check("password").isLength({ min: 6 }),
  ],
  userController.login
);
router.post(
  "/check-username",
  [check("username").not().isEmpty()],
  userController.checkUsername
);
router.get("/validate-session", checkAuth, userController.validateSession);
exports.userRoutes = router;
