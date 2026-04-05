require('dotenv').config(); // Load .env
const express = require('express');
const mongoose = require('mongoose');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 3000;

// Connect to MongoDB
mongoose.connect(process.env.MONGO_URI, {
  useNewUrlParser: true,
  useUnifiedTopology: true
})
.then(() => console.log('MongoDB connected'))
.catch(err => console.error('MongoDB connection error:', err));

// --- Admin: Marks ---
app.get('/marks', async (req, res) => {
  try {
    const marks = await Mark.find();

    const enrichedMarks = await Promise.all(
      marks.map(async (mark) => {
        const subject = await Subject.findById(mark.subjectId);
        const student = await Student.findById(mark.studentId);

        return {
          name: subject?.name || "Unknown Subject",
          fullName: student?.fullName || "Unknown Student",
          mark: mark.mark,
        };
      })
    );

    res.send(enrichedMarks);
  } catch (error) {
    console.error("Error fetching marks:", error);
    res.status(500).send({ message: "Internal server error" });
  }
});

// --- Student: Info, Attendance, Performance ---
app.get('/student/info/:id', async (req, res) => {
  const studId = req.params.id;
  const user = await User.findById(studId);
  const student = await Student.findOne({ studentId: user?.username });
  const classi = await Class.findById(student?.classId);

  res.send({
    name: student?.fullName,
    classname: classi?.name,
  });
});

app.get('/student/attendance/:id', async (req, res) => {
  const studId = req.params.id;
  const userres = await User.findById(studId);
  const studentres = await Student.findOne({ studentId: userres?.username });
  const attendance = await Attendance.find({ studentId: studentres?._id });

  const total = attendance.length;
  const present = attendance.filter(a => a.status === 'present').length;
  const percent = total > 0 ? (present / total) * 100 : 0;

  res.send({ percent, records: attendance });
});

app.get('/student/performance/:id', async (req, res) => {
  const studId = req.params.id;
  const userres = await User.findById(studId);
  const studentres = await Student.findOne({ studentId: userres?.username });

  const marks = await Mark.find({ studentId: studentres?._id });

  const scores = await Promise.all(marks.map(async (m) => {
    const subject = await Subject.findById(m.subjectId);
    return {
      subject: subject?.name || "Unknown Subject",
      mark: m.mark
    };
  }));

  const avg = marks.length > 0 ? marks.reduce((sum, m) => sum + m.mark, 0) / marks.length : 0;

  res.send({ average: avg, scores });
});

// --- Start server ---
app.listen(PORT, () => {
  console.log(Server running on port ${PORT});
});
