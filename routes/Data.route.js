const {
  getSheets,
  createSheet,
  createTopic,
  getTopics,
  createQuestion,
  getQuestions,
  createMultipleQuestions,
  createNote,
  createProgress,
  deleteSheet,
  deleteTopic,
  toggleRevisited,
  toggleBookmark,
  addMultipleQuestionsWithTopics,
} = require("../controller/data.controller");
const checkAuth = require("../middlewares/check-auth");
const isAdmin = require("../middlewares/isAdmin");

const router = require("express").Router();

router.get("/sheets", getSheets);
router.delete("/sheets/:sheetId", checkAuth, isAdmin, deleteSheet);
router.post("/sheets", checkAuth, isAdmin, createSheet);
router.post("/topics", checkAuth, isAdmin, createTopic);
router.delete("/topics/:topicId", checkAuth, isAdmin, deleteTopic);
router.get("/topics/:sheetId", checkAuth, getTopics);
router.post("/questions", checkAuth, isAdmin, createQuestion);
router.post("/multiple-questions", checkAuth, isAdmin, createMultipleQuestions);
router.get("/questions/:topicId", checkAuth, getQuestions);
router.post("/progress", checkAuth, createProgress);
router.post("/note", checkAuth, createNote);
router.post("/revisited", checkAuth, toggleRevisited);
router.post("/bookmark", checkAuth, toggleBookmark);
router.post("/multi-topics-questions", addMultipleQuestionsWithTopics);

exports.dataRoutes = router;
