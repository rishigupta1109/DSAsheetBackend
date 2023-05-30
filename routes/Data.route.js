const { getSheets, createSheet } = require("../controller/data.controller");
const checkAuth = require("../middlewares/check-auth");
const isAdmin = require("../middlewares/isAdmin");

const router = require("express").Router();

router.get("/sheets", getSheets);
router.post("/sheets", checkAuth, isAdmin, createSheet);

exports.dataRoutes = router;
