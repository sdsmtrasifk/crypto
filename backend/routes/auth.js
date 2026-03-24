const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const { pool, supabase } = require('../config/database');

const router = express.Router();

// Generate unique referral code
function generateReferralCode(userId, email) {
  return Buffer.from(`${userId}-${email}`).toString('base64').substring(0, 8).toUpperCase();
}

// Register
router.post('/register', [
  body('email').isEmail().normalizeEmail(),
  body('password').isLength({ min: 6 }),
  body('full_name').notEmpty(),
  body('referral_code').optional()
], async (req, res) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  const { email, password, full_name, referral_code } = req.body;
  const client = await pool.connect();

  try {
    await client.query('BEGIN');

    // Check if user exists
    const existingUser = await client.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'Email already registered' });
    }

    // Find referrer if referral code provided
    let referredById = null;
    if (referral_code) {
      const referrer = await client.query(
        'SELECT id FROM users WHERE referral_code = $1',
        [referral_code]
      );
      if (referrer.rows.length > 0) {
        referredById = referrer.rows[0].id;
      }
    }

    // Create user in Supabase Auth
    const { data: authUser, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: full_name
        }
      }
    });

    if (authError) {
      throw new Error(authError.message);
    }

    // Create user in our database
    const hashedPassword = await bcrypt.hash(password, 10);
    const userReferralCode = generateReferralCode(authUser.user.id, email);
    
    const newUser = await client.query(
      `INSERT INTO users (id, email, password_hash, full_name, referral_code, referred_by)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, email, full_name, referral_code`,
      [authUser.user.id, email, hashedPassword, full_name, userReferralCode, referredById]
    );

    const user = newUser.rows[0];

    // Create wallets for each currency
    const currencies = ['BTC', 'ETH', 'USDT', 'BCH', 'DOGE', 'LTC', 'SHIB', 'TRX'];
    for (const currency of currencies) {
      const address = `${currency.toLowerCase()}_${user.id}_${Date.now()}`;
      await client.query(
        `INSERT INTO wallets (user_id, currency, address, balance)
         VALUES ($1, $2, $3, $4)`,
        [user.id, currency, address, 0]
      );
    }

    await client.query('COMMIT');

    // Generate JWT
    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        referral_code: user.referral_code
      }
    });
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed: ' + error.message });
  } finally {
    client.release();
  }
});

// Login
router.post('/login', [
  body('email').isEmail(),
  body('password').notEmpty()
], async (req, res) => {
  const { email, password } = req.body;

  try {
    // Sign in with Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
      email,
      password
    });

    if (authError) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Get user from database
    const result = await pool.query(
      'SELECT id, email, full_name, referral_code FROM users WHERE email = $1',
      [email]
    );

    if (result.rows.length === 0) {
      return res.status(401).json({ error: 'User not found' });
    }

    const user = result.rows[0];

    const token = jwt.sign(
      { userId: user.id, email: user.email },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      token,
      user: {
        id: user.id,
        email: user.email,
        full_name: user.full_name,
        referral_code: user.referral_code
      }
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Login failed' });
  }
});

module.exports = router;