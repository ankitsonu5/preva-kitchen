'use client';

import { useState } from 'react';
import { Eye, EyeOff } from 'lucide-react';
export default function Login() {
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);

  async function go(e) {
    e.preventDefault();
    setErr('');
    setLoading(true);
    const b = Object.fromEntries(new FormData(e.currentTarget));
    b.email = String(b.email || '').trim().toLowerCase();
    b.password = String(b.password || '').trim();
    try {
      const r = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(b)
      });
      if (!r.ok) {
        const body = await r.json().catch(() => null);
        setErr(r.status === 401 ? 'Email or password does not match. Check the password with Show and try again.' : (body?.message || 'Login failed'));
        setLoading(false);
        return;
      }
      const payload = await r.json();
      window.location.href = payload?.user?.mustChangePassword ? '/admin/profile?first=1' : payload?.user?.role === 'CAREERS_MANAGER' ? '/admin/careers' : '/admin';
    } catch (err) {
      setErr('Could not connect to the admin service. Make sure the API server is running.');
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <form className="login" onSubmit={go}>
        <h1>Preva Admin Login</h1>
        <label>Email</label>
        <input className="input" name="email" type="email" autoComplete="username" required />
        <label>Password</label>
        <div className="login-password-field">
          <input className="input" name="password" type={showPassword ? 'text' : 'password'} autoComplete="current-password" spellCheck="false" onKeyUp={(event) => setCapsLock(event.getModifierState('CapsLock'))} required />
          <button className="login-password-toggle" type="button" onClick={() => setShowPassword((current) => !current)} aria-label={showPassword ? 'Hide password' : 'Show password'}>
            {showPassword ? <EyeOff size={17} /> : <Eye size={17} />}
            <span>{showPassword ? 'Hide' : 'Show'}</span>
          </button>
        </div>
        {capsLock && <p className="login-caps-warning">Caps Lock is on</p>}
        <button className="btn" type="submit" disabled={loading}>
          {loading ? 'Logging in…' : 'Log in'}
        </button>
        {err && <p className="error" style={{ marginTop: '10px' }}>{err}</p>}
      </form>
    </div>
  );
}
