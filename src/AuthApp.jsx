import React, { useState } from 'react';

export default function AuthApp({ onLogin }) {
  const [currentView, setCurrentView] = useState('login'); // login | register
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [formData, setFormData] = useState({
    shopName: '',
    email: '',
    password: '',
    confirmPassword: ''
  });

  const [users, setUsers] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('ms_users') || '[]');
    } catch (e) {
      return [];
    }
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const switchView = (view) => {
    setCurrentView(view);
    setError('');
    setSuccess('');
    setFormData({ shopName: '', email: '', password: '', confirmPassword: '' });
  };

  const handleLogin = (e) => {
    e.preventDefault();

    if (!formData.email || !formData.password) {
      setError('ကျေးဇူးပြု၍ အချက်အလက်များ ဖြည့်ပါ');
      return;
    }

    const user = users.find(
      (u) => u.email === formData.email && u.password === formData.password
    );

    if (!user) {
      setError('Email သို့မဟုတ် Password မှားနေပါသည်');
      return;
    }

    const sessionUser = {
      shopName: user.shopName,
      email: user.email,
      provider: 'local'
    };

    localStorage.setItem('ms_current_user', JSON.stringify(sessionUser));

    if (onLogin) onLogin(sessionUser);
  };

  const handleRegister = (e) => {
    e.preventDefault();

    if (!formData.shopName || !formData.email || !formData.password) {
      setError('ကျေးဇူးပြု၍ အချက်အလက်များ ဖြည့်ပါ');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Password မတူညီပါ');
      return;
    }

    if (users.some((u) => u.email === formData.email)) {
      setError('ဒီ email နဲ့ account ရှိပြီးသားပါ');
      return;
    }

    const newUser = {
      shopName: formData.shopName,
      email: formData.email,
      password: formData.password
    };

    const updatedUsers = [...users, newUser];
    setUsers(updatedUsers);
    localStorage.setItem('ms_users', JSON.stringify(updatedUsers));

    setSuccess('အကောင့်ဖွင့်ပြီးပါပြီ Login ဝင်ပါ');
    switchView('login');
  };

  const handleGoogleLogin = () => {
    const mockUser = {
      shopName: 'Google Shop',
      email: 'google.user@gmail.com',
      provider: 'google'
    };

    localStorage.setItem('ms_current_user', JSON.stringify(mockUser));
    if (onLogin) onLogin(mockUser);
  };

  const isLogin = currentView === 'login';

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-lg p-6">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-indigo-600">Mahar Shwe POS</h1>
          <p className="text-gray-500 text-sm mt-1">
            {isLogin ? 'Login ဝင်ရန်' : 'အကောင့်သစ်ဖွင့်ရန်'}
          </p>
        </div>

        {error && <div className="mb-3 text-red-600 text-sm">{error}</div>}
        {success && <div className="mb-3 text-green-600 text-sm">{success}</div>}

        <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-3">

          {!isLogin && (
            <input
              name="shopName"
              value={formData.shopName}
              onChange={handleChange}
              placeholder="Shop Name"
              className="w-full p-3 border rounded"
            />
          )}

          <input
            name="email"
            value={formData.email}
            onChange={handleChange}
            placeholder="Email"
            className="w-full p-3 border rounded"
          />

          <input
            name="password"
            type="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Password"
            className="w-full p-3 border rounded"
          />

          {!isLogin && (
            <input
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm Password"
              className="w-full p-3 border rounded"
            />
          )}

          <button
            type="submit"
            className="w-full bg-indigo-600 text-white p-3 rounded"
          >
            {isLogin ? 'Login' : 'Register'}
          </button>
        </form>

        <button
          onClick={handleGoogleLogin}
          className="w-full mt-3 border p-3 rounded"
        >
          Google Login
        </button>

        <div className="text-center mt-4 text-sm">
          {isLogin ? 'No account?' : 'Already have account?'}
          <button
            className="text-indigo-600 ml-1"
            onClick={() => switchView(isLogin ? 'register' : 'login')}
          >
            {isLogin ? 'Register' : 'Login'}
          </button>
        </div>
      </div>
    </div>
  );
}
