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
router.post("/otp", userController.generateOtpforRegister);
router.post("/otpverify", userController.checkOtpforRegister);
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
router.post("/find-friends", checkAuth, userController.findUser);
router.post("/toggle-friend", checkAuth, userController.toggleFriend);
router.post("/leaderboard", checkAuth, userController.getLeaderBoardData);
router.patch("/update", checkAuth, userController.updateUser);
router.post("/reset", userController.generateOtp);
router.post("/reset-otpverify", userController.checkOtp);
router.get("/colleges", userController.getUniqueColleges);
router.get("/top-performers", userController.getTopPerformers);
router.get(
  "/updateQuestionsCount",
  userController.updateCompletedQuestionsCount
);
exports.userRoutes = router;
