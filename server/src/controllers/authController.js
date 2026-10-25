import bcrypt from 'bcryptjs';
import User from '../models/User.js';
import { generateToken } from '../middleware/auth.js';

export async function register(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters long.' });
    }

    const emailRegex = /^\S+@\S+\.\S+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existing = await User.findOne({ email: normalizedEmail });
    if (existing) {
      return res.status(409).json({ error: 'An account with this email already exists.' });
    }

    // Hash password with bcryptjs
    const saltRounds = 10;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // SECURITY: Public registration is strictly restricted to customer role
    const newUser = await User.create({
      email: normalizedEmail,
      password: hashedPassword,
      role: 'customer'
    });

    const token = generateToken(newUser);

    return res.status(201).json({
      message: 'Registration successful',
      token,
      user: {
        id: newUser._id,
        email: newUser.email,
        role: newUser.role
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Registration failed. ' + err.message });
  }
}

export async function login(req, res) {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail });

    if (!user) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid email or password.' });
    }

    const token = generateToken(user);

    return res.status(200).json({
      message: 'Login successful',
      token,
      user: {
        id: user._id,
        email: user.email,
        role: user.role
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Login failed. ' + err.message });
  }
}

export async function getMe(req, res) {
  try {
    return res.status(200).json({
      user: {
        id: req.user._id,
        email: req.user.email,
        role: req.user.role
      }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
}

export async function logout(req, res) {
  // Stateless JWT logout is handled on client by clearing the token; endpoint acknowledges success.
  return res.status(200).json({ message: 'Logged out successfully.' });
}
