import React, { useEffect, useRef, useState } from 'react';
import { KeyRound, Loader2, ShieldCheck, UserPlus } from 'lucide-react';
import { getSession, googleLogin, login, registerTenant, subscribeSession } from './phase2Api';
import './auth-gate.css';

const DEFAULT_GOOGLE_CLIENT_ID = '648689584934-kbfljosfdkui7phmiq9k9o3dfl9un0ql.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;
const DEFAULT_SHOP_SLUG = import.meta.env.VITE_SHOP_SLUG || 'maharshwe-mobile';

let googleScriptPromise;

function loadGoogleIdentityScript() {
  if (window.google?.accounts?.id) return Promise.resolve();
  if (googleScriptPromise) return googleScriptPromise;

  googleScriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[data-mahar-google-identity="true"]');
    if (existing) {
      if (window.google?.accounts?.id) {
        resolve();
        return;
      }
      existing.addEventListener('load', resolve, { once: true });
      existing.addEventListener('error', () => reject(new Error('Google login script could not be loaded')), { once: true });
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.dataset.maharGoogleIdentity = 'true';
    script.onload = resolve;
    script.onerror = () => reject(new Error('Google login script could not be loaded'));
    document.head.appendChild(script);
  });

  return googleScriptPromise;
}

export default function GoogleAuthGate({ children }) {
  const [session, setSession] = useState(() => getSession());
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({
    shopSlug: DEFAULT_SHOP_SLUG,
    username: 'admin',
    password: '',
  });
  const [registerForm, setRegisterForm] = useState({
    shopName: '',
    shopSlug: '',
    ownerName: '',
    username: 'admin',
    password: '',
    phone: '',
    address: '',
  });
  const [registerSuccess, setRegisterSuccess] = useState(null);
  const [busy, setBusy] = useState(false);
  const [googleBusy, setGoogleBusy] = useState(false);
  const [error, setError] = useState('');
  const buttonRef = useRef(null);

  useEffect(() => subscribeSession(setSession), []);

  useEffect(() => {
    if (session?.token) return undefined;
    let cancelled = false;

    const setupGoogleLogin = async () => {
      try {
        await loadGoogleIdentityScript();
        if (cancelled || !buttonRef.current) return;

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          auto_select: false,
          cancel_on_tap_outside: true,
          callback: async (response) => {
            if (!response?.credential) {
              setError('Google credential မရရှိပါ။');
              return;
            }
            setGoogleBusy(true);
            setError('');
            try {
              const nextSession = await googleLogin({
                credential: response.credential,
                shopSlug: form.shopSlug || DEFAULT_SHOP_SLUG,
              });
              setSession(nextSession);
            } catch (requestError) {
              setError(requestError.message || 'Google login failed');
            } finally {
              setGoogleBusy(false);
            }
          },
        });

        buttonRef.current.innerHTML = '';
        window.google.accounts.id.renderButton(buttonRef.current, {
          type: 'standard',
          theme: 'outline',
          size: 'large',
          text: 'signin_with',
          shape: 'rectangular',
          logo_alignment: 'left',
          width: Math.min(360, Math.max(280, buttonRef.current.clientWidth || 340)),
        });
      } catch {
        // Username/password login remains available when Google script is blocked.
      }
    };

    setupGoogleLogin();
    return () => {
      cancelled = true;
      window.google?.accounts?.id?.cancel?.();
    };
  }, [session?.token, form.shopSlug]);

  const submitLogin = async (event) => {
    event.preventDefault();
    if (!form.shopSlug.trim() || !form.username.trim() || !form.password) {
      setError('Shop Slug၊ Username နဲ့ Password အားလုံးထည့်ပါ။');
      return;
    }

    setBusy(true);
    setError('');
    try {
      const nextSession = await login({
        shopSlug: form.shopSlug.trim(),
        username: form.username.trim(),
        password: form.password,
      });
      setSession(nextSession);
      setForm((current) => ({ ...current, password: '' }));
    } catch (requestError) {
      setError(requestError.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  const submitRegister = async (event) => {
    event.preventDefault();
    if (!registerForm.shopName.trim() || !registerForm.username.trim() || !registerForm.password) {
      setError('Shop name၊ username နဲ့ password လိုအပ်ပါတယ်။');
      return;
    }

    setBusy(true);
    setError('');
    setRegisterSuccess(null);
    try {
      const result = await registerTenant({
        shopName: registerForm.shopName.trim(),
        shopSlug: registerForm.shopSlug.trim() || undefined,
        ownerName: registerForm.ownerName.trim() || undefined,
        username: registerForm.username.trim(),
        password: registerForm.password,
        phone: registerForm.phone.trim() || undefined,
        address: registerForm.address.trim() || undefined,
      });
      setRegisterSuccess(result);
      setMode('login');
      setForm({
        shopSlug: result.tenant?.tenantId || result.tenant?.slug || '',
        username: registerForm.username.trim(),
        password: '',
      });
      setRegisterForm((current) => ({ ...current, password: '' }));
    } catch (requestError) {
      setError(requestError.message || 'Registration failed');
    } finally {
      setBusy(false);
    }
  };

  if (session?.token) return children;

  return (
    <main className="auth-gate-page">
      <section className="auth-gate-card">
        <div className="auth-gate-icon"><ShieldCheck size={30} /></div>
        <span className="auth-gate-eyebrow">MAHAR POS · POSTGRESQL TENANT</span>
        <h1>{mode === 'login' ? 'Sign in to Mahar POS' : 'Register new shop tenant'}</h1>
        <p>
          {mode === 'login'
            ? 'Existing account ရှိပြီးသားဆို Tenant ID / Shop Slug နဲ့ Login ဝင်ပါ။'
            : 'Account မရှိသေးရင် Shop tenant အသစ်ဖွင့်ပြီး 7-day free trial စတင်နိုင်ပါတယ်။'}
        </p>

        <div className="auth-mode-tabs" role="tablist" aria-label="Login mode">
          <button type="button" className={mode === 'login' ? 'active' : ''} onClick={() => { setMode('login'); setError(''); }}>
            Existing account
          </button>
          <button type="button" className={mode === 'register' ? 'active' : ''} onClick={() => { setMode('register'); setError(''); }}>
            New shop register
          </button>
        </div>

        {registerSuccess ? (
          <div className="auth-register-success">
            <b>Tenant created: {registerSuccess.tenant?.tenantId}</b>
            <span>Shop Slug: {registerSuccess.tenant?.slug}</span>
            <small>7-day free trial active until {new Date(registerSuccess.tenant?.subscription?.endsAt).toLocaleDateString()}။ အခု Login form မှာ Tenant ID ဖြည့်ပြီးပါပြီ။ Password ကိုပြန်ရိုက်ပြီး Login ဝင်ပါ။</small>
          </div>
        ) : null}

        {mode === 'login' ? (
          <>
            <form className="auth-gate-form" onSubmit={submitLogin}>
              <label>
                <span>Tenant ID / Shop Slug</span>
                <input
                  value={form.shopSlug}
                  onChange={(event) => setForm({ ...form, shopSlug: event.target.value })}
                  autoComplete="organization"
                  placeholder="MS-ABC123 or maharshwe-mobile"
                  required
                />
              </label>
              <label>
                <span>Username</span>
                <input
                  value={form.username}
                  onChange={(event) => setForm({ ...form, username: event.target.value })}
                  autoComplete="username"
                  required
                />
              </label>
              <label>
                <span>Password</span>
                <input
                  type="password"
                  value={form.password}
                  onChange={(event) => setForm({ ...form, password: event.target.value })}
                  autoComplete="current-password"
                  required
                />
              </label>
              <button type="submit" disabled={busy || googleBusy}>
                {busy ? <Loader2 className="auth-gate-spin" size={19} /> : <KeyRound size={19} />}
                {busy ? 'Signing in…' : 'Sign in'}
              </button>
            </form>

            <div className="auth-gate-divider"><span>or</span></div>
            <div className="auth-google-button" ref={buttonRef} />
            {googleBusy ? <div className="auth-gate-busy"><Loader2 className="auth-gate-spin" size={18} /> Google Account စစ်ဆေးနေသည်…</div> : null}
          </>
        ) : (
          <form className="auth-gate-form auth-register-form" onSubmit={submitRegister}>
            <label>
              <span>Shop Name</span>
              <input value={registerForm.shopName} onChange={(event) => setRegisterForm({ ...registerForm, shopName: event.target.value })} placeholder="Your mobile shop name" required />
            </label>
            <label>
              <span>Preferred Shop Slug</span>
              <input value={registerForm.shopSlug} onChange={(event) => setRegisterForm({ ...registerForm, shopSlug: event.target.value })} placeholder="optional, e.g. ac-mobile" />
            </label>
            <label>
              <span>Owner Name</span>
              <input value={registerForm.ownerName} onChange={(event) => setRegisterForm({ ...registerForm, ownerName: event.target.value })} placeholder="optional" />
            </label>
            <label>
              <span>Admin Username</span>
              <input value={registerForm.username} onChange={(event) => setRegisterForm({ ...registerForm, username: event.target.value })} autoComplete="username" required />
            </label>
            <label>
              <span>Admin Password</span>
              <input type="password" minLength={6} value={registerForm.password} onChange={(event) => setRegisterForm({ ...registerForm, password: event.target.value })} autoComplete="new-password" required />
            </label>
            <label>
              <span>Phone</span>
              <input value={registerForm.phone} onChange={(event) => setRegisterForm({ ...registerForm, phone: event.target.value })} placeholder="optional" />
            </label>
            <label className="auth-register-wide">
              <span>Address</span>
              <input value={registerForm.address} onChange={(event) => setRegisterForm({ ...registerForm, address: event.target.value })} placeholder="optional" />
            </label>
            <button type="submit" disabled={busy}>
              {busy ? <Loader2 className="auth-gate-spin" size={19} /> : <UserPlus size={19} />}
              {busy ? 'Creating tenant…' : 'Create tenant + 7-day trial'}
            </button>
          </form>
        )}
        {error ? <div className="auth-gate-error">{error}</div> : null}
        <small className="auth-gate-note">Tenant: {form.shopSlug || DEFAULT_SHOP_SLUG}</small>
      </section>
    </main>
  );
}
