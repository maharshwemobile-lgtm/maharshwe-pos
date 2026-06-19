import React, { useEffect, useRef, useState } from 'react';
import { KeyRound, Loader2, Mail, ShieldCheck } from 'lucide-react';
import { getSession, googleLogin, login, subscribeSession } from './phase2Api';
import './auth-gate.css';

const DEFAULT_GOOGLE_CLIENT_ID = '648689584934-kbfljosfdkui7phmiq9k9o3dfl9un0ql.apps.googleusercontent.com';
const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || DEFAULT_GOOGLE_CLIENT_ID;
const DEFAULT_SHOP_SLUG = import.meta.env.VITE_SHOP_SLUG || 'maharshwe-mobile';

let googleScriptPromise;

function savedShopSlug() {
  if (typeof window === 'undefined') return DEFAULT_SHOP_SLUG;
  return window.localStorage.getItem('mahar_last_shop_slug') || DEFAULT_SHOP_SLUG;
}

function rememberShopSlug(value) {
  if (typeof window !== 'undefined' && value) window.localStorage.setItem('mahar_last_shop_slug', value);
}

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
  const [form, setForm] = useState({
    shopSlug: savedShopSlug(),
    username: 'admin',
    password: '',
  });
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
              const shopSlug = form.shopSlug.trim() || DEFAULT_SHOP_SLUG;
              const nextSession = await googleLogin({
                credential: response.credential,
                shopSlug,
              });
              rememberShopSlug(shopSlug);
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
      const shopSlug = form.shopSlug.trim();
      const nextSession = await login({
        shopSlug,
        username: form.username.trim(),
        password: form.password,
      });
      rememberShopSlug(shopSlug);
      setSession(nextSession);
      setForm((current) => ({ ...current, password: '' }));
    } catch (requestError) {
      setError(requestError.message || 'Login failed');
    } finally {
      setBusy(false);
    }
  };

  if (session?.token) return children;

  return (
    <main className="auth-gate-page">
      <section className="auth-gate-card">
        <div className="auth-gate-icon"><ShieldCheck size={30} /></div>
        <span className="auth-gate-eyebrow">MAHAR POS · SECURE ACCOUNT LOGIN</span>
        <h1>Sign in to Mahar POS</h1>
        <p>Shop Admin ဖန်တီးထားသော Account ဖြင့် Password သို့မဟုတ် Approved Google Email ကိုသုံးပြီး ဝင်ပါ။</p>

        <form className="auth-gate-form" onSubmit={submitLogin}>
          <label>
            <span>Shop Slug</span>
            <input
              value={form.shopSlug}
              onChange={(event) => setForm({ ...form, shopSlug: event.target.value })}
              autoComplete="organization"
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
            {busy ? 'Signing in…' : 'Sign in with Password'}
          </button>
        </form>

        <div className="auth-gate-divider"><span>or</span></div>
        <div className="auth-google-heading"><Mail size={17}/><span><b>Approved Google Account</b><small>Settings → Accounts & Login ထဲမှာ Shop Admin ကြိုတင်ချိတ်ထားသော Gmail ဖြစ်ရပါမယ်။</small></span></div>
        <div className="auth-google-button" ref={buttonRef} />
        {googleBusy ? <div className="auth-gate-busy"><Loader2 className="auth-gate-spin" size={18} /> Google Account စစ်ဆေးနေသည်…</div> : null}
        {error ? <div className="auth-gate-error">{error}</div> : null}
        <small className="auth-gate-note">Tenant: {form.shopSlug || DEFAULT_SHOP_SLUG}</small>
      </section>
    </main>
  );
}
