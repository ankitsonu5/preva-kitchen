'use client';

import { useEffect, useState } from 'react';
import { KeyRound, Save } from 'lucide-react';
import Shell from '@/components/admin/Shell';
import { PageHeader } from '@/components/admin/AdminUI';
import { api } from '@/lib/admin-api';

export default function ProfilePage() {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [firstLogin, setFirstLogin] = useState(false);

  useEffect(() => { setFirstLogin(new URLSearchParams(window.location.search).get('first') === '1'); }, []);

  const submit = async (event) => {
    event.preventDefault(); setError(''); setMessage('');
    if (newPassword !== confirmPassword) { setError('New passwords do not match.'); return; }
    if (newPassword.length < 12) { setError('Use at least 12 characters for the new password.'); return; }
    setSaving(true);
    const response = await api('/auth/change-password', { method: 'POST', body: JSON.stringify({ currentPassword, newPassword }) });
    const body = await response.json().catch(() => null);
    if (response.ok) { setCurrentPassword(''); setNewPassword(''); setConfirmPassword(''); setMessage('Password changed successfully.'); }
    else setError(body?.message || 'Could not change the password.');
    setSaving(false);
  };

  return <Shell><PageHeader eyebrow="Account security" title="Change password" description="Replace the temporary password before using the hiring workspace." icon={KeyRound} />
    <form className="panel" onSubmit={submit} style={{ width: 'min(560px,100%)', display: 'grid', gap: 9 }}>
      {firstLogin && <div className="ats-alert"><KeyRound size={18} /><div><strong>Password change required</strong><span>Create a private password with at least 12 characters to continue.</span></div></div>}
      <label>Current / temporary password</label><input className="input" type="password" autoComplete="current-password" value={currentPassword} onChange={(event) => setCurrentPassword(event.target.value)} required />
      <label>New password</label><input className="input" type="password" autoComplete="new-password" value={newPassword} onChange={(event) => setNewPassword(event.target.value)} required minLength={12} />
      <label>Confirm new password</label><input className="input" type="password" autoComplete="new-password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} required minLength={12} />
      {error && <div className="error">{error}</div>}{message && <div className="success">{message}</div>}
      <button className="btn" type="submit" disabled={saving}><Save size={15} /> {saving ? 'Saving…' : 'Change password'}</button>
    </form>
  </Shell>;
}
