const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { dbService } = require('../db');
const { authenticateToken, JWT_SECRET } = require('../middleware/auth');

const router = express.Router();

// Vendor Register
router.post('/register', async (req, res) => {
  try {
    const { phone, name, storeName, password } = req.body;

    if (!phone || !name || !password) {
      return res.status(400).json({ error: 'Phone number, name, and password are required.' });
    }

    const cleanedPhone = phone.trim();
    
    // Check if phone already registered
    const existingUser = await dbService.getUserByPhone(cleanedPhone);
    if (existingUser) {
      return res.status(409).json({ error: 'Phone number is already registered. Please log in instead.' });
    }

    // Hash password
    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const store = storeName ? storeName.trim() : 'Kirana Store';

    // Insert user via unified dbService (Supabase or SQLite)
    const newUser = await dbService.createUser({
      phone: cleanedPhone,
      name: name.trim(),
      storeName: store,
      passwordHash
    });

    const userId = newUser.id;
    const token = jwt.sign(
      { userId, phone: cleanedPhone, name: name.trim() },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.status(201).json({
      message: 'Vendor registration successful!',
      token,
      user: {
        id: userId,
        phone: cleanedPhone,
        name: name.trim(),
        storeName: store
      }
    });

  } catch (err) {
    console.error('Registration Error:', err);
    res.status(500).json({ error: 'Server error during registration.' });
  }
});

// Vendor Login
router.post('/login', async (req, res) => {
  try {
    const { phone, password } = req.body;

    if (!phone || !password) {
      return res.status(400).json({ error: 'Phone number and password are required.' });
    }

    const cleanedPhone = phone.trim();
    const user = await dbService.getUserByPhone(cleanedPhone);

    if (!user) {
      return res.status(404).json({ error: 'Account not found with this phone number.' });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Incorrect password. Please try again.' });
    }

    const token = jwt.sign(
      { userId: user.id, phone: user.phone, name: user.name },
      JWT_SECRET,
      { expiresIn: '30d' }
    );

    res.json({
      message: 'Login successful!',
      token,
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        storeName: user.store_name
      }
    });

  } catch (err) {
    console.error('Login Error:', err);
    res.status(500).json({ error: 'Server error during login.' });
  }
});

// Get Current User Profile
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await dbService.getUserById(req.user.userId);
    if (!user) {
      return res.status(404).json({ error: 'User not found.' });
    }

    res.json({
      user: {
        id: user.id,
        phone: user.phone,
        name: user.name,
        storeName: user.store_name,
        createdAt: user.created_at
      }
    });
  } catch (err) {
    console.error('Profile Fetch Error:', err);
    res.status(500).json({ error: 'Server error fetching user profile.' });
  }
});

module.exports = router;
