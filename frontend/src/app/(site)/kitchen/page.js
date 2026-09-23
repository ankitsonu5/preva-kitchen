'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { AlertCircle, Eye, EyeOff, KeyRound, Lock, RefreshCw, User } from 'lucide-react';
import { useKdsBoard, ensureAudioContext, getAudioContextState, resumeAudioContext, playKitchenChime } from '@/lib/kds/useKdsBoard';
import KdsBoard from '@/components/kds/KdsBoard';

const TOKEN_STORAGE_KEY = 'preva_kitchen_token';

/**
 * Standalone kitchen terminal talks only to the token-authenticated
 * `/shop/kitchen-tickets` routes — it has no admin session to fall back on,
 * so an expired/invalid token sends the terminal back to the lock screen.
 */
function createKitchenClient(authToken, onUnauthorized) {
  const request = async (path, options = {}) => {
    const headers = new Headers(options.headers || {});
    if (authToken) headers.set('Authorization', `Bearer ${authToken}`);
    if (options.body && !headers.has('Content-Type')) headers.set('Content-Type', 'application/json');
    const res = await fetch(`/api${path}`, { ...options, headers, cache: 'no-store' });
    if (res.status === 401) {
      onUnauthorized?.();
      const err = new Error('Kitchen session expired.');
      err.unauthorized = true;
      throw err;
    }
    return res;
  };
  const parseError = async (res, fallback) => {
    const data = await res.json().catch(() => ({}));
    return new Error(data?.message || fallback);
  };

  return {
    fetchActive: async () => {
      const res = await request('/shop/kitchen-tickets');
      if (!res.ok) throw new Error('Could not fetch kitchen tickets');
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    fetchRecalls: async () => {
      const res = await request('/shop/kitchen-recalls');
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
    updateStatus: async (orderId, status, details) => {
      const res = await request(`/shop/kitchen-tickets/${orderId}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status, ...details })
      });
      if (!res.ok) throw await parseError(res, 'Status update failed');
    },
    fire: async (orderId) => {
      const res = await request(`/shop/kitchen-tickets/${orderId}/fire`, { method: 'PATCH' });
      if (!res.ok) throw await parseError(res, 'Could not fire scheduled order');
      return res.json();
    },
    toggleItem: async (orderId, idx, checked) => {
      const res = await request(`/shop/kitchen-tickets/${orderId}/items/${idx}`, {
        method: 'PATCH',
        body: JSON.stringify({ checked })
      });
      if (!res.ok) throw await parseError(res, 'Item update failed');
    },
    assign: async (orderId, station, assignee) => {
      const res = await request(`/shop/kitchen-tickets/${orderId}/assignment`, {
        method: 'PATCH',
        body: JSON.stringify({ station, assignee })
      });
      if (!res.ok) throw await parseError(res, 'Could not assign ticket');
      const data = await res.json();
      return data.assignment;
    },
    assignDriver: async (orderId, name, phone) => {
      const res = await request(`/shop/kitchen-tickets/${orderId}/driver`, { method: 'PATCH', body: JSON.stringify({ name, phone }) });
      if (!res.ok) throw await parseError(res, 'Could not assign driver');
      return (await res.json()).driver;
    },
    markPaid: async (orderId, method, details) => {
      const res = await request(`/shop/dine-in-orders/${orderId}/payment`, {
        method: 'PATCH',
        body: JSON.stringify({ method, ...details })
      });
      if (!res.ok) throw await parseError(res, 'Could not mark this order paid');
      return res.json();
    }
  };
}

const renderLockButton = (onLock) => (
  <button
    type="button"
    onClick={onLock}
    title="Lock Kitchen Terminal (Requires password to unlock)"
    style={{
      height: '36px',
      padding: '0 12px',
      borderRadius: '8px',
      background: 'rgba(239, 68, 68, 0.12)',
      color: '#fca5a5',
      border: '1px solid rgba(239, 68, 68, 0.35)',
      fontSize: '12px',
      fontWeight: 700,
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      cursor: 'pointer',
      whiteSpace: 'nowrap'
    }}
  >
    <Lock size={14} />
    <span>Lock</span>
  </button>
);

export default function KitchenDisplayPage() {
  const [authToken, setAuthToken] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginId, setLoginId] = useState('chef');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [newOrderAlert, setNewOrderAlert] = useState(null);
  const [audioNeedsUnlock, setAudioNeedsUnlock] = useState(false);

  const handleLock = () => {
    localStorage.removeItem(TOKEN_STORAGE_KEY);
    setAuthToken(null);
  };

  const client = useMemo(
    () => (authToken ? createKitchenClient(authToken, handleLock) : null),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [authToken]
  );

  const board = useKdsBoard({
    client,
    soundStorageKey: 'preva_kitchen_sound',
    active: Boolean(authToken),
    sseUrl: authToken ? `/api/shop/kitchen-events?token=${encodeURIComponent(authToken)}` : null,
    onNewOrder: (order) => {
      setNewOrderAlert(order);
      setTimeout(() => setNewOrderAlert(null), 8000);
    }
  });

  // Check saved kitchen token on mount.
  useEffect(() => {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) setAuthToken(token);
    setAuthChecked(true);
  }, []);

  // Audio Context unlock detection (kiosk browsers block autoplay until a gesture).
  useEffect(() => {
    ensureAudioContext();
    if (getAudioContextState() === 'suspended') setAudioNeedsUnlock(true);
    const unlockAudio = () => {
      resumeAudioContext().then(() => setAudioNeedsUnlock(false)).catch(() => {});
    };
    window.addEventListener('click', unlockAudio, { once: true });
    window.addEventListener('touchstart', unlockAudio, { once: true });
    window.addEventListener('keydown', unlockAudio, { once: true });
    return () => {
      window.removeEventListener('click', unlockAudio);
      window.removeEventListener('touchstart', unlockAudio);
      window.removeEventListener('keydown', unlockAudio);
    };
  }, []);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();
    if (!loginPassword.trim()) {
      setLoginError('Please enter password.');
      return;
    }
    setLoginLoading(true);
    setLoginError('');
    try {
      const res = await fetch('/api/shop/kitchen-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: loginId.trim(), password: loginPassword.trim() })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Invalid Kitchen ID or Password.');
      localStorage.setItem(TOKEN_STORAGE_KEY, data.token);
      setAuthToken(data.token);
      setLoginPassword('');
      setLoginError('');
    } catch (err) {
      setLoginError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Fullscreen support & keyboard shortcut ('F').
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {});
      setIsFullscreen(true);
    } else {
      document.exitFullscreen().catch(() => {});
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const handleFsChange = () => setIsFullscreen(Boolean(document.fullscreenElement));
    const handleKeyDown = (e) => {
      if ((e.key === 'f' || e.key === 'F') && !['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
        toggleFullscreen();
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Lock body/html scrollbars on kiosk mode.
  useEffect(() => {
    const origHtmlOverflow = document.documentElement.style.overflow;
    const origBodyOverflow = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = origHtmlOverflow;
      document.body.style.overflow = origBodyOverflow;
    };
  }, []);

  if (!authChecked) return null;

  if (!authToken) {
    return (
      <div style={{ width: '100%', height: '100vh', maxWidth: '100vw', maxHeight: '100vh', overflow: 'hidden', background: '#07070a', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '24px', boxSizing: 'border-box', position: 'relative' }}>
        <div style={{ position: 'absolute', width: '500px', height: '500px', borderRadius: '50%', background: 'radial-gradient(circle, rgba(201, 168, 76, 0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />

        <div style={{ width: '100%', maxWidth: '440px', background: 'linear-gradient(180deg, #15151e 0%, #0e0e15 100%)', border: '1px solid rgba(201, 168, 76, 0.35)', borderRadius: '24px', padding: '40px 32px', boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(201, 168, 76, 0.1)', position: 'relative', zIndex: 10 }}>
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ width: '72px', height: '72px', borderRadius: '20px', background: 'linear-gradient(135deg, rgba(201, 168, 76, 0.25) 0%, rgba(201, 168, 76, 0.05) 100%)', border: '1px solid rgba(201, 168, 76, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 16px', boxShadow: '0 0 24px rgba(201, 168, 76, 0.2)' }}>
              <KeyRound size={38} color="#f0d080" />
            </div>
            <h2 style={{ margin: '0 0 8px', fontSize: '24px', fontWeight: 900, letterSpacing: '1px', background: 'linear-gradient(135deg, #FFF 0%, #f0d080 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
              KITCHEN TERMINAL ACCESS
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#888', lineHeight: 1.5 }}>
              Restricted to authorized kitchen staff & expeditors. Enter terminal credentials to unlock live KDS.
            </p>
          </div>

          {loginError && (
            <div style={{ background: 'rgba(239, 68, 68, 0.15)', border: '1px solid #ef4444', borderRadius: '10px', padding: '12px 14px', color: '#fca5a5', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '20px' }}>
              <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
              <span>{loginError}</span>
            </div>
          )}

          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#f0d080', letterSpacing: '0.5px', marginBottom: '8px' }}>
                Kitchen Staff ID / Username
              </label>
              <div style={{ position: 'relative' }}>
                <User size={18} color="#888" style={{ position: 'absolute', left: '14px', top: '15px' }} />
                <input
                  type="text"
                  value={loginId}
                  onChange={(e) => setLoginId(e.target.value)}
                  placeholder="e.g. chef"
                  required
                  style={{ width: '100%', boxSizing: 'border-box', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '14px 14px 14px 44px', fontSize: '15px', fontWeight: 700, color: '#fff', outline: 'none' }}
                />
              </div>
            </div>

            <div>
              <label style={{ display: 'block', fontSize: '12px', fontWeight: 800, textTransform: 'uppercase', color: '#f0d080', letterSpacing: '0.5px', marginBottom: '8px' }}>
                Kitchen Security Password
              </label>
              <div style={{ position: 'relative' }}>
                <Lock size={18} color="#888" style={{ position: 'absolute', left: '14px', top: '15px' }} />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={loginPassword}
                  onChange={(e) => setLoginPassword(e.target.value)}
                  placeholder="Enter kitchen password"
                  required
                  style={{ width: '100%', boxSizing: 'border-box', background: '#0a0a0f', border: '1px solid rgba(255,255,255,0.12)', borderRadius: '12px', padding: '14px 44px 14px 44px', fontSize: '15px', fontWeight: 700, color: '#fff', outline: 'none' }}
                />
                <button type="button" onClick={() => setShowPassword(!showPassword)} style={{ position: 'absolute', right: '12px', top: '12px', background: 'transparent', border: 'none', color: '#888', cursor: 'pointer', padding: '4px' }}>
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loginLoading}
              style={{ marginTop: '10px', height: '52px', borderRadius: '12px', background: 'linear-gradient(135deg, #f0d080 0%, #c9a84c 100%)', border: 'none', color: '#000', fontSize: '15px', fontWeight: 900, letterSpacing: '0.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '10px', cursor: 'pointer', boxShadow: '0 6px 25px rgba(201, 168, 76, 0.4)' }}
            >
              {loginLoading ? (
                <RefreshCw size={20} style={{ animation: 'spin 1s linear infinite' }} />
              ) : (
                <>
                  <KeyRound size={18} />
                  <span>UNLOCK KITCHEN DISPLAY</span>
                </>
              )}
            </button>
          </form>

          <div style={{ marginTop: '24px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
            <Link href="/display" style={{ fontSize: '13px', color: '#888', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '6px' }}>
              <span>Looking for customer TV pickup board?</span>
              <span style={{ color: '#f0d080', textDecoration: 'underline' }}>Open TV Board</span>
            </Link>
          </div>

          <style jsx global>{`
            @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
          `}</style>
        </div>
      </div>
    );
  }

  return (
    <KdsBoard
      board={board}
      badgeLabel="CHEF KDS"
      headerRight={renderLockButton(handleLock)}
      authToken={authToken}
      onUnauthorized={handleLock}
      isFullscreen={isFullscreen}
      onToggleFullscreen={toggleFullscreen}
      newOrderAlert={newOrderAlert}
      onDismissNewOrderAlert={() => setNewOrderAlert(null)}
      audioNeedsUnlock={audioNeedsUnlock}
      onUnlockAudio={() => {
        resumeAudioContext();
        playKitchenChime();
        setAudioNeedsUnlock(false);
      }}
    />
  );
}
