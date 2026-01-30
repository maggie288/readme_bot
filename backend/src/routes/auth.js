import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import crypto from 'crypto';
import prisma from '../lib/prisma.js';
import { authenticateToken } from '../middleware/auth.js';
import { validate, registerSchema, loginSchema, addBalanceSchema } from '../lib/validations.js';

const router = express.Router();

// Register
router.post('/register', validate(registerSchema), async (req, res) => {
  try {
    const { username, email, password } = req.body;

    // Check if user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [{ email }, { username }],
      },
    });

    if (existingUser) {
      return res.status(400).json({ error: 'User already exists' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const user = await prisma.user.create({
      data: {
        username,
        email,
        password: hashedPassword,
      },
    });

    // Generate token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(201).json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        balance: user.balance || 0,
      },
      token,
    });
  } catch (error) {
    console.error('Register error:', error);
    res.status(500).json({ error: 'Failed to register user' });
  }
});

// Login
router.post('/login', validate(loginSchema), async (req, res) => {
  try {
    const { email, password } = req.body;

    // Find user
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check password
    const validPassword = await bcrypt.compare(password, user.password);

    if (!validPassword) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Generate token
    const token = jwt.sign(
      { id: user.id, username: user.username },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        avatar: user.avatar,
        balance: user.balance || 0,
      },
      token,
    });
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).json({ error: 'Failed to login' });
  }
});

// Forgot Password - 发送密码重置邮件
router.post('/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: '请输入邮箱地址' });
    }

    // Find user by email
    const user = await prisma.user.findUnique({
      where: { email },
    });

    if (!user) {
      // 为了安全，不透露用户是否存在
      return res.json({ message: '如果该邮箱已注册，我们会发送密码重置链接' });
    }

    // Generate reset token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenExpires = new Date(Date.now() + 3600000); // 1 hour from now

    // Save reset token to database
    await prisma.user.update({
      where: { id: user.id },
      data: {
        resetPasswordToken: resetToken,
        resetPasswordExpires: resetTokenExpires,
      },
    });

    // In production, send email with reset link
    // For now, we'll return the reset link for demo purposes
    const resetLink = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/reset-password?token=${resetToken}&email=${email}`;

    console.log('\n========================================');
    console.log('密码重置链接 (Password Reset Link):');
    console.log(resetLink);
    console.log('========================================\n');

    res.json({
      message: '如果该邮箱已注册，我们会发送密码重置链接',
      // 仅在开发环境返回重置链接
      ...(process.env.NODE_ENV !== 'production' && { resetLink }),
    });
  } catch (error) {
    console.error('Forgot password error:', error);
    res.status(500).json({ error: 'Failed to process forgot password request' });
  }
});

// Reset Password - 重置密码
router.post('/reset-password', async (req, res) => {
  try {
    const { email, token, newPassword } = req.body;

    if (!email || !token || !newPassword) {
      return res.status(400).json({ error: '缺少必要参数' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: '密码长度至少为6位' });
    }

    // Find user with valid reset token
    const user = await prisma.user.findFirst({
      where: {
        email,
        resetPasswordToken: token,
        resetPasswordExpires: {
          gt: new Date(), // Token 还未过期
        },
      },
    });

    if (!user) {
      return res.status(400).json({ error: '重置链接已过期或无效' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update user password and clear reset token
    await prisma.user.update({
      where: { id: user.id },
      data: {
        password: hashedPassword,
        resetPasswordToken: null,
        resetPasswordExpires: null,
      },
    });

    res.json({ message: '密码重置成功，请使用新密码登录' });
  } catch (error) {
    console.error('Reset password error:', error);
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Get current user info
router.get('/me', authenticateToken, async (req, res) => {
  try {
    const user = await prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true,
        username: true,
        email: true,
        avatar: true,
        balance: true,
      },
    });

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user info' });
  }
});

// Add balance (for testing/demo purposes)
router.post('/add-balance', authenticateToken, validate(addBalanceSchema), async (req, res) => {
  try {
    const { amount } = req.body;

    const user = await prisma.user.update({
      where: { id: req.user.id },
      data: { balance: { increment: amount } },
      select: {
        id: true,
        username: true,
        balance: true,
      },
    });

    res.json({
      success: true,
      message: `成功充值 ¥${amount}`,
      balance: user.balance,
    });
  } catch (error) {
    console.error('Add balance error:', error);
    res.status(500).json({ error: 'Failed to add balance' });
  }
});

export default router;
