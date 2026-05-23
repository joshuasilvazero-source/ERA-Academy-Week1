const express = require("express");
const db = require("./db");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

// Root route
app.get("/", (req, res) => {
    res.send("Backend is running with MySQL");
});

// GET /students
app.get("/students", (req, res) => {
    const sql = "SELECT * FROM students";
    db.query(sql, (error, results) => {
        if (error) return res.status(500).json({ error: "Failed to get students" });
        res.json(results);
    });
});

// GET /students/:id - Get student profile info
app.get("/students/:id", (req, res) => {
    const studentId = req.params.id;
    const sql = "SELECT id, first_name, last_name, grade_level FROM students WHERE id = ?";
    db.query(sql, [studentId], (error, results) => {
        if (error) return res.status(500).json({ error: "Failed to get student" });
        if (results.length === 0) {
            return res.status(404).json({ error: "Student not found" });
        }
        res.json(results[0]);
    });
});

// GET /students/:id/grades - Get all grades for a specific student
app.get("/students/:id/grades", (req, res) => {
    const studentId = req.params.id;
    const sql = `
    SELECT classes.class_name, grades.grade_value
    FROM grades
    JOIN classes ON grades.class_id = classes.id
    WHERE grades.student_id = ?
  `;
    db.query(sql, [studentId], (error, results) => {
        if (error) return res.status(500).json({ error: "Failed to get grades" });
        res.json(results);
    });
});

// GET /students/:id/assignments - Get all assignments and scores for a student
app.get("/students/:id/assignments", (req, res) => {
    const studentId = req.params.id;
    const sql = `
    SELECT
      assignments.assignment_name,
      assignments.due_date,
      assignments.max_points,
      classes.class_name,
      student_assignments.score,
      student_assignments.submitted_date
    FROM assignments
    JOIN classes ON assignments.class_id = classes.id
    LEFT JOIN student_assignments ON assignments.id = student_assignments.assignment_id
      AND student_assignments.student_id = ?
    WHERE assignments.class_id IN (
      SELECT class_id FROM enrollments WHERE student_id = ?
    )
    ORDER BY assignments.due_date DESC
  `;
    db.query(sql, [studentId, studentId], (error, results) => {
        if (error) return res.status(500).json({ error: "Failed to get assignments" });
        res.json(results);
    });
});

// GET /students/:id/attendance - Get attendance record for a student
app.get("/students/:id/attendance", (req, res) => {
    const studentId = req.params.id;
    const sql = `
    SELECT
      classes.class_name,
      attendance.date,
      attendance.status
    FROM attendance
    JOIN classes ON attendance.class_id = classes.id
    WHERE attendance.student_id = ?
    ORDER BY attendance.date DESC
  `;
    db.query(sql, [studentId], (error, results) => {
        if (error) return res.status(500).json({ error: "Failed to get attendance" });
        res.json(results);
    });
});

// POST /students
app.post("/students", (req, res) => {
    const { first_name, last_name, grade_level } = req.body;
    if (!first_name || !last_name || !grade_level) {
        return res.status(400).json({ error: "All fields are required" });
    }
    const sql = "INSERT INTO students (first_name, last_name, grade_level) VALUES (?, ?, ?)";
    db.query(sql, [first_name, last_name, grade_level], (error, results) => {
        if (error) return res.status(500).json({ error: "Failed to add student" });
        res.status(201).json({
            message: "Student added successfully",
            studentId: results.insertId
        });
    });
});

// POST /users
app.post("/users", (req, res) => {
    const { first_name, last_name, email, password } = req.body;
    if (!first_name || !last_name || !email || !password) {
        return res.status(400).json({ error: "All fields are required" });
    }
    if (password.length < 8) {
        return res.status(400).json({ error: "Password must be at least 8 characters long" });
    }
    const specialChar = /[!@#$%]/;
    if (!specialChar.test(password)) {
        return res.status(400).json({
            error: "Password must include at least one special character: ! @ # $ %"
        });
    }
    // Auto-link to student record if name matches
    const studentSql = "SELECT id FROM students WHERE first_name = ? AND last_name = ?";
    db.query(studentSql, [first_name, last_name], (error, students) => {
        if (error) return res.status(500).json({ error: "Failed to look up student" });

        const student_id = students.length > 0 ? students[0].id : null;

        const sql =
            "INSERT INTO users (first_name, last_name, email, password, student_id) VALUES (?, ?, ?, ?, ?)";
        db.query(sql, [first_name, last_name, email, password, student_id], (error, results) => {
            if (error) return res.status(500).json({ error: "Failed to create user" });
            res.status(201).json({
                message: "User created successfully",
                userId: results.insertId
            });
        });
    });
});

// GET /users — returns all users (password excluded)
app.get("/users", (req, res) => {
    const sql = "SELECT id, first_name, last_name, email FROM users";
    db.query(sql, (error, results) => {
        if (error) return res.status(500).json({ error: "Failed to get users" });
        res.json(results);
    });
});

// POST /login (UPDATED - now returns student_id)
app.post("/login", (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: "Email and password are required" });
    }
    const sql = "SELECT * FROM users WHERE email = ?";
    db.query(sql, [email], (error, results) => {
        if (error) return res.status(500).json({ error: "Something went wrong" });
        if (results.length === 0) {
            return res.status(401).json({ error: "Invalid email or password" });
        }
        const user = results[0];
        if (user.password !== password) {
            return res.status(401).json({ error: "Invalid email or password" });
        }
        res.status(200).json({
            message: "Login successful",
            first_name: user.first_name,
            last_name: user.last_name,
            student_id: user.student_id // ← ADDED THIS
        });
    });
});

// GET /classes
app.get("/classes", (req, res) => {
    const sql = "SELECT * FROM classes";
    db.query(sql, (error, results) => {
        if (error) return res.status(500).json({ error: "Failed to get classes" });
        res.json(results);
    });
});

// GET /enrollments
app.get("/enrollments", (req, res) => {
    const sql = `
    SELECT students.first_name, students.last_name,
           classes.class_name, classes.teacher_name
    FROM enrollments
    JOIN students ON enrollments.student_id = students.id
    JOIN classes  ON enrollments.class_id   = classes.id
  `;
    db.query(sql, (error, results) => {
        if (error) return res.status(500).json({ error: "Failed to get enrollments" });
        res.json(results);
    });
});

app.listen(PORT, () => {
    console.log(`Server running at http://localhost:${PORT}`);
});
