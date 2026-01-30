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

// Get recharge history
router.get('/recharges', authenticateToken, async (req, res) => {
  try {
    const recharges = await prisma.recharge.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json(recharges);
  } catch (error) {
    console.error('Get recharges error:', error);
    res.status(500).json({ error: 'Failed to get recharge history' });
  }
});

// Create Alipay order
router.post('/alipay/create-order', authenticateToken, async (req, res) => {
  try {
    const { amount } = req.body;

    if (!amount || amount <= 0) {
      return res.status(400).json({ error: 'Invalid amount' });
    }

    // 创建充值记录
    const recharge = await prisma.recharge.create({
      data: {
        userId: req.user.id,
        amount,
        status: 'pending',
      },
    });

    // 生成支付宝订单（模拟）
    // 实际项目中需要调用支付宝 API
    const orderId = `RECHARGE_${recharge.id}_${Date.now()}`;
    const tradeNo = `TRADE_${Date.now()}`;

    // 更新充值记录的订单号
    await prisma.recharge.update({
      where: { id: recharge.id },
      data: { alipayOrderId: orderId },
    });

    // 模拟支付宝返回的支付链接
    // 实际项目中这里会调用支付宝的 alipay.trade.page.pay 接口
    const payUrl = `${process.env.FRONTEND_URL || 'http://localhost:5173'}/payment/alipay?orderId=${orderId}&amount=${amount}&tradeNo=${tradeNo}`;

    res.json({
      success: true,
      orderId,
      tradeNo,
      payUrl,
      amount,
    });
  } catch (error) {
    console.error('Create Alipay order error:', error);
    res.status(500).json({ error: 'Failed to create payment order' });
  }
});

// Alipay callback (notify)
router.post('/alipay/notify', async (req, res) => {
  try {
    const { tradeNo, orderId, status } = req.body;

    // 查找充值记录
    const recharge = await prisma.recharge.findFirst({
      where: { alipayOrderId: orderId },
    });

    if (!recharge) {
      return res.status(404).json({ error: 'Recharge not found' });
    }

    if (status === 'success') {
      // 更新充值状态
      await prisma.recharge.update({
        where: { id: recharge.id },
        data: {
          status: 'success',
          tradeNo,
        },
      });

      // 增加用户余额
      await prisma.user.update({
        where: { id: recharge.userId },
        data: { balance: { increment: recharge.amount } },
      });
    } else {
      await prisma.recharge.update({
        where: { id: recharge.id },
        data: { status: 'failed' },
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error('Alipay notify error:', error);
    res.status(500).json({ error: 'Payment processing failed' });
  }
});

// Mock Alipay payment success (for demo/testing)
router.post('/alipay/mock-success', authenticateToken, async (req, res) => {
  try {
    const { orderId } = req.body;

    const recharge = await prisma.recharge.findFirst({
      where: { alipayOrderId: orderId, userId: req.user.id },
    });

    if (!recharge) {
      return res.status(404).json({ error: 'Order not found' });
    }

    // 更新充值状态
    await prisma.recharge.update({
      where: { id: recharge.id },
      data: {
        status: 'success',
        tradeNo: `MOCK_${Date.now()}`,
      },
    });

    // 增加用户余额
    const user = await prisma.user.update({
      where: { id: recharge.userId },
      data: { balance: { increment: recharge.amount } },
      select: {
        id: true,
        username: true,
        balance: true,
      },
    });

    res.json({
      success: true,
      message: '充值成功',
      balance: user.balance,
    });
  } catch (error) {
    console.error('Mock payment success error:', error);
    res.status(500).json({ error: 'Payment failed' });
  }
});

// Get purchase history
router.get('/purchases', authenticateToken, async (req, res) => {
  try {
    const purchases = await prisma.purchase.findMany({
      where: { userId: req.user.id },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            authorId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    // 获取翻译购买记录
    const translationPurchases = await prisma.translationPurchase.findMany({
      where: { userId: req.user.id },
      include: {
        document: {
          select: {
            id: true,
            title: true,
            authorId: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });

    res.json({
      documents: purchases,
      translations: translationPurchases,
    });
  } catch (error) {
    console.error('Get purchases error:', error);
    res.status(500).json({ error: 'Failed to get purchase history' });
  }
});

export default router;
