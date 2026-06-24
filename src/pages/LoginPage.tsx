import React, { useState } from 'react';

const App = () => {
  // Application State
  const [currentView, setCurrentView] = useState('login'); // 'login', 'register', 'dashboard'
  const [users, setUsers] = useState([]); // Mock Database
  const [loggedInUser, setLoggedInUser] = useState(null);

  // Form State
  const [formData, setFormData] = useState({ shopName: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleInputChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  const handleLogin = (e) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      setError('ကျေးဇူးပြု၍ အချက်အလက်များ ပြည့်စုံစွာ ထည့်ပါ။');
      return;
    }

    const user = users.find(
      (u) => u.email === formData.email && u.password === formData.password
    );

    if (user) {
      setLoggedInUser(user);
      setFormData({ shopName: '', email: '', password: '', confirmPassword: '' });
      setCurrentView('dashboard');
    } else {
      setError('အီးမေးလ် သို့မဟုတ် စကားဝှက် မှားယွင်းနေပါသည်။');
    }
  };

  const handleRegister = (e) => {
    e.preventDefault();

    if (!formData.shopName || !formData.email || !formData.password || !formData.confirmPassword) {
      setError('ကျေးဇူးပြု၍ အချက်အလက်များ ပြည့်စုံစွာ ထည့်ပါ။');
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      setError('စကားဝှက် နှစ်ခု တူညီမှု မရှိပါ။');
      return;
    }

    if (users.some((u) => u.email === formData.email)) {
      setError('ဤအီးမေးလ်ဖြင့် အကောင့်ဖွင့်ထားပြီး ဖြစ်ပါသည်။');
      return;
    }

    const newUser = {
      shopName: formData.shopName,
      email: formData.email,
      password: formData.password,
    };

    setUsers([...users, newUser]);
    setSuccess('အကောင့်ဖွင့်ခြင်း အောင်မြင်ပါသည်။');
    setCurrentView('login');
    setFormData({ shopName: '', email: '', password: '', confirmPassword: '' });
  };

  const handleLogout = () => {
    setLoggedInUser(null);
    setCurrentView('login');
  };

  const switchView = (view) => {
    setCurrentView(view);
    setError('');
    setSuccess('');
  };

  const handleGoogleLogin = () => {
    const mockGoogleUser = {
      shopName: 'My Shop',
      email: 'google.user@gmail.com',
      provider: 'google',
    };

    setLoggedInUser(mockGoogleUser);
    setCurrentView('dashboard');
  };

  if (currentView === 'dashboard') {
    return (
      <div className="p-10">
        <h1>Dashboard</h1>
        <button onClick={handleLogout}>Logout</button>
      </div>
    );
  }

  const isLogin = currentView === 'login';

  return (
    <div className="p-10">
      <h2>{isLogin ? 'Login' : 'Register'}</h2>
      <form onSubmit={isLogin ? handleLogin : handleRegister}>
        {!isLogin && (
          <input
            name="shopName"
            placeholder="Shop Name"
            onChange={handleInputChange}
          />
        )}
        <input
          name="email"
          placeholder="Email"
          onChange={handleInputChange}
        />
        <input
          name="password"
          type="password"
          placeholder="Password"
          onChange={handleInputChange}
        />
        {!isLogin && (
          <input
            name="confirmPassword"
            type="password"
            placeholder="Confirm Password"
            onChange={handleInputChange}
          />
        )}
        <button type="submit">Submit</button>
      </form>
      <button onClick={handleGoogleLogin}>Google Login</button>
      <button onClick={() => switchView(isLogin ? 'register' : 'login')}>
        Switch
      </button>
    </div>
  );
};

export default App;
