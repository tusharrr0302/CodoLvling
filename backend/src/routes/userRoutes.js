const express = require('express');
const router = express.Router();
const supabase = require('../utils/supabase');
const authMiddleware = require('../middleware/authMiddleware');

// Get current user profile
router.get('/me', authMiddleware, async (req, res) => {
  const clerkId = req.auth.userId;
  try {
    const { data, error } = await supabase
      .from('player_profiles')
      .select('*')
      .eq('clerk_id', clerkId)
      .single();

    if (error || !data) {
      return res.status(404).json({ message: 'Profile not found' });
    }

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

// Update profile
router.patch('/profile', authMiddleware, async (req, res) => {
  const clerkId = req.auth.userId;
  const updates = req.body;

  const { data, error } = await supabase
    .from('player_profiles')
    .update(updates)
    .eq('clerk_id', clerkId)
    .select()
    .single();

  if (error) {
    return res.status(500).json({ message: 'Update failed', error: error.message });
  }

  res.json({ success: true, profile: data });
});

// Get profile by username (public)
router.get('/:username', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('player_profiles')
      .select('*')
      .eq('username', req.params.username)
      .single();

    if (error || !data) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(data);
  } catch (error) {
    console.error(error);
    res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
