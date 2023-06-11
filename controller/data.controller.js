const BookmarkModel = require("../models/Bookmark.model");
const HttpError = require("../models/HttpError");
const NotesModel = require("../models/Notes.model");
const ProgressModel = require("../models/Progress.model");
const QuestionModel = require("../models/Question.model");
const Sheet = require("../models/Sheet.model");
const TopicModel = require("../models/Topic.model");
const Topic = require("../models/Topic.model");
var ObjectId = require("mongoose").Types.ObjectId;
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
    // console.log(req.query);
    let sheets = await Sheet.find();
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
      sheet.questions = 0;
      for (let topic of topics) {
        const questions = await QuestionModel.find({
          topicId: { $in: topic._id },
        });
        sheet.questions += questions.length;
      }
      sheetsWithData?.push(sheet);
    }
    return res.status(200).json({
      sheets: sheetsWithData,
    });
  } catch (err) {
    console.log(err);
    return next(new HttpError("Something went wrong", 500));
  }
};

exports.createTopic = async (req, res, next) => {
  const { name, sheetId } = req.body;
  const topic = new Topic({
    name,
    sheetId,
  });
  try {
    await topic.save();
    res.status(201).json({
      message: "Topic created successfully",
      data: topic,
    });
  } catch (err) {
    return next(new HttpError("Something went wrong", 500));
  }
};
exports.getTopics = async (req, res, next) => {
  const sheetId = req.params.sheetId;
  const userId = req?.userData?.userId;
  console.log({
    sheetId,
    userId,
  });
  try {
    const topics = await Topic.find({
      sheetId: sheetId,
    });
    const progress = await ProgressModel.find({
      userId: userId,
      sheetId: sheetId,
    });
    console.log(progress);
    const topicswithProgress = [];
    for (let topic of topics) {
      const questions = await QuestionModel.find({
        topicId: { $in: topic._id },
      });
      topic.questions = questions?.length;
      const topicProgress = progress.filter((p) => {
        console.log(p.topicId.toString(), topic._id.toString());
        return p.topicId.toString() === topic._id.toString();
      });

      topic.completedQuestions = topicProgress.length;
      const toRevisit = topicProgress.filter((p) => {
        if (p?.revisited) return false;
        const today = new Date();
        const date = new Date(p.completedAt);
        return (
          today.getTime() - date.getTime() >=
          existingUser.revisitDays * 24 * 60 * 60 * 1000
        );
      });
      topic.toRevisit = toRevisit.length;

      topicswithProgress.push({
        ...topic._doc,
        questions: topic?.questions,
        completedQuestions: topic?.completedQuestions,
        toRevisit: topic?.toRevisit,
      });
    }
    console.log(topicswithProgress);
    res.status(200).json({
      topics: topicswithProgress,
    });
  } catch (err) {
    console.log(err);
    return next(new HttpError("Something went wrong", 500));
  }
};
exports.createQuestion = async (req, res, next) => {
  const { title, links, topicId } = req.body;
  const question = new QuestionModel({
    title,
    links,
    topicId,
  });
  try {
    await question.save();
    res.status(201).json({
      message: "Question created successfully",
    });
  } catch (err) {
    return next(new HttpError("Something went wrong", 500));
  }
};
exports.createMultipleQuestions = async (req, res, next) => {
  const { questions } = req.body;
  try {
    // console.log(questions);
    const createdQuestions = await QuestionModel.insertMany(questions);
    res.status(201).json({
      createdQuestions: createdQuestions,
      message: "Questions created successfully",
    });
  } catch (err) {
    console.log(err);
    return next(new HttpError("Something went wrong", 500));
  }
};

exports.getQuestions = async (req, res, next) => {
  const topicId = req?.params?.topicId;
  const userId = req?.userData?.userId;
  try {
    const questions = await QuestionModel.find({
      topicId: topicId,
    });
    if (!userId) {
      return res.status(200).json({
        questions: questions,
      });
    }
    const completedQuestions = await ProgressModel.find({
      userId: req.userData.userId,
      topicId: topicId,
    });
    const Notes = await NotesModel.find({
      userId: userId,
      topicId: topicId,
    });
    const bookmarks = await BookmarkModel.find({
      userId: userId,
      topicId: topicId,
    });
    const questionsWithProgress = questions.map((question) => {
      const completed = completedQuestions.find((completedQuestion) => {
        return (
          completedQuestion.questionId.toString() === question._id.toString()
        );
      });
      const notes = Notes.find((note) => {
        return note.questionId.toString() === question._id.toString();
      });

      const bookmarked = bookmarks.find((bookmark) => {
        return bookmark.questionId.toString() === question._id.toString();
      });

      return {
        ...question._doc,
        isCompleted: !!completed,
        notes: notes?.content,
        completedAt: completed?.completedAt,
        revisited: completed?.revisited || false,
        bookmarked: !!bookmarked,
      };
    });

    res.status(200).json({
      questions: questionsWithProgress,
    });
  } catch (err) {
    console.log(err);
    return next(new HttpError("Something went wrong", 500));
  }
};
exports.createNote = async (req, res, next) => {
  const { questionId, content, topicId, userId } = req.body;
  try {
    const exists = await NotesModel.findOne({
      questionId,
      topicId,
      userId,
    });
    if (exists) {
      await NotesModel.updateOne(exists, { content });
      return res.status(200).json({
        message: "Note Updated successfully",
      });
    }
    const note = new NotesModel({
      questionId,
      content,
      topicId,
      userId,
    });
    await note.save();
    res.status(201).json({
      message: "Note created successfully",
    });
  } catch (err) {
    console.log(err);
    return next(new HttpError("Something went wrong", 500));
  }
};

