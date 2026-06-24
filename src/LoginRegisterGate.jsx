import React, { useEffect, useRef, useState } from 'react';
import { googleLogin, login, registerTenant } from './phase2Api';
import { PROJECT_LOGO_URL } from './projectBrand';
import './login-register-gate.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';

export default function LoginRegisterGate({ onSession }) {
  const [mode, setMode] = useState('login');
  const [loginForm, setLoginForm] = useState({ username: '', password: '', shopSlug: '' });
  const [registerForm, setRegisterForm] = useState({ shopName: '', username: '', password: '', phone: '' });
  const [prefill, setPrefill] = useState(null);
  const [needSlug, setNeedSlug] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const googleButtonRef = useRef(null);

  useEffect(() => {
    const raw = sessionStorage.getItem('pos_prefill_login');
    if (!raw) return;
    try {
      const data = JSON.parse(raw);
      setPrefill(data);
      setLoginForm((current) => ({
        ...current,
        username: data.username || current.username,
        shopSlug: data.shopSlug || current.shopSlug,
      }));
      setMode('login');
      sessionStorage.removeItem('pos_prefill_login');
    } catch {
      // Ignore invalid stored prefill.
    }
  }, []);

  useEffect(() => {
    if (mode !== 'login' || !GOOGLE_CLIENT_ID || !googleButtonRef.current) return undefined;
    let cancelled = false;

    const renderGoogleButton = () => {
      if (cancelled || !window.google?.accounts?.id || !googleButtonRef.current) return;
      googleButtonRef.current.innerHTML = '';
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: async (response) => {
          setError('');
          setLoading(true);
          try {
            const session = await googleLogin({
              credential: response.credential,
              shopSlug: loginForm.shopSlug.trim() || undefined,
            });
            onSession?.(session);
          } catch (requestError) {
            const message = requestError?.message || 'Google Login မအောင်မြင်ပါ။';
            if (/multiple|shop slug/i.test(message)) setNeedSlug(true);
            setError(/multiple/i.test(message)
              ? 'ဆိုင်တစ်ခုထက်မက ရှိသည်။ Shop Slug ထည့်ပြီး ထပ်ကြိုးစားပါ။'
              : message);
          } finally {
            setLoading(false);
          }
        },
      });
      window.google.accounts.id.renderButton(googleButtonRef.current, {
        type: 'standard',
        theme: 'outline',
        size: 'large',
        width: 320,
        text: 'signin_with',
        locale: 'my',
      });
    };

    if (window.google?.accounts?.id) {
      renderGoogleButton();
      return () => { cancelled = true; };
    }

    const existing = document.querySelector('script[data-mahar-google-login="true"]');
    if (existing) {
      existing.addEventListener('load', renderGoogleButton, { once: true });
      return () => { cancelled = true; };
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.maharGoogleLogin = 'true';
    script.onload = renderGoogleButton;
    script.onerror = () => {
      if (!cancelled) setError('Google Login script မဖွင့်နိုင်ပါ။ Username/Password ဖြင့်ဝင်ပါ။');
    };
    document.body.appendChild(script);

    return () => { cancelled = true; };
  }, [mode, loginForm.shopSlug, onSession]);

  const switchMode = (nextMode) => {
    setMode(nextMode);
    setError('');
    setSuccess('');
    setNeedSlug(false);
  };

  const submitLogin = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!loginForm.username.trim() || !loginForm.password) {
      setError('Username နှင့် Password ထည့်ပါ။');
      return;
    }

    setLoading(true);
    try {
      const session = await login({
        username: loginForm.username.trim(),
        password: loginForm.password,
        shopSlug: loginForm.shopSlug.trim() || undefined,
      });
      onSession?.(session);
    } catch (requestError) {
      const message = requestError?.message || 'Login မအောင်မြင်ပါ။';
      if (/multiple|shop slug/i.test(message)) {
        setNeedSlug(true);
        setError('ဤ Username ဆိုင်တစ်ခုထက်မက ရှိသည်။ Shop Slug ထည့်ပါ။');
      } else {
        setError(message);
      }
    } finally {
      setLoading(false);
    }
  };

  const submitRegister = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!registerForm.shopName.trim()) {
      setError('ဆိုင်အမည် ထည့်ပါ။');
      return;
    }
    if (!registerForm.username.trim() || registerForm.username.trim().length < 2) {
      setError('Username အနည်းဆုံး ၂ လုံး ရှိရမည်။');
      return;
    }
    if (!registerForm.password || registerForm.password.length < 6) {
      setError('Password အနည်းဆုံး ၆ လုံး ရှိရမည်။');
      return;
    }

    setLoading(true);
    try {
      const data = await registerTenant({
        shopName: registerForm.shopName.trim(),
        username: registerForm.username.trim(),
        password: registerForm.password,
        phone: registerForm.phone.trim() || undefined,
      });

      const nextPrefill = {
        username: registerForm.username.trim(),
        shopSlug: data.tenant?.slug || '',
        tenantId: data.tenant?.code || data.tenant?.tenantId || data.tenant?.id || '',
        shopName: data.tenant?.name || registerForm.shopName.trim(),
      };

      sessionStorage.setItem('pos_prefill_login', JSON.stringify(nextPrefill));
      setPrefill(nextPrefill);
      setLoginForm({
        username: nextPrefill.username,
        password: '',
        shopSlug: nextPrefill.shopSlug,
      });
      setRegisterForm({ shopName: '', username: '', password: '', phone: '' });
      setSuccess(`${nextPrefill.shopName} အကောင့် ဖွင့်ပြီးပါပြီ။ Password ရိုက်ပြီး Login ဝင်ပါ။`);
      setMode('login');
    } catch (requestError) {
      const message = requestError?.status === 409
        ? 'ဤ Username သို့မဟုတ် ဆိုင်အမည် ရှိပြီးသားဖြစ်သည်။'
        : requestError?.message || 'အကောင့်ဖွင့်ခြင်း မအောင်မြင်ပါ။';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="ms-login-page">
      <section className="ms-login-card">
        <div className="ms-login-brand">
          <img src={PROJECT_LOGO_URL} alt="Mahar Shwe POS" />
          <h1>Mahar Shwe POS</h1>
          <p>{mode === 'login' ? 'အကောင့်ဝင်ရန်' : 'အကောင့်သစ် ဖွင့်ရန်'}</p>
        </div>

        <div className="ms-login-tabs" role="tablist" aria-label="Login and register">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => switchMode('login')}>Login</button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => switchMode('register')}>Register</button>
        </div>

        {success ? <div className="ms-login-alert success">🎉 {success}</div> : null}
        {prefill && mode === 'login' ? (
          <div className="ms-login-alert success">
            <b>{prefill.shopName}</b> အကောင့် ဖွင့်ပြီးပါပြီ။ Password ရိုက်ပြီး ဝင်ပါ။
          </div>
        ) : null}
        {error ? <div className="ms-login-alert error">{error}</div> : null}

        {mode === 'login' ? (
          <form className="ms-login-form" onSubmit={submitLogin}>
            <label>
              <span>Username</span>
              <input
                value={loginForm.username}
                onChange={(event) => {
                  setLoginForm({ ...loginForm, username: event.target.value });
                  setError('');
                }}
                placeholder="admin"
                autoComplete="username"
                autoFocus={!prefill}
                readOnly={!!prefill}
              />
            </label>

            <label>
              <span>Password</span>
              <input
                type="password"
                value={loginForm.password}
                onChange={(event) => {
                  setLoginForm({ ...loginForm, password: event.target.value });
                  setError('');
                }}
                placeholder="••••••••"
                autoComplete="current-password"
                autoFocus={!!prefill}
              />
            </label>

            {(needSlug || loginForm.shopSlug) ? (
              <label>
                <span>Shop Slug {needSlug ? <b>*</b> : null}</span>
                <input
                  value={loginForm.shopSlug}
                  onChange={(event) => {
                    setLoginForm({ ...loginForm, shopSlug: event.target.value });
                    setError('');
                  }}
                  placeholder="maharshwe-mobile"
                  readOnly={!!prefill && !needSlug}
                />
                <small>Settings › Shop Info မှာ ကြည့်နိုင်သည်</small>
              </label>
            ) : null}

            <button type="submit" className="ms-login-primary" disabled={loading}>
              {loading ? 'ဝင်နေသည်...' : 'Login ဝင်မည်'}
            </button>

            {GOOGLE_CLIENT_ID ? (
              <>
                <div className="ms-login-divider"><span>သို့မဟုတ်</span></div>
                <div className="ms-login-google" ref={googleButtonRef} />
              </>
            ) : null}

            <p className="ms-login-footer">
              အကောင့်မရှိသေးဘူးလား?{' '}
              <button type="button" onClick={() => switchMode('register')}>Register လုပ်ရန်</button>
            </p>
          </form>
        ) : (
          <form className="ms-login-form" onSubmit={submitRegister}>
            <label>
              <span>ဆိုင်အမည် <b>*</b></span>
              <input
                name="shopName"
                value={registerForm.shopName}
                onChange={(event) => {
                  setRegisterForm({ ...registerForm, shopName: event.target.value });
                  setError('');
                }}
                placeholder="မဟာရွှေဆိုင်"
                autoFocus
              />
            </label>

            <label>
              <span>Username <b>*</b></span>
              <input
                name="username"
                value={registerForm.username}
                onChange={(event) => {
                  setRegisterForm({ ...registerForm, username: event.target.value });
                  setError('');
                }}
                placeholder="admin"
                autoComplete="username"
              />
              <small>Login ဝင်ရန် သုံးမည့် username</small>
            </label>

            <label>
              <span>Password <b>*</b></span>
              <input
                type="password"
                name="password"
                value={registerForm.password}
                onChange={(event) => {
                  setRegisterForm({ ...registerForm, password: event.target.value });
                  setError('');
                }}
                placeholder="အနည်းဆုံး ၆ လုံး"
                autoComplete="new-password"
              />
            </label>

            <label>
              <span>ဖုန်းနံပါတ် <em>(ရွေးချယ်နိုင်)</em></span>
              <input
                type="tel"
                name="phone"
                value={registerForm.phone}
                onChange={(event) => {
                  setRegisterForm({ ...registerForm, phone: event.target.value });
                  setError('');
                }}
                placeholder="09xxxxxxxxx"
              />
            </label>

            <button type="submit" className="ms-login-primary" disabled={loading}>
              {loading ? 'ဖွင့်နေသည်...' : 'အကောင့်ဖွင့်မည်'}
            </button>

            <p className="ms-login-trial">✅ ဖွင့်ပြီးနောက် 7 ရက် Trial အခမဲ့ သုံးနိုင်သည်</p>

            <p className="ms-login-footer">
              အကောင့်ရှိပြီးသားလား?{' '}
              <button type="button" onClick={() => switchMode('login')}>Login ဝင်ရန်</button>
            </p>
          </form>
        )}
      </section>
    </main>
  );
}
