'use client';

import { useEffect, useState } from 'react';
import Shell from '@/components/admin/Shell';
import { LoadingSkeleton, PageHeader } from '@/components/admin/AdminUI';
import { api, getUser } from '@/lib/admin-api';
import { Settings } from 'lucide-react';

export default function SettingsManager() {
  const [form, setForm] = useState({
    siteTitle: '',
    siteTagline: '',
    siteDescription: '',
    siteLogo: '',
    announcementText: '',
    announcementSecondary: '',
    headerCtaText: '',
    headerCtaUrl: '',
    footerTagline: '',
    footerDescription: '',
    copyrightText: '',
    mapEmbedUrl: '',
    defaultSeoTitle: '',
    defaultSeoDescription: '',
    defaultOgImage: '',
    siteUrl: '',
    contactEmail: '',
    phone: '',
    address: '',
    postsPerPage: 10,
    timezone: 'America/Detroit',
    maintenanceMode: false,
    headerScripts: '',
    footerScripts: '',
    socialLinks: {
      instagram: '',
      facebook: ''
    }
  });

  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Change Password state
  const [pwForm, setPwForm] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [pwSaving, setPwSaving] = useState(false);
  const [pwMessage, setPwMessage] = useState({ text: '', ok: true });
  const [showPw, setShowPw] = useState({ current: false, newPw: false, confirm: false });

  useEffect(() => {
    getUser().then(setUser);
    api('/admin/settings')
      .then(async (res) => {
        if (res.ok) {
          const data = await res.json();
          setForm({
            ...data,
            siteTitle: data.siteTitle || '',
            siteTagline: data.siteTagline || '',
            siteDescription: data.siteDescription || '',
            siteUrl: data.siteUrl || '',
            contactEmail: data.contactEmail || '',
            phone: data.phone || '',
            address: data.address || '',
            postsPerPage: Number(data.postsPerPage || 10),
            timezone: data.timezone || 'America/Detroit',
            maintenanceMode: Boolean(data.maintenanceMode),
            headerScripts: data.headerScripts || '',
            footerScripts: data.footerScripts || '',
            siteLogo: data.siteLogo || '',
            announcementText: data.announcementText || '',
            announcementSecondary: data.announcementSecondary || '',
            headerCtaText: data.headerCtaText || '',
            headerCtaUrl: data.headerCtaUrl || '',
            footerTagline: data.footerTagline || '',
            footerDescription: data.footerDescription || '',
            copyrightText: data.copyrightText || '',
            mapEmbedUrl: data.mapEmbedUrl || '',
            defaultSeoTitle: data.defaultSeoTitle || '',
            defaultSeoDescription: data.defaultSeoDescription || '',
            defaultOgImage: data.defaultOgImage || '',
            googleSiteVerification: data.googleSiteVerification || '',
            robotsTxtOverride: data.robotsTxtOverride || '',
            socialLinks: {
              instagram: data.socialLinks?.instagram || '',
              facebook: data.socialLinks?.facebook || ''
            }
          });
        }
      })
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const val = type === 'checkbox' ? checked : value;
    setForm(prev => ({ ...prev, [name]: val }));
  };

  const handleSocialChange = (e) => {
    const { name, value } = e.target;
    setForm(prev => ({
      ...prev,
      socialLinks: {
        ...prev.socialLinks,
        [name]: value
      }
    }));
  };

  const save = async (e) => {
    e.preventDefault();
    setSaving(true);
    setMessage('');
    try {
      const res = await api('/admin/settings', {
        method: 'PUT',
        body: JSON.stringify(form)
      });
      if (res.ok) {
        setMessage('Site settings updated successfully.');
      } else {
        const err = await res.json().catch(() => null);
        setMessage(err?.message || 'Could not save settings.');
      }
    } catch {
      setMessage('Failed to connect to API server.');
    } finally {
      setSaving(false);
    }
  };

  const changePassword = async (e) => {
    e.preventDefault();
    if (pwForm.newPassword !== pwForm.confirmPassword) {
      setPwMessage({ text: 'New passwords do not match.', ok: false });
      return;
    }
    if (pwForm.newPassword.length < 12) {
      setPwMessage({ text: 'Password must be at least 12 characters.', ok: false });
      return;
    }
    setPwSaving(true);
    setPwMessage({ text: '', ok: true });
    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword: pwForm.currentPassword, newPassword: pwForm.newPassword })
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setPwMessage({ text: '✅ Password successfully changed!', ok: true });
        setPwForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      } else {
        setPwMessage({ text: data.message || 'Could not change password.', ok: false });
      }
    } catch {
      setPwMessage({ text: 'Network error. Try again.', ok: false });
    } finally {
      setPwSaving(false);
    }
  };

  const isSuperAdmin = user?.role === 'SUPER_ADMIN';

  return (
    <Shell>
      <PageHeader eyebrow="Configuration" title="Site settings" description="Manage global identity, contact details and publishing defaults." icon={Settings} />

      {loading ? (
        <div className="panel"><LoadingSkeleton rows={6} /></div>
      ) : (
        <form onSubmit={save} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '30px' }} className="editor-layout">
          {/* Main settings column */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* General Site Identity */}
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ margin: '0 0 10px', color: '#fff' }}>General Identity</h3>
              
              <label>Site Title</label>
              <input className="input" name="siteTitle" value={form.siteTitle} onChange={handleChange} required />

              <label>Tagline</label>
              <input className="input" name="siteTagline" value={form.siteTagline} onChange={handleChange} />

              <label>Site URL</label>
              <input className="input" type="url" name="siteUrl" value={form.siteUrl} onChange={handleChange} required />

              <label>Site Description</label>
              <textarea className="input" name="siteDescription" rows="3" value={form.siteDescription} onChange={handleChange} />

              <label>Logo URL</label>
              <input className="input" name="siteLogo" value={form.siteLogo} onChange={handleChange} placeholder="/img/logo/preva-logo.png" />
            </div>

            <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ margin: '0 0 10px', color: '#fff' }}>Header & Footer</h3>
              <label>Announcement</label><input className="input" name="announcementText" value={form.announcementText} onChange={handleChange} />
              <label>Secondary announcement</label><input className="input" name="announcementSecondary" value={form.announcementSecondary} onChange={handleChange} />
              <label>Header CTA label</label><input className="input" name="headerCtaText" value={form.headerCtaText} onChange={handleChange} />
              <label>Header CTA URL</label><input className="input" name="headerCtaUrl" value={form.headerCtaUrl} onChange={handleChange} />
              <label>Footer tagline</label><input className="input" name="footerTagline" value={form.footerTagline} onChange={handleChange} />
              <label>Footer description</label><textarea className="input" name="footerDescription" rows="3" value={form.footerDescription} onChange={handleChange} />
              <label>Copyright text</label><input className="input" name="copyrightText" value={form.copyrightText} onChange={handleChange} />
              <label>Google Maps embed URL</label><input className="input" name="mapEmbedUrl" value={form.mapEmbedUrl} onChange={handleChange} />
            </div>

            <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ margin: '0 0 10px', color: '#fff' }}>Default SEO &amp; Crawling</h3>
              <label>Default Meta Title</label><input className="input" name="defaultSeoTitle" value={form.defaultSeoTitle} onChange={handleChange} placeholder="e.g. Preva Detroit | Restaurant & Nightclub" />
              <label>Default Meta Description</label><textarea className="input" name="defaultSeoDescription" rows="3" value={form.defaultSeoDescription} onChange={handleChange} placeholder="Default fallback search snippet..." />
              <label>Default Social Share Image (OG Image)</label><input className="input" name="defaultOgImage" value={form.defaultOgImage} onChange={handleChange} placeholder="https://..." />
              <label>Google Search Console Verification (Meta Tag Code)</label><input className="input" name="googleSiteVerification" value={form.googleSiteVerification || ''} onChange={handleChange} placeholder="e.g. google-site-verification token..." />
              <label>Robots.txt Custom Override (Advanced)</label><textarea className="input" name="robotsTxtOverride" rows="4" value={form.robotsTxtOverride || ''} onChange={handleChange} placeholder="User-agent: *&#10;Allow: /&#10;Disallow: /admin/" style={{ fontFamily: 'var(--font-roboto), Arial, sans-serif', fontSize: '0.85rem' }} />
            </div>

            {/* Contact Information */}
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ margin: '0 0 10px', color: '#fff' }}>Contact Settings</h3>

              <label>Contact Email Address</label>
              <input className="input" type="email" name="contactEmail" value={form.contactEmail} onChange={handleChange} />

              <label>Phone Number</label>
              <input className="input" name="phone" value={form.phone} onChange={handleChange} />

              <label>Physical Address</label>
              <textarea className="input" name="address" rows="2" value={form.address} onChange={handleChange} />
            </div>

            {/* Custom Scripts (Super Admin only) */}
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              <h3 style={{ margin: '0 0 10px', color: '#fff' }}>Custom Integration Scripts</h3>
              {!isSuperAdmin && (
                <div className="error" style={{ marginBottom: '12px' }}>
                  Only Super Admins can add or edit custom scripts to prevent XSS issues.
                </div>
              )}

              <label>Header Scripts (e.g. Google Analytics, Meta Pixel)</label>
              <textarea 
                className="input" 
                name="headerScripts" 
                rows="5" 
                value={form.headerScripts} 
                onChange={handleChange} 
                disabled={!isSuperAdmin}
                placeholder="<!-- Scripts injected into head -->"
                style={{ fontFamily: 'var(--font-roboto), Arial, sans-serif', fontSize: '0.85rem' }}
              />

              <label>Footer Scripts</label>
              <textarea 
                className="input" 
                name="footerScripts" 
                rows="5" 
                value={form.footerScripts} 
                onChange={handleChange} 
                disabled={!isSuperAdmin}
                placeholder="<!-- Scripts injected before closing body -->"
                style={{ fontFamily: 'var(--font-roboto), Arial, sans-serif', fontSize: '0.85rem' }}
              />
            </div>
          </div>

          {/* Sidebar configs and actions */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ margin: '0 0 10px', color: '#fff' }}>Publish Actions</h3>
              
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', margin: '10px 0 20px' }}>
                <input 
                  type="checkbox" 
                  name="maintenanceMode" 
                  checked={form.maintenanceMode} 
                  onChange={handleChange} 
                />
                Enable Maintenance Mode
              </label>

              <button className="btn" type="submit" disabled={saving} style={{ width: '100%' }}>
                {saving ? 'Saving...' : 'Save Settings'}
              </button>
              {message && <p style={{ marginTop: '10px', fontSize: '0.85rem', color: '#81c784' }}>{message}</p>}
            </div>

            {/* Extra configuration rules */}
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ margin: '0 0 10px', color: '#fff' }}>Site Configuration</h3>
              
              <label>Posts Per Page</label>
              <input className="input" type="number" name="postsPerPage" min="1" max="100" value={form.postsPerPage} onChange={handleChange} />

              <label>Time Zone</label>
              <select className="input" name="timezone" value={form.timezone} onChange={handleChange}>
                <option value="America/New_York">Eastern Time</option>
                <option value="America/Detroit">Detroit Time</option>
                <option value="America/Chicago">Central Time</option>
                <option value="America/Denver">Mountain Time</option>
                <option value="America/Los_Angeles">Pacific Time</option>
                <option value="UTC">UTC</option>
              </select>
            </div>

            {/* Social channels link definitions */}
            <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <h3 style={{ margin: '0 0 10px', color: '#fff' }}>Social Links</h3>

              <label>Instagram URL</label>
              <input className="input" name="instagram" value={form.socialLinks.instagram} onChange={handleSocialChange} placeholder="https://instagram.com/..." />

              <label>Facebook URL</label>
              <input className="input" name="facebook" value={form.socialLinks.facebook} onChange={handleSocialChange} placeholder="https://facebook.com/..." />
            </div>

            {/* 🔑 Change Password Panel */}
            <form onSubmit={changePassword}>
              <div className="panel" style={{ display: 'flex', flexDirection: 'column', gap: '12px', border: '1px solid rgba(201,168,76,0.25)' }}>
                <h3 style={{ margin: '0 0 4px', color: '#fff', display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ fontSize: 18 }}>🔑</span> Change Password
                </h3>
                <p style={{ fontSize: '0.8rem', color: '#888', margin: '0 0 6px' }}>Apna admin password yahan se badlein.</p>

                <label>Current Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type={showPw.current ? 'text' : 'password'}
                    value={pwForm.currentPassword}
                    onChange={e => setPwForm(p => ({ ...p, currentPassword: e.target.value }))}
                    placeholder="Purana password"
                    required
                    style={{ paddingRight: 40 }}
                  />
                  <button type="button" onClick={() => setShowPw(p => ({ ...p, current: !p.current }))}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 16, padding: 0 }}>
                    {showPw.current ? '🙈' : '👁'}
                  </button>
                </div>

                <label>New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type={showPw.newPw ? 'text' : 'password'}
                    value={pwForm.newPassword}
                    onChange={e => setPwForm(p => ({ ...p, newPassword: e.target.value }))}
                    placeholder="Naya password (min 6 chars)"
                    required
                    style={{ paddingRight: 40 }}
                  />
                  <button type="button" onClick={() => setShowPw(p => ({ ...p, newPw: !p.newPw }))}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 16, padding: 0 }}>
                    {showPw.newPw ? '🙈' : '👁'}
                  </button>
                </div>

                <label>Confirm New Password</label>
                <div style={{ position: 'relative' }}>
                  <input
                    className="input"
                    type={showPw.confirm ? 'text' : 'password'}
                    value={pwForm.confirmPassword}
                    onChange={e => setPwForm(p => ({ ...p, confirmPassword: e.target.value }))}
                    placeholder="Dobara naya password"
                    required
                    style={{ paddingRight: 40, borderColor: pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword ? '#ff6b6b' : undefined }}
                  />
                  <button type="button" onClick={() => setShowPw(p => ({ ...p, confirm: !p.confirm }))}
                    style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: 16, padding: 0 }}>
                    {showPw.confirm ? '🙈' : '👁'}
                  </button>
                </div>
                {pwForm.confirmPassword && pwForm.newPassword !== pwForm.confirmPassword && (
                  <p style={{ fontSize: '0.78rem', color: '#ff6b6b', margin: '-4px 0 0' }}>⚠ Passwords match nahi kar rahe</p>
                )}

                <button className="btn" type="submit" disabled={pwSaving} style={{ width: '100%', marginTop: 4 }}>
                  {pwSaving ? 'Updating...' : '🔒 Update Password'}
                </button>

                {pwMessage.text && (
                  <p style={{ fontSize: '0.83rem', color: pwMessage.ok ? '#81c784' : '#ff6b6b', margin: 0, fontWeight: 500 }}>
                    {pwMessage.text}
                  </p>
                )}
              </div>
            </form>

          </div>
        </form>
      )}
    </Shell>
  );
}
