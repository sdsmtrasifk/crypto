const express = require('express');
const pool = require('../config/database');
const authMiddleware = require('../middleware/auth');

const router = express.Router();

// Get user's referral stats
router.get('/stats', authMiddleware, async (req, res) => {
  const userId = req.user.userId;

  try {
    // Get direct referrals count
    const directReferrals = await pool.query(
      `SELECT COUNT(*) as count,
              SUM(CASE WHEN created_at > NOW() - INTERVAL '7 days' THEN 1 ELSE 0 END) as weekly
       FROM users WHERE referred_by = $1`,
      [userId]
    );

    // Get total commissions earned
    const commissions = await pool.query(
      `SELECT SUM(amount) as total,
              SUM(CASE WHEN status = 'pending' THEN amount ELSE 0 END) as pending,
              SUM(CASE WHEN status = 'paid' THEN amount ELSE 0 END) as paid
       FROM referral_commissions WHERE user_id = $1`,
      [userId]
    );

    // Get recent commissions
    const recentCommissions = await pool.query(
      `SELECT rc.*, u.email as referred_email, o.type as order_type
       FROM referral_commissions rc
       JOIN users u ON u.id = rc.referred_user_id
       LEFT JOIN orders o ON o.id = rc.order_id
       WHERE rc.user_id = $1
       ORDER BY rc.created_at DESC
       LIMIT 20`,
      [userId]
    );

    res.json({
      direct_referrals: directReferrals.rows[0],
      commissions: commissions.rows[0],
      recent: recentCommissions.rows
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch referral stats' });
  }
});

// Get referral tree (multi-level)
router.get('/tree', authMiddleware, async (req, res) => {
  const userId = req.user.userId;

  try {
    const referralTree = await getReferralTree(userId);
    res.json(referralTree);
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch referral tree' });
  }
});

// Function to get multi-level referrals
async function getReferralTree(userId, level = 1, maxLevel = 3) {
  if (level > maxLevel) return null;

  const result = await pool.query(
    `SELECT id, email, full_name, referral_code, created_at
     FROM users WHERE referred_by = $1`,
    [userId]
  );

  const referrals = [];
  for (const user of result.rows) {
    const children = await getReferralTree(user.id, level + 1, maxLevel);
    referrals.push({
      ...user,
      level,
      children: children || []
    });
  }

  return referrals;
}

// Process referral commission after trade
async function processReferralCommission(userId, orderId, amount, currency) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    let currentUserId = userId;
    let level = 1;
    const commissionRates = { 1: 0.05, 2: 0.02, 3: 0.01 }; // 5%, 2%, 1%
    
    while (level <= 3) {
      // Get referrer
      const userResult = await client.query(
        'SELECT referred_by FROM users WHERE id = $1',
        [currentUserId]
      );
      
      const referrerId = userResult.rows[0]?.referred_by;
      if (!referrerId) break;
      
      // Calculate commission
      const commissionRate = commissionRates[level];
      const commissionAmount = amount * commissionRate;
      
      // Create commission record
      await client.query(
        `INSERT INTO referral_commissions 
         (user_id, referred_user_id, order_id, level, amount, currency)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [referrerId, userId, orderId, level, commissionAmount, currency]
      );
      
      currentUserId = referrerId;
      level++;
    }
    
    await client.query('COMMIT');
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error processing referral commission:', error);
  } finally {
    client.release();
  }
}

module.exports = { router, processReferralCommission };