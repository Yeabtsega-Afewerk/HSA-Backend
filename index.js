const student = await Student.findOne({ studentId: user?.username });
    const attendance = await Attendance.find({ studentId: student?._id });
    const total = attendance.length;
    const present = attendance.filter(a => a.status === 'present').length;
    const percent = total > 0 ? (present / total) * 100 : 0;
    res.send({ percent, records: attendance });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

// Student performance
app.get('/student/performance/:id', async (req, res) => {
  try {
    const user = await User.findById(req.params.id);
    const student = await Student.findOne({ studentId: user?.username });
    const marks = await Mark.find({ studentId: student?._id });
    
    const scores = await Promise.all(
      marks.map(async (m) => {
        const subject = await Subject.findById(m.subjectId);
        return { subject: subject?.name || "Unknown Subject", mark: m.mark };
      })
    );

    const avg = marks.length > 0 ? marks.reduce((sum, m) => sum + m.mark, 0) / marks.length : 0;

    res.send({ average: avg, scores });
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
});

// ---------------------- START SERVER ----------------------
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(Server running on port ${PORT});
});