exports.createProgress = async (req, res, next) => {
  const { questionId, topicId, userId, sheetId } = req.body;
  console.log(req.body);
  try {
    const exists = await ProgressModel.findOne({
      questionId,
      topicId,
      userId,
      sheetId,
    });
    if (exists) {
      await ProgressModel.deleteOne({
        questionId,
        topicId,
        userId,
        sheetId,
      });
      return res.status(200).json({
        message: "Progress deleted successfully",
      });
    }
    const progress = new ProgressModel({
      questionId,
      topicId,
      userId,
      sheetId,
    });
    await progress.save();
    res.status(201).json({
      message: "Progress created successfully",
    });
  } catch (err) {
    console.log(err);
    return next(new HttpError("Something went wrong", 500));
  }
};
exports.toggleBookmark = async (req, res, next) => {
  const { questionId, topicId, userId, sheetId } = req.body;
  console.log(req.body);
  try {
    const exists = await BookmarkModel.findOne({
      questionId,
      topicId,
      userId,
      sheetId,
    });
    if (exists) {
      await BookmarkModel.deleteOne({
        questionId,
        topicId,
        userId,
        sheetId,
      });
      return res.status(200).json({
        message: "Bookmark deleted successfully",
      });
    }

    const bookmark = new BookmarkModel({
      questionId,
      topicId,
      userId,
      sheetId,
    });
    await bookmark.save();
    res.status(200).json({
      message: "Bookmark toggled successfully",
    });
  } catch (err) {
    console.log(err);
    return next(new HttpError("Something went wrong", 500));
  }
};
exports.toggleRevisited = async (req, res, next) => {
  const { questionId, topicId, userId, sheetId } = req.body;

  console.log(req.body);
  try {
    const exists = await ProgressModel.findOne({
      questionId,
      topicId,
      userId,
      sheetId,
    });
    console.log(exists);
    if (!exists) {
      return res.status(404).json({
        message: "Progress not found",
      });
    }

    let prog = await ProgressModel.updateOne(
      {
        questionId,
        topicId,
        userId,
        sheetId,
      },
      { revisited: !exists?.revisited },
      {
        new: true,
      }
    );
    console.log(prog);
    res.status(200).json({
      message: "Revisited toggled successfully",
    });
  } catch (err) {
    console.log(err);
    return next(new HttpError("Something went wrong", 500));
  }
};
exports.deleteSheet = async (req, res, next) => {
  const { sheetId } = req.params;
  try {
    const sheet = await Sheet.findById(sheetId);
    if (!sheet) {
      return next(new HttpError("Sheet not found", 404));
    }
    const topics = await Topic.find({ sheetId: sheetId });
    for (let topic of topics) {
      await QuestionModel.deleteMany({ topicId: topic._id });
      await NotesModel.deleteMany({ topicId: topic._id });
      await ProgressModel.deleteMany({ topicId: topic._id });
    }
    await Topic.deleteMany({ sheetId: sheetId });
    await Sheet.deleteOne({ _id: sheetId });
    res.status(200).json({
      message: "Sheet deleted successfully",
    });
  } catch (err) {
    console.log(err);
    return next(new HttpError("Something went wrong", 500));
  }
};
exports.deleteTopic = async (req, res, next) => {
  const { topicId } = req.params;
  try {
    const topic = await Topic.findById({ _id: topicId });
    if (!topic) {
      return next(new HttpError("Topic not found", 404));
    }
    await Topic.deleteOne({ _id: topicId });
    await QuestionModel.deleteMany({ topicId: topicId });
    await NotesModel.deleteMany({ topicId: topicId });
    await ProgressModel.deleteMany({ topicId: topicId });
    res.status(200).json({
      message: "Topic deleted successfully",
    });
  } catch (err) {
    console.log(err);
    return next(new HttpError("Something went wrong", 500));
  }
};

// {
//   questionId: '64773a3209a33cf1a3ea6f55',
//   userId: '647d93bd2ff12941fa1ef7e8',
//   topicId: '6477393e09a33cf1a3ea6f51',
//   sheetId: '64763ff62ae6540f7acd8415'
// }
