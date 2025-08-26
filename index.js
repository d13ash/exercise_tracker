const express = require('express');
const mongoose = require('mongoose')
require('dotenv').config()

mongoose.connect(process.env.MONGO_URI)
.then(() => console.log("MongoDB connected"))
.catch(err => console.error(err));

const app = express();
const bodyParser = require('body-parser');
const cors = require('cors');

app.use(cors());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(express.static('public'));


// Mongoose Schemas
const userSchema = new mongoose.Schema({
  username: { type: String, required: true }
});

const exerciseSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  description: { type: String, required: true },
  duration: { type: Number, required: true },
  date: { type: Date, required: true }
});

const User = mongoose.model('User', userSchema);
const Exercise = mongoose.model('Exercise', exerciseSchema);

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/views/index.html');
});

// POST /api/users with form data username to create a new user
app.post('/api/users', async (req, res) => {
  const username = req.body.username;
  if (!username) return res.status(400).json({ error: 'Username required' });
  try {
    const newUser = new User({ username });
    await newUser.save();
    res.json({ username: newUser.username, _id: newUser._id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// GET /api/users to get a list of all users
app.get('/api/users', async (req, res) => {
  try {
    const allUsers = await User.find({}, 'username _id');
    res.json(allUsers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/users/:_id/exercises
app.post('/api/users/:_id/exercises', async (req, res) => {
  const { _id } = req.params;
  const { description, duration, date } = req.body;
  if (!description || !duration) return res.status(400).json({ error: 'Description and duration required' });
  let exerciseDate = date ? new Date(date) : new Date();
  if (exerciseDate.toString() === 'Invalid Date') exerciseDate = new Date();
  try {
    const user = await User.findById(_id);
    if (!user) return res.status(400).json({ error: 'User not found' });
    const newExercise = new Exercise({
      userId: user._id,
      description,
      duration: Number(duration),
      date: exerciseDate
    });
    await newExercise.save();
    res.json({
      username: user.username,
      description: newExercise.description,
      duration: newExercise.duration,
      date: newExercise.date.toDateString(),
      _id: user._id
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add exercise' });
  }
});

// GET /api/users/:_id/logs
app.get('/api/users/:_id/logs', async (req, res) => {
  const { _id } = req.params;
  const { from, to, limit } = req.query;
  try {
    const user = await User.findById(_id);
    if (!user) return res.status(400).json({ error: 'User not found' });
    let query = { userId: user._id };
    let dateFilter = {};
    if (from) {
      const fromDate = new Date(from);
      if (fromDate.toString() !== 'Invalid Date') {
        dateFilter.$gte = fromDate;
      }
    }
    if (to) {
      const toDate = new Date(to);
      if (toDate.toString() !== 'Invalid Date') {
        dateFilter.$lte = toDate;
      }
    }
    if (Object.keys(dateFilter).length) {
      query.date = dateFilter;
    }
    let exercisesQuery = Exercise.find(query);
    if (limit) {
      exercisesQuery = exercisesQuery.limit(Number(limit));
    }
    const logArr = await exercisesQuery.exec();
    res.json({
      username: user.username,
      count: logArr.length,
      _id: user._id,
      log: logArr.map(e => ({
        description: e.description,
        duration: e.duration,
        date: e.date.toDateString()
      }))
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch logs' });
  }
});

const listener = app.listen(process.env.PORT || 3000, () => {
  console.log('Your app is listening on port ' + listener.address().port);
});







