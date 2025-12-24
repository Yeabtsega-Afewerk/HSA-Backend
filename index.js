// server.js
const express = require('express');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const bodyParser = require('body-parser');
const cors = require('cors');
const app = express();
const PORT = 3000;

// Middleware
app.use(bodyParser.json());
app.use(cors({
  origin: 'https://eclectic-rolypoly-124fc3.netlify.app',
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  credentials: true // only if using cookies/sessions
}));
// Connect to MongoDB
mongoose.connect('mongodb+srv://yabuman155:2xbvtWHwZMKWLrs2@cluster0.y5ry0lq.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0');

// Schemas
const userSchema = new mongoose.Schema({
  username: String,
  password: String,
  role: String, // 'superadmin' | 'admin' | 'student'
});

const studentSchema = new mongoose.Schema({
  studentId: String,
  fullName: String,
  email: String,
  password: String,
  classId: mongoose.Schema.Types.ObjectId
});

const classSchema = new mongoose.Schema({
  name: String,
  adminId: mongoose.Schema.Types.ObjectId,
  adminName: String,
});

const subjectSchema = new mongoose.Schema({
  name: String,
  code: String
});

const attendanceSchema = new mongoose.Schema({
  studentId: mongoose.Schema.Types.ObjectId,
  date: Date,
  status: String // 'present' | 'absent'
});

const markSchema = new mongoose.Schema({
  studentId: mongoose.Schema.Types.ObjectId,
  subjectId: { type: mongoose.Schema.Types.ObjectId, ref: 'Subject' },
  mark: Number
});

// Models
const User = mongoose.model('User', userSchema);
const Student = mongoose.model('Student', studentSchema);
const Class = mongoose.model('Class', classSchema);
const Subject = mongoose.model('Subject', subjectSchema);
const Attendance = mongoose.model('Attendance', attendanceSchema);
const Mark = mongoose.model('Mark', markSchema);


// Login
app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.password))) {
    return res.status(401).send('Invalid credentials');
  }
  res.send({data: user});
});

// Super Admin: Manage Classes
app.post('/classes',  async (req, res) => {
  const { name, adminUsername, adminPassword } = req.body;
  const hashedPassword = await bcrypt.hash(adminPassword, 10);
  const admin = await User.create({ username: adminUsername, password: hashedPassword, role: 'admin' });
  const newClass = await Class.create({ name, adminId: admin._id, adminName: admin.username });
  res.send(newClass);
});

app.get('/classes',  async (req, res) => {
  res.send(await Class.find());
});

app.delete('/classes/:id',  async (req, res) => {
  const classId = req.params.id;
  await Class.findByIdAndDelete(classId);
  res.send('Class deleted');
});

// Super Admin: Manage Admins
app.delete('/admins/:id',  async (req, res) => {
  await User.findByIdAndDelete(req.params.id);
  res.send('Admin removed');
});

app.put('/admins/:id',  async (req, res) => {
  const { password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  await User.findByIdAndUpdate(req.params.id, { password: hashed });
  res.send('Admin updated');
});

// Super Admin: Manage Subjects
app.post('/subjects',  async (req, res) => {
  const { name, code } = req.body;
  res.send(await Subject.create({ name, code }));
});

app.get('/subjects',  async (req, res) => {
  res.send(await Subject.find());
});

app.delete('/subjects/:id', async (req, res) => {
  await Subject.findByIdAndDelete(req.params.id);
  res.send('Subject deleted');
});

// Admin: Manage Students
app.post('/students/:id',  async (req, res) => {
  const adminId = req.params.id;
  const { studentId, fullName, email, password } = req.body;
  const hashed = await bcrypt.hash(password, 10);
  const classId = (await Class.findOne({ adminId: adminId }))._id;
  await User.create({ username: studentId, password: hashed, role: 'student' });
  res.send(await Student.create({ studentId, fullName, email, password: hashed, classId }));
});

app.get('/students/:id',  async (req, res) => {
  const adminId = req.params.id;
  const classId = (await Class.findOne({ adminId: adminId }))._id;
  res.send(await Student.find({ classId }));
});

app.delete('/students/:id', async (req, res) => {
  try {
    const student = await Student.findByIdAndDelete(req.params.id);
    
    if (!student) {
      return res.status(404).send('Student not found');
    }

    await User.findOneAndDelete({ username: student.studentId });

    res.send('Student deleted');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});


// Admin: Attendance
app.get('/attendance/:id',  async (req, res) => {
  const adminId = req.params.id;
  const classId = (await Class.findOne({ adminId: adminId }))._id;
  const students = await Student.find({ classId });
  res.send(students);
});

app.post('/attendance',  async (req, res) => {
  const { studentId, status } = req.body;
  res.send(await Attendance.create({ studentId, date: new Date(), status }));
});

// Admin: Marks
app.post('/marks',  async (req, res) => {
  const { studentId, subjectId, mark } = req.body;
  res.send(await Mark.create({ studentId, subjectId, mark }));
});

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


// Student: Info, Attendance, Performance
app.get('/student/info/:id', async (req, res) => {
  const studId = req.params.id;
  const user = await User.findById(studId)
  const student = await Student.findOne({ studentId: user?.username });
  const classi = await Class.findById(student?.classId)
  res.send({
    name: student?.fullName,
    classname: classi?.name,
  });
});

app.get('/student/attendance/:id', async (req, res) => {
  const studId = req.params.id;
  const userres = await User.findById(studId);
  const studentres = await Student.findOne({studentId: userres?.username})
  const attendance = await Attendance.find({ studentId: studentres?._id  });
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
      subject: subject?.name,
      mark: m.mark
    };
  }));

  const avg = marks.reduce((sum, m) => sum + m.mark, 0) / (marks.length || 1);

  res.send({ average: avg, scores });
});


// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

