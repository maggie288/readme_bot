import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { authAPI } from '../services/api';

export default function MobileLogin({ onLogin }) {
  const navigate = useNavigate();
  const [mode, setMode] = useState('login'); // 'login', 'register', 'forgot'
  
  // 登录表单
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // 注册表单
  const [registerUsername, setRegisterUsername] = useState('');
  const [registerEmail, setRegisterEmail] = useState('');
  const [registerPassword, setRegisterPassword] = useState('');
  const [registerConfirmPassword, setRegisterConfirmPassword] = useState('');
  
  // 找回密码表单
  const [forgotEmail, setForgotEmail] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    if (!loginEmail || !loginPassword) {
      setError('请输入邮箱和密码');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authAPI.login({
        email: loginEmail,
        password: loginPassword,
      });

      const { user, token } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      onLogin(user);
      navigate('/m/home');
    } catch (err) {
      setError(err.response?.data?.error || '登录失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    
    if (!registerUsername || !registerEmail || !registerPassword) {
      setError('请填写所有必填项');
      return;
    }
    
    if (registerPassword !== registerConfirmPassword) {
      setError('两次输入的密码不一致');
      return;
    }
    
    if (registerPassword.length < 6) {
      setError('密码长度至少为6位');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const response = await authAPI.register({
        username: registerUsername,
        email: registerEmail,
        password: registerPassword,
      });

      const { user, token } = response.data;
      localStorage.setItem('token', token);
      localStorage.setItem('user', JSON.stringify(user));
      onLogin(user);
      navigate('/m/home');
    } catch (err) {
      setError(err.response?.data?.error || '注册失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    
    if (!forgotEmail) {
      setError('请输入注册邮箱');
      return;
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const response = await authAPI.forgotPassword(forgotEmail);
      setSuccess(response.data.message || '密码重置链接已发送到您的邮箱');
    } catch (err) {
      setError(err.response?.data?.error || '发送失败，请重试');
    } finally {
      setLoading(false);
    }
  };

  const renderLoginForm = () => (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          邮箱
        </label>
        <input
          type="email"
          value={loginEmail}
          onChange={(e) => setLoginEmail(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="请输入邮箱"
          autoComplete="email"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          密码
        </label>
        <input
          type="password"
          value={loginPassword}
          onChange={(e) => setLoginPassword(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="请输入密码"
          autoComplete="current-password"
        />
      </div>

      <div className="flex items-center justify-between text-sm">
        <button
          type="button"
          onClick={() => {
            setMode('forgot');
            setError('');
            setSuccess('');
          }}
          className="text-blue-500 hover:text-blue-600"
        >
          忘记密码？
        </button>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
      >
        {loading ? '登录中...' : '登录'}
      </button>

      <div className="text-center pt-4">
        <button
          type="button"
          onClick={() => {
            setMode('register');
            setError('');
            setSuccess('');
          }}
          className="text-sm text-blue-500 hover:text-blue-600"
        >
          还没有账号？立即注册
        </button>
      </div>
    </form>
  );

  const renderRegisterForm = () => (
    <form onSubmit={handleRegister} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          用户名
        </label>
        <input
          type="text"
          value={registerUsername}
          onChange={(e) => setRegisterUsername(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="请输入用户名"
          autoComplete="username"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          邮箱
        </label>
        <input
          type="email"
          value={registerEmail}
          onChange={(e) => setRegisterEmail(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="请输入邮箱"
          autoComplete="email"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          密码
        </label>
        <input
          type="password"
          value={registerPassword}
          onChange={(e) => setRegisterPassword(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="请输入密码（至少6位）"
          autoComplete="new-password"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          确认密码
        </label>
        <input
          type="password"
          value={registerConfirmPassword}
          onChange={(e) => setRegisterConfirmPassword(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="请再次输入密码"
          autoComplete="new-password"
        />
      </div>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
      >
        {loading ? '注册中...' : '注册'}
      </button>

      <div className="text-center pt-4">
        <button
          type="button"
          onClick={() => {
            setMode('login');
            setError('');
            setSuccess('');
          }}
          className="text-sm text-blue-500 hover:text-blue-600"
        >
          已有账号？立即登录
        </button>
      </div>
    </form>
  );

  const renderForgotForm = () => (
    <form onSubmit={handleForgotPassword} className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          注册邮箱
        </label>
        <input
          type="email"
          value={forgotEmail}
          onChange={(e) => setForgotEmail(e.target.value)}
          className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          placeholder="请输入注册邮箱"
          autoComplete="email"
        />
      </div>

      <p className="text-sm text-gray-500">
        我们将向您的邮箱发送密码重置链接
      </p>

      <button
        type="submit"
        disabled={loading}
        className="w-full py-3 bg-blue-500 text-white font-medium rounded-lg hover:bg-blue-600 transition-colors disabled:opacity-50"
      >
        {loading ? '发送中...' : '发送重置链接'}
      </button>

      <div className="text-center pt-4">
        <button
          type="button"
          onClick={() => {
            setMode('login');
            setError('');
            setSuccess('');
          }}
          className="text-sm text-blue-500 hover:text-blue-600"
        >
          返回登录
        </button>
      </div>
    </form>
  );

  const getTitle = () => {
    switch (mode) {
      case 'login':
        return '登录您的账户';
      case 'register':
        return '创建新账户';
      case 'forgot':
        return '找回密码';
      default:
        return '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <div className="flex-1 flex flex-col justify-center px-6 py-12">
        <div className="mx-auto w-full max-w-sm">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">ReadMeBot</h1>
            <p className="text-gray-500">{getTitle()}</p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-500 px-4 py-3 rounded-lg text-sm mb-4">
              {error}
            </div>
          )}

          {success && (
            <div className="bg-green-50 text-green-600 px-4 py-3 rounded-lg text-sm mb-4">
              {success}
            </div>
          )}

          {mode === 'login' && renderLoginForm()}
          {mode === 'register' && renderRegisterForm()}
          {mode === 'forgot' && renderForgotForm()}
        </div>
      </div>

      <div className="py-4 text-center text-xs text-gray-400">
        登录或注册即表示同意服务条款和隐私政策
      </div>
    </div>
  );
}
