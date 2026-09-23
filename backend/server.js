const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require("path");

const app = express();
app.use(express.static(path.join(__dirname, "../frontend")));
app.use(cors());
app.use(bodyParser.json());

// ✅ MySQL Connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'Tasneem',
  password: 'hotelreservation',
  database: 'hotelDB'
});

db.connect((err) => {
  if (err) {
    console.error('Database connection error:', err);
  } else {
    console.log('Connected to MySQL database');
  }
});

// ✅ Book Reservation - Fixed version
app.post('/api/book', (req, res) => {
  const { name, email, roomtype, checkin, checkout, payment } = req.body;

  const sql = 'INSERT INTO reservations (name, email, roomtype, checkin, checkout, payment) VALUES (?, ?, ?, ?, ?, ?)';
  db.query(sql, [name, email, roomtype, checkin, checkout, payment], (err, result) => {
    if (err) {
      console.error("Error inserting booking:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    res.json({ success: true, message: "Reservation saved successfully", reservationId: result.insertId });
  });
});


// ✅ User Signup
app.post('/api/signup', (req, res) => {
  const { name, email, password } = req.body;
  const checkUser = 'SELECT * FROM users WHERE email = ?';

  db.query(checkUser, [email], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: "Server error" });

    if (results.length > 0) {
      return res.json({ success: false, message: "Email already registered" });
    }

    const insertUser = 'INSERT INTO users (name, email, password) VALUES (?, ?, ?)';
    db.query(insertUser, [name, email, password], (err) => {
      if (err) return res.status(500).json({ success: false, message: "Database error" });
      res.json({ success: true, message: "Signup successful" });
    });
  });
});

// ✅ User Login
app.post('/api/login', (req, res) => {
  const { email, password } = req.body;
  const sql = 'SELECT * FROM users WHERE email = ? AND password = ?';

  db.query(sql, [email, password], (err, results) => {
    if (err) {
      console.error(err);
      return res.status(500).json({ success: false, message: 'Server error' });
    }

    if (results.length > 0) {
      const user = results[0];
      res.json({
        success: true,
        email: user.email,
        name: user.name
      });
    } else {
      res.json({ success: false, message: 'Invalid credentials' });
    }
  });
});

// ✅ Get User Reservation History (Dashboard)
app.get('/api/user-reservations', (req, res) => {
  const email = req.query.email;

  if (!email) {
    return res.status(400).json({ success: false, message: "Email required" });
  }

  const sql = `
    SELECT r.roomtype AS roomtype, r.checkin AS checkin, r.checkout AS checkout,
           IFNULL(p.status, 'Pending') AS payment
    FROM reservations r
    LEFT JOIN payments p ON r.id = p.reservation_id
    WHERE r.email = ?
    ORDER BY r.id DESC
  `;

  db.query(sql, [email], (err, results) => {
    if (err) {
      console.error("DB error in /api/user-reservations:", err);
      return res.status(500).json({ success: false, message: "Database error" });
    }

    res.json({ success: true, reservations: results });
  });
});

// ✅ Get User Profile
app.get('/api/user-profile', (req, res) => {
  const email = req.query.email;
  const sql = 'SELECT name, email FROM users WHERE email = ?';
  db.query(sql, [email], (err, results) => {
    if (err || results.length === 0) {
      return res.status(500).json({ success: false, message: 'Error fetching profile' });
    }
    res.json({ success: true, profile: results[0] });
  });
});

// ✅ Admin Login
app.post('/api/admin-login', (req, res) => {
  const { email, password } = req.body;
  const sql = 'SELECT * FROM admins WHERE email = ? AND password = ?';
  db.query(sql, [email, password], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: "Database error" });
    res.json({ success: results.length > 0 });
  });
});

// ✅ Agent Login
app.post('/api/agent-login', (req, res) => {
  const { email, password } = req.body;
  const sql = 'SELECT * FROM agents WHERE email = ? AND password = ?';
  db.query(sql, [email, password], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Login failed' });
    if (results.length > 0) {
      res.json({ success: true, agent: results[0] });
    } else {
      res.json({ success: false, message: 'Invalid email or password' });
    }
  });
});

// ✅ Agent Registration
app.post('/api/agent-register', (req, res) => {
  const { name, email, password, hotel_name, hotel_address } = req.body;

  const checkEmail = 'SELECT * FROM agents WHERE email = ?';
  db.query(checkEmail, [email], (err, results) => {
    if (err) return res.status(500).json({ success: false, message: 'Database error' });

    if (results.length > 0) {
      return res.json({ success: false, message: 'Email already registered' });
    }

    const insertAgent = 'INSERT INTO agents (name, email, password, hotel_name, hotel_address) VALUES (?, ?, ?, ?, ?)';
    db.query(insertAgent, [name, email, password, hotel_name, hotel_address], (err) => {
      if (err) return res.status(500).json({ success: false, message: 'Failed to register agent' });
      res.json({ success: true, message: 'Agent registered successfully' });
    });
  });
});

// ✅ Hotel Update by Agent
app.post('/api/agent/update-hotel', (req, res) => {
  const { hotelName, location, rooms, price, description } = req.body;
  const sql = 'INSERT INTO hotels (name, location, rooms, price, description) VALUES (?, ?, ?, ?, ?)';
  db.query(sql, [hotelName, location, rooms, price, description], (err) => {
    if (err) return res.status(500).json({ success: false, message: "Database error" });
    res.json({ success: true, message: "Hotel details updated successfully" });
  });
});

// ✅ Payment API
app.post('/api/pay', (req, res) => {
  const { reservation_id, amount, payment_type } = req.body;
  const sql = 'INSERT INTO payments (reservation_id, amount, payment_type, status) VALUES (?, ?, ?, "Paid")';
  db.query(sql, [parseInt(reservation_id), amount, payment_type], (err) => {
    if (err) return res.status(500).json({ success: false, message: "Database error" });
    res.json({ success: true, message: "Payment successful" });
  });
});

app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../hotels/index.html"));
});
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "../frontend/index.html"));
});
// ✅ Fallback for unmatched routes
app.use((req, res) => {
  res.status(404).json({ success: false, message: "Route not found" });
});

// ✅ Start Server
app.listen(3000, () => {
  console.log('✅ Server is running at http://localhost:3000');
});
