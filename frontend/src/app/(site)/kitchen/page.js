'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertCircle,
  ArrowLeft,
  Bell,
  BellOff,
  Check,
  CheckCircle2,
  ChefHat,
  Clock,
  Eye,
  EyeOff,
  ExternalLink,
  Flame,
  History,
  KeyRound,
  Lock,
  LogOut,
  Maximize2,
  Minimize2,
  PackageCheck,
  Printer,
  RefreshCw,
  Search,
  ShieldCheck,
  Sparkles,
  Truck,
  Undo2,
  User,
  Utensils,
  Volume2,
  X
} from 'lucide-react';

/* ── Web Audio Synth Alert (High-Fidelity Kitchen Order Bell) ─────────────── */

let audioCtx = null;

function playKitchenChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;

    // Rich 3-Tone Culinary Alert Bell (D5 -> F#5 -> A5)
    const tones = [
      { freq: 587.33, time: now, dur: 0.22, gain: 0.3 },
      { freq: 739.99, time: now + 0.16, dur: 0.25, gain: 0.35 },
      { freq: 880.00, time: now + 0.34, dur: 0.65, gain: 0.45 }
    ];

    tones.forEach(({ freq, time, dur, gain }) => {
      const osc = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);
      gainNode.gain.setValueAtTime(gain, time);
      gainNode.gain.exponentialRampToValueAtTime(0.001, time + dur);
      osc.connect(gainNode);
      gainNode.connect(audioCtx.destination);
      osc.start(time);
      osc.stop(time + dur);
    });
  } catch (e) {
    console.warn('[Kitchen Audio error]:', e);
  }
}

/* ── Helpers ───────────────────────────────────────────────────────────── */

function formatElapsed(createdAt) {
  if (!createdAt) return '00:00';
  const elapsedMs = Math.max(0, Date.now() - new Date(createdAt).getTime());
  const totalSeconds = Math.floor(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function getUrgency(createdAt, isScheduled, scheduledAt) {
  if (isScheduled && scheduledAt) {
    const timeUntil = new Date(scheduledAt).getTime() - Date.now();
    if (timeUntil < 0) return 'urgent';
    if (timeUntil < 20 * 60 * 1000) return 'warning';
    return 'scheduled';
  }
  const minutes = (Date.now() - new Date(createdAt).getTime()) / (60 * 1000);
  if (minutes >= 25) return 'urgent';
  if (minutes >= 14) return 'warning';
  return 'normal';
}

/* ── Main Chef Kitchen Display System Page ───────────────────────────────── */

export default function KitchenDisplayPage() {
  // Auth state
  const [authToken, setAuthToken] = useState(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loginId, setLoginId] = useState('chef');
  const [loginPassword, setLoginPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  // KDS operational state
  const [orders, setOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [filterStage, setFilterStage] = useState('ALL'); // ALL, RECEIVED, PREPARING, READY
  const [filterFulfilment, setFilterFulfilment] = useState('ALL'); // ALL, PICKUP, DELIVERY
  const [showPrepSummary, setShowPrepSummary] = useState(false);
  const [showRecallDrawer, setShowRecallDrawer] = useState(false);
  const [checkedItems, setCheckedItems] = useState({}); // { `${orderId}-${idx}`: true }
  const [processingId, setProcessingId] = useState(null);
  const [newOrderAlert, setNewOrderAlert] = useState(null);

  const previousOrderIdsRef = useRef(new Set());
  const isInitialLoadRef = useRef(true);

  const [printingOrder, setPrintingOrder] = useState(null);
  const [audioNeedsUnlock, setAudioNeedsUnlock] = useState(false);

  // Trigger print when printingOrder is set
  useEffect(() => {
    if (printingOrder) {
      const timer = setTimeout(() => {
        window.print();
      }, 180);
      return () => clearTimeout(timer);
    }
  }, [printingOrder]);

  // Audio Context unlock detection
  useEffect(() => {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      if (!audioCtx) audioCtx = new AudioContextClass();
      if (audioCtx.state === 'suspended') {
        setAudioNeedsUnlock(true);
      }
    }

    const unlockAudio = () => {
      if (audioCtx && audioCtx.state === 'suspended') {
        audioCtx.resume().then(() => {
          setAudioNeedsUnlock(false);
        }).catch(() => {});
      } else {
        setAudioNeedsUnlock(false);
      }
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

  // Check saved kitchen token on mount
  useEffect(() => {
    const token = localStorage.getItem('preva_kitchen_token');
    if (token) {
      setAuthToken(token);
    }
    setAuthChecked(true);

    const savedSound = localStorage.getItem('preva_kitchen_sound');
    if (savedSound !== null) setSoundEnabled(savedSound === 'true');
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('preva_kitchen_sound', String(next));
    if (next) playKitchenChime();
  };

  // Handle Kitchen Terminal Login
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
      if (!res.ok) {
        throw new Error(data?.message || 'Invalid Kitchen ID or Password.');
      }

      localStorage.setItem('preva_kitchen_token', data.token);
      setAuthToken(data.token);
      setLoginPassword('');
      setLoginError('');
    } catch (err) {
      setLoginError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoginLoading(false);
    }
  };

  // Handle Terminal Logout / Lock
  const handleLock = () => {
    localStorage.removeItem('preva_kitchen_token');
    setAuthToken(null);
    setOrders([]);
  };

  // Fullscreen support & keyboard shortcut ('F')
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
      if (e.key === 'f' || e.key === 'F') {
        if (!['INPUT', 'TEXTAREA'].includes(e.target.tagName)) {
          toggleFullscreen();
        }
      }
    };
    document.addEventListener('fullscreenchange', handleFsChange);
    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('fullscreenchange', handleFsChange);
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  // Lock body/html scrollbars on kiosk mode
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

  // Live ticking clock & stopwatch updates every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch active kitchen tickets with token
  const fetchTickets = useCallback(async ({ silent = false } = {}) => {
    if (!authToken) return;

    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      const res = await fetch('/api/shop/kitchen-tickets', {
        headers: { Authorization: `Bearer ${authToken}` },
        cache: 'no-store'
      });

      if (res.status === 401) {
        // Token expired or invalid, return to lock screen
        handleLock();
        return;
      }

      if (!res.ok) throw new Error('Could not fetch kitchen tickets');
      const data = await res.json();
      const activeRows = Array.isArray(data) ? data : [];

      // Check for brand-new incoming orders
      const currentIds = new Set(activeRows.map((o) => o.id));
      if (!isInitialLoadRef.current) {
        let incomingTicket = null;
        for (const ticket of activeRows) {
          if (!previousOrderIdsRef.current.has(ticket.id)) {
            incomingTicket = ticket;
            break;
          }
        }

        if (incomingTicket) {
          if (soundEnabled) playKitchenChime();
          setNewOrderAlert(incomingTicket);
          setTimeout(() => setNewOrderAlert(null), 8000);
        }
      }

      previousOrderIdsRef.current = currentIds;
      isInitialLoadRef.current = false;
      setOrders(activeRows);
    } catch (err) {
      console.warn('[Kitchen KDS] fetch error:', err.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [authToken, soundEnabled]);

  // Fetch recalled / recently completed tickets
  const fetchRecalls = useCallback(async () => {
    if (!authToken) return;
    try {
      const res = await fetch('/api/shop/kitchen-recalls', {
        headers: { Authorization: `Bearer ${authToken}` },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setCompletedOrders(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.warn('[Kitchen Recalls] error:', e);
    }
  }, [authToken]);

  // Auto-poll every 3.5 seconds when authenticated
  useEffect(() => {
    if (!authToken) return;
    fetchTickets();
    const pollInterval = setInterval(() => fetchTickets({ silent: true }), 3500);
    return () => clearInterval(pollInterval);
  }, [authToken, fetchTickets]);

  // Update order status (1-tap workflow)
  const updateStatus = async (order, targetStatus) => {
    if (!authToken) return;
    setProcessingId(order.id);
    try {
      const res = await fetch(`/api/shop/kitchen-tickets/${order.id}/status`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${authToken}`
        },
        body: JSON.stringify({ status: targetStatus })
      });
      if (res.status === 401) {
        handleLock();
        return;
      }
      if (!res.ok) throw new Error('Status update failed');

      // Optimistic state transition
      if (['COMPLETED', 'DELIVERED', 'CANCELLED'].includes(targetStatus)) {
        setOrders((prev) => prev.filter((o) => o.id !== order.id));
      } else {
        setOrders((prev) => prev.map((o) => (o.id === order.id ? { ...o, status: targetStatus } : o)));
      }

      fetchTickets({ silent: true });
    } catch (err) {
      console.error('[Kitchen KDS] status change error:', err);
    } finally {
      setProcessingId(null);
    }
  };

  // Toggle checklist strike-through
  const toggleItemCheck = (orderId, idx) => {
    const key = `${orderId}-${idx}`;
    setCheckedItems((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      if (filterStage === 'RECEIVED' && !['RECEIVED', 'PAID'].includes(order.status)) return false;
      if (filterStage === 'PREPARING' && order.status !== 'PREPARING') return false;
      if (filterStage === 'READY' && order.status !== 'READY') return false;
      if (filterStage === 'ON_THE_WAY' && order.status !== 'ON_THE_WAY') return false;
      if (filterFulfilment !== 'ALL' && order.fulfilment !== filterFulfilment) return false;
      return true;
    });
  }, [orders, filterStage, filterFulfilment]);

  // Counts by stage
  const counts = useMemo(() => {
    const waiting = orders.filter((o) => ['RECEIVED', 'PAID'].includes(o.status)).length;
    const cooking = orders.filter((o) => o.status === 'PREPARING').length;
    const ready = orders.filter((o) => o.status === 'READY').length;
    const onTheWay = orders.filter((o) => o.status === 'ON_THE_WAY').length;
    return { waiting, cooking, ready, onTheWay, total: orders.length };
  }, [orders]);

  // All-Day Aggregate Item Counts
  const allDayPrepSummary = useMemo(() => {
    const map = new Map();
    for (const order of orders) {
      if (order.status === 'READY' || order.status === 'ON_THE_WAY') continue;
      for (const line of order.lines || []) {
        const key = line.name;
        const current = map.get(key) || { name: key, qty: 0, options: [] };
        current.qty += Number(line.qty) || 1;
        if (line.options && !current.options.includes(line.options)) {
          current.options.push(line.options);
        }
        map.set(key, current);
      }
    }
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
  }, [orders]);

  /* ── 1. SECURITY LOCK SCREEN IF NOT AUTHENTICATED ────────────────────────── */

  if (!authChecked) {
    return null;
  }

  if (!authToken) {
    return (
      <div style={{
        width: '100%',
        height: '100vh',
        maxWidth: '100vw',
        maxHeight: '100vh',
        overflow: 'hidden',
        background: '#07070a',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        boxSizing: 'border-box',
        position: 'relative'
      }}>
        {/* Subtle Luxury Ambient Glow */}
        <div style={{
          position: 'absolute',
          width: '500px',
          height: '500px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(201, 168, 76, 0.12) 0%, transparent 70%)',
          pointerEvents: 'none'
        }} />

        <div style={{
          width: '100%',
          maxWidth: '440px',
          background: 'linear-gradient(180deg, #15151e 0%, #0e0e15 100%)',
          border: '1px solid rgba(201, 168, 76, 0.35)',
          borderRadius: '24px',
          padding: '40px 32px',
          boxShadow: '0 20px 60px rgba(0,0,0,0.8), 0 0 40px rgba(201, 168, 76, 0.1)',
          position: 'relative',
          zIndex: 10
        }}>
          {/* Header Icon & Title */}
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{
              width: '72px',
              height: '72px',
              borderRadius: '20px',
              background: 'linear-gradient(135deg, rgba(201, 168, 76, 0.25) 0%, rgba(201, 168, 76, 0.05) 100%)',
              border: '1px solid rgba(201, 168, 76, 0.4)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 16px',
              boxShadow: '0 0 24px rgba(201, 168, 76, 0.2)'
            }}>
              <ChefHat size={38} color="#f0d080" />
            </div>

            <h2 style={{
              margin: '0 0 8px',
              fontSize: '24px',
              fontWeight: 900,
              letterSpacing: '1px',
              background: 'linear-gradient(135deg, #FFF 0%, #f0d080 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              KITCHEN TERMINAL ACCESS
            </h2>
            <p style={{ margin: 0, fontSize: '13px', color: '#888', lineHeight: 1.5 }}>
              Restricted to authorized kitchen staff & expeditors. Enter terminal credentials to unlock live KDS.
            </p>
          </div>

          {/* Error Banner */}
          {loginError && (
            <div style={{
              background: 'rgba(239, 68, 68, 0.15)',
              border: '1px solid #ef4444',
              borderRadius: '10px',
              padding: '12px 14px',
              color: '#fca5a5',
              fontSize: '13px',
              fontWeight: 600,
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              marginBottom: '20px'
            }}>
              <AlertCircle size={18} color="#ef4444" style={{ flexShrink: 0 }} />
              <span>{loginError}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
            {/* Staff ID */}
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
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#0a0a0f',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '12px',
                    padding: '14px 14px 14px 44px',
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#fff',
                    outline: 'none',
                    transition: 'border 0.2s'
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#f0d080')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
                />
              </div>
            </div>

            {/* Password */}
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
                  style={{
                    width: '100%',
                    boxSizing: 'border-box',
                    background: '#0a0a0f',
                    border: '1px solid rgba(255,255,255,0.12)',
                    borderRadius: '12px',
                    padding: '14px 44px 14px 44px',
                    fontSize: '15px',
                    fontWeight: 700,
                    color: '#fff',
                    outline: 'none',
                    transition: 'border 0.2s'
                  }}
                  onFocus={(e) => (e.target.style.borderColor = '#f0d080')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.12)')}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '12px',
                    top: '12px',
                    background: 'transparent',
                    border: 'none',
                    color: '#888',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Unlock Button */}
            <button
              type="submit"
              disabled={loginLoading}
              style={{
                marginTop: '10px',
                height: '52px',
                borderRadius: '12px',
                background: 'linear-gradient(135deg, #f0d080 0%, #c9a84c 100%)',
                border: 'none',
                color: '#000',
                fontSize: '15px',
                fontWeight: 900,
                letterSpacing: '0.5px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '10px',
                cursor: 'pointer',
                boxShadow: '0 6px 25px rgba(201, 168, 76, 0.4)',
                transition: 'transform 0.15s'
              }}
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

          {/* Public TV Board link */}
          <div style={{ marginTop: '24px', textAlign: 'center', borderTop: '1px solid rgba(255,255,255,0.08)', paddingTop: '16px' }}>
            <Link
              href="/display"
              style={{
                fontSize: '13px',
                color: '#888',
                textDecoration: 'none',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <span>Looking for customer TV pickup board?</span>
              <span style={{ color: '#f0d080', textDecoration: 'underline' }}>Open TV Board</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  /* ── 2. FULL AUTHENTICATED ULTRA-PREMIUM KDS ───────────────────────────── */

  return (
    <div style={{
      width: '100%',
      height: '100vh',
      maxWidth: '100vw',
      maxHeight: '100vh',
      overflow: 'hidden',
      background: '#07070a',
      color: '#f4f0e6',
      fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
      display: 'flex',
      flexDirection: 'column',
      userSelect: 'none',
      boxSizing: 'border-box'
    }}>
      {/* ── NEW ORDER LOUD BANNER ALERT ────────────────────────────────────── */}
      {newOrderAlert && (
        <div style={{
          background: 'linear-gradient(90deg, #b45309 0%, #d97706 50%, #b45309 100%)',
          color: '#fff',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          animation: 'pulse 1.2s infinite',
          boxShadow: '0 4px 20px rgba(245, 158, 11, 0.6)',
          zIndex: 100,
          position: 'relative'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{ fontSize: '24px' }}>🔔</span>
            <strong style={{ fontSize: '18px', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
              NEW ORDER #{newOrderAlert.orderNumber} RECEIVED! ({newOrderAlert.fulfilment})
            </strong>
          </div>
          <button
            type="button"
            onClick={() => setNewOrderAlert(null)}
            style={{
              background: 'rgba(0,0,0,0.3)',
              border: 'none',
              color: '#fff',
              padding: '6px 14px',
              borderRadius: '6px',
              fontWeight: 700,
              cursor: 'pointer'
            }}
          >
            DISMISS
          </button>
        </div>
      )}

      {/* ── AUDIO AUTOPLAY PERMISSION UNBLOCKER BANNER ── */}
      {audioNeedsUnlock && (
        <div
          onClick={() => {
            if (audioCtx && audioCtx.state === 'suspended') {
              audioCtx.resume();
            }
            playKitchenChime();
            setAudioNeedsUnlock(false);
          }}
          style={{
            background: 'linear-gradient(90deg, #92400e 0%, #b45309 100%)',
            color: '#fef3c7',
            padding: '9px 20px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '10px',
            fontSize: '13px',
            fontWeight: 700,
            cursor: 'pointer',
            borderBottom: '1px solid rgba(251, 191, 36, 0.4)',
            boxShadow: '0 4px 14px rgba(0,0,0,0.4)',
            flexShrink: 0
          }}
        >
          <Volume2 size={16} />
          <span>Sound is muted by browser policy. Click anywhere to activate live kitchen order chimes.</span>
          <span style={{
            background: '#fef3c7',
            color: '#78350f',
            padding: '2px 10px',
            borderRadius: '6px',
            fontWeight: 900,
            fontSize: '11px',
            textTransform: 'uppercase'
          }}>
            Enable Chimes 🔔
          </span>
        </div>
      )}

      {/* ── TIER 1: BRANDING & SYSTEM UTILITIES BAR ───────────────────────── */}
      <header style={{
        background: 'linear-gradient(180deg, #161620 0%, #111118 100%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        height: '60px',
        boxSizing: 'border-box'
      }}>
        {/* Left: Branding & Digital Clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '38px',
            height: '38px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(201, 168, 76, 0.25) 0%, rgba(201, 168, 76, 0.06) 100%)',
            border: '1px solid rgba(201, 168, 76, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 14px rgba(201, 168, 76, 0.15)',
            flexShrink: 0
          }}>
            <ChefHat size={22} color="#f0d080" />
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <h1 style={{
              margin: 0,
              fontSize: '20px',
              fontWeight: 900,
              letterSpacing: '0.5px',
              background: 'linear-gradient(135deg, #FFF 0%, #f0d080 100%)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent',
              whiteSpace: 'nowrap'
            }}>
              PREVA KITCHEN
            </h1>
            <span style={{
              fontSize: '11px',
              fontWeight: 800,
              textTransform: 'uppercase',
              padding: '2px 8px',
              borderRadius: '5px',
              background: 'rgba(201, 168, 76, 0.15)',
              color: '#f0d080',
              border: '1px solid rgba(201, 168, 76, 0.35)',
              letterSpacing: '0.5px',
              whiteSpace: 'nowrap'
            }}>
              CHEF KDS
            </span>
          </div>

          <div style={{ width: '1px', height: '22px', background: 'rgba(255,255,255,0.12)', margin: '0 4px' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <span style={{
              display: 'inline-block',
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: refreshing ? '#f59e0b' : '#10b981',
              boxShadow: refreshing ? '0 0 8px #f59e0b' : '0 0 8px #10b981',
              flexShrink: 0
            }} />
            <span style={{ color: '#aaa', whiteSpace: 'nowrap' }}>{refreshing ? 'Syncing...' : 'Live (3.5s)'}</span>
            <span style={{ color: '#555' }}>•</span>
            <Clock size={14} style={{ display: 'inline', color: '#c9a84c', flexShrink: 0 }} />
            <span style={{ color: '#f0d080', fontWeight: 800, fontFamily: 'monospace', fontSize: '14px', whiteSpace: 'nowrap' }}>
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>

        {/* Right: Master Utility Actions (Uniform 36px Height & 8px Radius) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Sound Alert Toggle */}
          <button
            type="button"
            onClick={toggleSound}
            title={soundEnabled ? 'Mute Kitchen Bell' : 'Unmute Kitchen Bell'}
            style={{
              height: '36px',
              padding: '0 12px',
              borderRadius: '8px',
              background: soundEnabled ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              color: soundEnabled ? '#34d399' : '#f87171',
              border: `1px solid ${soundEnabled ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
              fontSize: '12px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {soundEnabled ? <Bell size={15} /> : <BellOff size={15} />}
            <span>{soundEnabled ? 'Chime ON' : 'Muted'}</span>
          </button>

          {/* Public TV Screen Link */}
          <Link
            href="/display"
            target="_blank"
            title="Open Public Customer TV Display Board in new window"
            style={{
              height: '36px',
              padding: '0 12px',
              borderRadius: '8px',
              background: '#1c1c28',
              color: '#f0d080',
              border: '1px solid rgba(201, 168, 76, 0.35)',
              fontSize: '12px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              textDecoration: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxSizing: 'border-box'
            }}
          >
            <ExternalLink size={14} />
            <span>TV Board</span>
          </Link>

          {/* Fullscreen Button */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen (Wall Display)'}
            style={{
              height: '36px',
              padding: '0 12px',
              borderRadius: '8px',
              background: isFullscreen ? 'rgba(201, 168, 76, 0.2)' : '#1c1c28',
              color: isFullscreen ? '#f0d080' : '#ddd',
              border: `1px solid ${isFullscreen ? '#f0d080' : 'rgba(255,255,255,0.12)'}`,
              fontSize: '12px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              whiteSpace: 'nowrap'
            }}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            <span>{isFullscreen ? 'Window' : 'Fullscreen'}</span>
          </button>

          {/* Lock / Logout Terminal Button */}
          <button
            type="button"
            onClick={handleLock}
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
        </div>
      </header>

      {/* ── TIER 2: STATION CONTROLS & FILTER COMMAND BAR ───────────────────── */}
      <div style={{
        background: '#0d0d14',
        borderBottom: '1px solid rgba(201, 168, 76, 0.25)',
        padding: '8px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        height: '52px',
        boxSizing: 'border-box'
      }}>
        {/* Left: Stage Filter Tabs (Uniform 36px Segmented Control) */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: '#151520',
          borderRadius: '10px',
          padding: '3px',
          border: '1px solid rgba(255,255,255,0.08)',
          gap: '3px'
        }}>
          <button
            type="button"
            onClick={() => setFilterStage('ALL')}
            style={{
              height: '32px',
              padding: '0 14px',
              borderRadius: '7px',
              border: 'none',
              background: filterStage === 'ALL' ? 'linear-gradient(135deg, #f0d080 0%, #c9a84c 100%)' : 'transparent',
              color: filterStage === 'ALL' ? '#000' : '#999',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            All Active
            <span style={{
              background: filterStage === 'ALL' ? 'rgba(0,0,0,0.3)' : '#222230',
              color: filterStage === 'ALL' ? '#000' : '#aaa',
              padding: '1px 6px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 900
            }}>{counts.total}</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStage('RECEIVED')}
            style={{
              height: '32px',
              padding: '0 14px',
              borderRadius: '7px',
              border: 'none',
              background: filterStage === 'RECEIVED' ? '#f59e0b' : 'transparent',
              color: filterStage === 'RECEIVED' ? '#000' : '#999',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            🔥 Waiting
            <span style={{
              background: filterStage === 'RECEIVED' ? 'rgba(0,0,0,0.3)' : '#222230',
              color: filterStage === 'RECEIVED' ? '#000' : '#aaa',
              padding: '1px 6px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 900
            }}>{counts.waiting}</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStage('PREPARING')}
            style={{
              height: '32px',
              padding: '0 14px',
              borderRadius: '7px',
              border: 'none',
              background: filterStage === 'PREPARING' ? '#3b82f6' : 'transparent',
              color: filterStage === 'PREPARING' ? '#fff' : '#999',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            🍳 Cooking
            <span style={{
              background: filterStage === 'PREPARING' ? 'rgba(0,0,0,0.3)' : '#222230',
              color: filterStage === 'PREPARING' ? '#fff' : '#aaa',
              padding: '1px 6px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 900
            }}>{counts.cooking}</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStage('READY')}
            style={{
              height: '32px',
              padding: '0 14px',
              borderRadius: '7px',
              border: 'none',
              background: filterStage === 'READY' ? '#10b981' : 'transparent',
              color: filterStage === 'READY' ? '#000' : '#999',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            ✅ Ready
            <span style={{
              background: filterStage === 'READY' ? 'rgba(0,0,0,0.3)' : '#222230',
              color: filterStage === 'READY' ? '#000' : '#aaa',
              padding: '1px 6px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 900
            }}>{counts.ready}</span>
          </button>

          <button
            type="button"
            onClick={() => setFilterStage('ON_THE_WAY')}
            style={{
              height: '32px',
              padding: '0 14px',
              borderRadius: '7px',
              border: 'none',
              background: filterStage === 'ON_THE_WAY' ? '#8b5cf6' : 'transparent',
              color: filterStage === 'ON_THE_WAY' ? '#fff' : '#999',
              fontWeight: 800,
              fontSize: '13px',
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap'
            }}
          >
            🚗 On Way
            <span style={{
              background: filterStage === 'ON_THE_WAY' ? 'rgba(0,0,0,0.3)' : '#222230',
              color: filterStage === 'ON_THE_WAY' ? '#fff' : '#aaa',
              padding: '1px 6px',
              borderRadius: '8px',
              fontSize: '11px',
              fontWeight: 900
            }}>{counts.onTheWay}</span>
          </button>
        </div>

        {/* Right: Kitchen Tools & Order Type (All 36px Height, Matching 8px Radius) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Fulfilment Filter Dropdown */}
          <div style={{ position: 'relative' }}>
            <select
              value={filterFulfilment}
              onChange={(e) => setFilterFulfilment(e.target.value)}
              style={{
                height: '36px',
                background: '#181824',
                color: '#f0d080',
                border: '1px solid rgba(201, 168, 76, 0.35)',
                borderRadius: '8px',
                padding: '0 30px 0 14px',
                fontSize: '13px',
                fontWeight: 700,
                cursor: 'pointer',
                outline: 'none',
                appearance: 'none',
                whiteSpace: 'nowrap',
                boxSizing: 'border-box'
              }}
            >
              <option value="ALL">📦 All Types (Pickup & Delivery)</option>
              <option value="PICKUP">🛍️ Pickup Orders Only</option>
              <option value="DELIVERY">🚗 Delivery Orders Only</option>
            </select>
            <span style={{
              position: 'absolute',
              right: '10px',
              top: '50%',
              transform: 'translateY(-50%)',
              pointerEvents: 'none',
              fontSize: '10px',
              color: '#f0d080'
            }}>
              ▼
            </span>
          </div>

          {/* All-Day Item Prep Summary Pill */}
          <button
            type="button"
            onClick={() => setShowPrepSummary(!showPrepSummary)}
            title="Consolidated count of all items being cooked right now across all tickets"
            style={{
              height: '36px',
              padding: '0 14px',
              borderRadius: '8px',
              background: showPrepSummary ? 'linear-gradient(135deg, #f0d080 0%, #c9a84c 100%)' : '#181824',
              color: showPrepSummary ? '#000' : '#e5e5e5',
              border: `1px solid ${showPrepSummary ? '#f0d080' : 'rgba(255,255,255,0.12)'}`,
              fontSize: '13px',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxSizing: 'border-box'
            }}
          >
            <Utensils size={15} color={showPrepSummary ? '#000' : '#f0d080'} />
            <span>All-Day Count</span>
            {allDayPrepSummary.length > 0 && (
              <span style={{
                background: showPrepSummary ? 'rgba(0,0,0,0.3)' : '#f0d080',
                color: showPrepSummary ? '#fff' : '#000',
                padding: '1px 7px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 900
              }}>
                {allDayPrepSummary.length}
              </span>
            )}
          </button>

          {/* Recalls History Pill */}
          <button
            type="button"
            onClick={() => {
              setShowRecallDrawer(!showRecallDrawer);
              if (!showRecallDrawer) fetchRecalls();
            }}
            title="View recently completed/bumped orders to restore them"
            style={{
              height: '36px',
              padding: '0 14px',
              borderRadius: '8px',
              background: showRecallDrawer ? '#3b82f6' : '#181824',
              color: showRecallDrawer ? '#fff' : '#e5e5e5',
              border: `1px solid ${showRecallDrawer ? '#3b82f6' : 'rgba(255,255,255,0.12)'}`,
              fontSize: '13px',
              fontWeight: 800,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxSizing: 'border-box'
            }}
          >
            <History size={15} color={showRecallDrawer ? '#fff' : '#60a5fa'} />
            <span>Recalls</span>
          </button>
        </div>
      </div>

      {/* ── ALL-DAY PREP SUMMARY DRAWER ────────────────────────────────────── */}
      {showPrepSummary && (
        <div style={{
          background: 'linear-gradient(180deg, rgba(24, 20, 14, 0.98) 0%, rgba(16, 13, 8, 0.98) 100%)',
          borderBottom: '2px solid rgba(245, 158, 11, 0.45)',
          padding: '14px 24px',
          boxShadow: '0 12px 36px rgba(0,0,0,0.7), 0 0 20px rgba(245, 158, 11, 0.1)',
          flexShrink: 0
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '12px',
            borderBottom: '1px solid rgba(245, 158, 11, 0.2)',
            paddingBottom: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(245, 158, 11, 0.15)',
                border: '1px solid rgba(245, 158, 11, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Flame size={17} color="#f59e0b" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#fbbf24' }}>
                    Batch Prep Aggregator (Consolidated Dishes Needed Now)
                  </h3>
                  <span style={{
                    background: 'rgba(245, 158, 11, 0.2)',
                    color: '#fbbf24',
                    border: '1px solid rgba(245, 158, 11, 0.35)',
                    padding: '1px 8px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: 800
                  }}>
                    {allDayPrepSummary.length} Distinct Dishes
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: '#a8a29e', fontWeight: 500 }}>
                  Batch kitchen quantities aggregated across all active cooking orders.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPrepSummary(false)}
              title="Close aggregator"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              <X size={16} />
            </button>
          </div>

          {allDayPrepSummary.length === 0 ? (
            <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>No items pending preparation right now.</p>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
              gap: '10px',
              maxHeight: '180px',
              overflowY: 'auto',
              paddingRight: '4px'
            }}>
              {allDayPrepSummary.map((item, idx) => (
                <div
                  key={idx}
                  style={{
                    background: 'linear-gradient(145deg, #221a10 0%, #17120a 100%)',
                    border: '1px solid rgba(245, 158, 11, 0.3)',
                    borderRadius: '10px',
                    padding: '10px 14px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    gap: '10px',
                    boxShadow: '0 3px 10px rgba(0,0,0,0.3)'
                  }}
                >
                  <span style={{ fontWeight: 700, fontSize: '13px', color: '#f5f5f4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {item.name}
                  </span>
                  <span style={{
                    background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                    color: '#000',
                    fontWeight: 900,
                    fontSize: '15px',
                    padding: '2px 10px',
                    borderRadius: '6px',
                    minWidth: '24px',
                    textAlign: 'center',
                    flexShrink: 0
                  }}>
                    {item.qty}×
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* ── RECALLS DRAWER ─────────────────────────────────────────────────── */}
      {showRecallDrawer && (
        <div style={{
          background: 'linear-gradient(180deg, rgba(16, 22, 38, 0.98) 0%, rgba(10, 14, 26, 0.98) 100%)',
          borderBottom: '2px solid rgba(59, 130, 246, 0.45)',
          padding: '14px 24px',
          boxShadow: '0 12px 36px rgba(0,0,0,0.7), 0 0 20px rgba(59, 130, 246, 0.12)',
          flexShrink: 0
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            marginBottom: '14px',
            borderBottom: '1px solid rgba(59, 130, 246, 0.2)',
            paddingBottom: '10px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '8px',
                background: 'rgba(59, 130, 246, 0.15)',
                border: '1px solid rgba(59, 130, 246, 0.4)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <History size={17} color="#60a5fa" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#93c5fd' }}>
                    Recently Completed Tickets (Recall / Undo)
                  </h3>
                  <span style={{
                    background: 'rgba(59, 130, 246, 0.2)',
                    color: '#60a5fa',
                    border: '1px solid rgba(59, 130, 246, 0.35)',
                    padding: '1px 8px',
                    borderRadius: '10px',
                    fontSize: '11px',
                    fontWeight: 800
                  }}>
                    {completedOrders.length} Available
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
                  Accidentally bumped a ticket? Tap &quot;Restore&quot; to push it right back to the active prep queue.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowRecallDrawer(false)}
              title="Close recall tray"
              style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                background: 'rgba(255,255,255,0.06)',
                border: '1px solid rgba(255,255,255,0.12)',
                color: '#94a3b8',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s'
              }}
            >
              <X size={16} />
            </button>
          </div>

          {completedOrders.length === 0 ? (
            <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>No completed orders to recall.</p>
          ) : (
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
              gap: '12px',
              maxHeight: '290px',
              overflowY: 'auto',
              paddingRight: '4px'
            }}>
              {completedOrders.map((order) => {
                const isDelivery = String(order.fulfilment).toUpperCase() === 'DELIVERY';
                const isProcessing = processingId === order.id;

                return (
                  <div
                    key={order.id}
                    style={{
                      background: 'linear-gradient(145deg, #161a2b 0%, #101423 100%)',
                      border: '1px solid rgba(59, 130, 246, 0.3)',
                      borderRadius: '12px',
                      padding: '12px 14px',
                      display: 'flex',
                      flexDirection: 'column',
                      justifyContent: 'space-between',
                      gap: '10px',
                      boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {/* Card Header: Order # + Fulfilment Badge */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontSize: '18px',
                          fontWeight: 900,
                          color: '#fff',
                          fontFamily: 'monospace',
                          letterSpacing: '-0.5px'
                        }}>
                          #{order.orderNumber}
                        </span>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          fontSize: '10px',
                          fontWeight: 800,
                          padding: '2px 7px',
                          borderRadius: '6px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.4px',
                          background: isDelivery ? 'rgba(99, 102, 241, 0.18)' : 'rgba(16, 185, 129, 0.18)',
                          color: isDelivery ? '#a5b4fc' : '#6ee7b7',
                          border: `1px solid ${isDelivery ? 'rgba(99, 102, 241, 0.35)' : 'rgba(16, 185, 129, 0.35)'}`
                        }}>
                          {isDelivery ? <Truck size={10} /> : <Utensils size={10} />}
                          {order.fulfilment || 'PICKUP'}
                        </span>
                      </div>

                      <span style={{
                        fontSize: '11px',
                        fontWeight: 700,
                        color: '#64748b'
                      }}>
                        Done
                      </span>
                    </div>

                    {/* Customer Name & Items summary */}
                    <div>
                      <div style={{
                        fontSize: '13px',
                        fontWeight: 700,
                        color: '#f1f5f9',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {order.customer?.name || 'Guest'}
                      </div>
                      {order.itemsSummary ? (
                        <div style={{
                          fontSize: '11px',
                          color: '#94a3b8',
                          marginTop: '2px',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          whiteSpace: 'nowrap'
                        }}>
                          {order.itemsSummary}
                        </div>
                      ) : (
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                          Completed ticket
                        </div>
                      )}
                    </div>

                    {/* Restore Button */}
                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={async () => {
                        await updateStatus(order, 'READY');
                        setCompletedOrders((prev) => prev.filter((o) => o.id !== order.id));
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '6px',
                        background: isProcessing
                          ? 'rgba(59, 130, 246, 0.2)'
                          : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)',
                        color: '#ffffff',
                        border: '1px solid rgba(96, 165, 250, 0.4)',
                        borderRadius: '8px',
                        padding: '7px 12px',
                        fontSize: '12px',
                        fontWeight: 800,
                        cursor: isProcessing ? 'not-allowed' : 'pointer',
                        boxShadow: isProcessing ? 'none' : '0 2px 8px rgba(37, 99, 235, 0.4)',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <Undo2 size={13} />
                      <span>{isProcessing ? 'Restoring...' : 'Restore to Screen'}</span>
                    </button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ── MAIN TICKET DISPLAY GRID ───────────────────────────────────────── */}
      <main style={{
        flex: 1,
        padding: '20px 24px',
        overflowY: 'auto',
        boxSizing: 'border-box'
      }}>
        {loading && orders.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '60vh',
            color: '#888'
          }}>
            <RefreshCw size={36} style={{ animation: 'spin 1s linear infinite', color: '#f0d080', marginBottom: '16px' }} />
            <p style={{ fontSize: '16px', fontWeight: 600 }}>Connecting to live kitchen order stream...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            height: '65vh',
            textAlign: 'center'
          }}>
            <div style={{
              width: '88px',
              height: '88px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, rgba(201, 168, 76, 0.2) 0%, rgba(201, 168, 76, 0.05) 100%)',
              border: '1px solid rgba(201, 168, 76, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '18px',
              boxShadow: '0 0 30px rgba(201, 168, 76, 0.15)'
            }}>
              <ChefHat size={44} color="#f0d080" />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 900, margin: '0 0 8px', color: '#fff', letterSpacing: '0.5px' }}>
              Kitchen is all caught up!
            </h2>
            <p style={{ color: '#888', fontSize: '15px', maxWidth: '420px', margin: 0, lineHeight: 1.5 }}>
              No active orders in this queue. When a new customer places an order, it will instantly chime and appear right here.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))',
            gap: '20px',
            alignItems: 'start'
          }}>
            {filteredOrders.map((order) => {
              const elapsed = formatElapsed(order.createdAt);
              const urgency = getUrgency(order.createdAt, order.isScheduled, order.scheduledAt);
              const isProcessing = processingId === order.id;

              const isWaiting = ['RECEIVED', 'PAID'].includes(order.status);
              const isCooking = order.status === 'PREPARING';
              const isReady = order.status === 'READY';
              const isOnTheWay = order.status === 'ON_THE_WAY';
              const isDelivery = order.fulfilment === 'DELIVERY';

              // Visual styling hierarchy
              let cardBorder = '1px solid rgba(255,255,255,0.1)';
              let cardShadow = '0 10px 30px rgba(0,0,0,0.5)';
              let headerBg = '#161622';
              let timerBg = '#1c1c28';
              let timerColor = '#ddd';

              if (urgency === 'urgent') {
                cardBorder = '2px solid #ef4444';
                cardShadow = '0 0 30px rgba(239, 68, 68, 0.35)';
                headerBg = 'rgba(239, 68, 68, 0.2)';
                timerBg = 'rgba(239, 68, 68, 0.3)';
                timerColor = '#fca5a5';
              } else if (isOnTheWay) {
                cardBorder = '2px solid #8b5cf6';
                cardShadow = '0 0 25px rgba(139, 92, 246, 0.3)';
                headerBg = 'rgba(139, 92, 246, 0.18)';
                timerBg = 'rgba(139, 92, 246, 0.25)';
                timerColor = '#c4b5fd';
              } else if (isCooking) {
                cardBorder = '2px solid #3b82f6';
                cardShadow = '0 0 25px rgba(59, 130, 246, 0.25)';
                headerBg = 'rgba(59, 130, 246, 0.18)';
                timerBg = 'rgba(59, 130, 246, 0.25)';
                timerColor = '#93c5fd';
              } else if (isReady) {
                cardBorder = '2px solid #10b981';
                cardShadow = '0 0 25px rgba(16, 185, 129, 0.25)';
                headerBg = 'rgba(16, 185, 129, 0.18)';
                timerBg = 'rgba(16, 185, 129, 0.25)';
                timerColor = '#6ee7b7';
              } else if (isWaiting) {
                cardBorder = '2px solid #f59e0b';
                cardShadow = '0 0 25px rgba(245, 158, 11, 0.25)';
                headerBg = 'rgba(245, 158, 11, 0.18)';
                timerBg = 'rgba(245, 158, 11, 0.25)';
                timerColor = '#fde68a';
              }

              return (
                <div
                  key={order.id}
                  style={{
                    background: '#12121a',
                    borderRadius: '16px',
                    border: cardBorder,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: cardShadow,
                    transition: 'all 0.2s ease'
                  }}
                >
                  {/* ── CARD STATUS HEADER ── */}
                  <div style={{
                    background: headerBg,
                    padding: '12px 16px',
                    borderBottom: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px'
                  }}>
                    {/* Top Row: Order # + Fulfilment Badge (Left) & Print Button + Timer Badge (Right) */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px'
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{
                          fontSize: '26px',
                          fontWeight: 900,
                          color: '#f0d080',
                          letterSpacing: '-0.5px',
                          lineHeight: 1
                        }}>
                          #{order.orderNumber}
                        </span>

                        <span style={{
                          fontSize: '11px',
                          fontWeight: 800,
                          textTransform: 'uppercase',
                          padding: '3px 8px',
                          borderRadius: '6px',
                          background: order.fulfilment === 'DELIVERY' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                          color: order.fulfilment === 'DELIVERY' ? '#60a5fa' : '#34d399',
                          border: `1px solid ${order.fulfilment === 'DELIVERY' ? 'rgba(59, 130, 246, 0.4)' : 'rgba(16, 185, 129, 0.4)'}`
                        }}>
                          {order.fulfilment === 'DELIVERY' ? '🚗 Delivery' : '🛍️ Pickup'}
                        </span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setPrintingOrder(order)}
                          title="Print 80mm Kitchen Slip / KOT"
                          style={{
                            background: 'rgba(255,255,255,0.08)',
                            border: '1px solid rgba(255,255,255,0.18)',
                            color: '#f1f5f9',
                            height: '30px',
                            padding: '0 9px',
                            borderRadius: '7px',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '5px',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: 700,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <Printer size={13} />
                          <span>Print</span>
                        </button>

                        <div style={{
                          background: timerBg,
                          color: timerColor,
                          height: '30px',
                          padding: '0 9px',
                          borderRadius: '7px',
                          fontSize: '14px',
                          fontWeight: 900,
                          fontFamily: 'monospace',
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '5px'
                        }}>
                          <Clock size={13} />
                          <span>{elapsed}</span>
                        </div>
                      </div>
                    </div>

                    {/* Bottom Row: Customer Name & Phone (Left) & Stage Status Tag (Right) */}
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      gap: '10px'
                    }}>
                      <div style={{
                        fontSize: '12px',
                        color: '#94a3b8',
                        fontWeight: 600,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                      }}>
                        <span>{order.customer?.name || 'Walk-in Guest'}</span>
                        {order.customer?.phone && (
                          <span style={{ marginLeft: '6px', color: '#cbd5e1' }}>• {order.customer.phone}</span>
                        )}
                      </div>

                      <span style={{
                        fontSize: '10px',
                        fontWeight: 900,
                        textTransform: 'uppercase',
                        letterSpacing: '0.6px',
                        padding: '2px 7px',
                        borderRadius: '5px',
                        flexShrink: 0,
                        background: isOnTheWay ? 'rgba(139, 92, 246, 0.2)' : isReady ? 'rgba(16, 185, 129, 0.15)' : isCooking ? 'rgba(59, 130, 246, 0.15)' : 'rgba(245, 158, 11, 0.15)',
                        color: isOnTheWay ? '#c4b5fd' : isReady ? '#34d399' : isCooking ? '#60a5fa' : '#fde68a',
                        border: `1px solid ${isOnTheWay ? 'rgba(139, 92, 246, 0.4)' : isReady ? 'rgba(16, 185, 129, 0.3)' : isCooking ? 'rgba(59, 130, 246, 0.3)' : 'rgba(245, 158, 11, 0.3)'}`
                      }}>
                        {isOnTheWay ? 'OUT FOR DELIVERY' : isReady ? 'READY' : isCooking ? 'IN PREP' : 'WAITING'}
                      </span>
                    </div>
                  </div>

                  {/* ── CUSTOMER DELIVERY ADDRESS BANNER ── */}
                  {isDelivery && order.customer?.address && (
                    <div style={{
                      background: 'rgba(139, 92, 246, 0.1)',
                      borderLeft: '4px solid #8b5cf6',
                      padding: '8px 16px',
                      fontSize: '12px',
                      color: '#f1f5f9',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}>
                      <Truck size={15} color="#a78bfa" style={{ flexShrink: 0 }} />
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <strong style={{ color: '#a78bfa', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px', marginRight: '6px' }}>Address:</strong>
                        <span>{order.customer.address}{order.customer.postcode ? `, ${order.customer.postcode}` : ''}</span>
                      </div>
                    </div>
                  )}

                  {/* ── CUSTOMER SPECIAL COOKING NOTE ── */}
                  {order.customer?.note && (
                    <div style={{
                      background: 'rgba(245, 158, 11, 0.1)',
                      borderLeft: '4px solid #f59e0b',
                      padding: '10px 16px',
                      fontSize: '13px',
                      color: '#fef3c7',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px'
                    }}>
                      <Flame size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div>
                        <strong style={{ color: '#f59e0b', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>Chef Instruction:</strong>
                        <div style={{ fontStyle: 'italic', marginTop: '2px' }}>"{order.customer.note}"</div>
                      </div>
                    </div>
                  )}

                  {/* ── ITEM CHECKLIST (LINE ITEMS) ── */}
                  <div style={{
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    flex: 1,
                    minHeight: '140px'
                  }}>
                    {(order.lines || []).map((line, idx) => {
                      const isChecked = Boolean(checkedItems[`${order.id}-${idx}`]);

                      return (
                        <div
                          key={idx}
                          onClick={() => toggleItemCheck(order.id, idx)}
                          style={{
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            cursor: 'pointer',
                            padding: '8px 10px',
                            borderRadius: '8px',
                            background: isChecked ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)',
                            opacity: isChecked ? 0.45 : 1,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {/* Checkbox */}
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            border: `2px solid ${isChecked ? '#10b981' : '#f0d080'}`,
                            background: isChecked ? '#10b981' : 'transparent',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: '2px'
                          }}>
                            {isChecked && <Check size={16} color="#000" strokeWidth={3} />}
                          </div>

                          {/* Item Details */}
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                              <span style={{
                                background: 'linear-gradient(135deg, #f0d080 0%, #c9a84c 100%)',
                                color: '#000',
                                fontWeight: 900,
                                fontSize: '14px',
                                padding: '1px 6px',
                                borderRadius: '4px'
                              }}>
                                {line.qty}x
                              </span>
                              <span style={{
                                fontSize: '16px',
                                fontWeight: 800,
                                color: isChecked ? '#aaa' : '#fff',
                                textDecoration: isChecked ? 'line-through' : 'none'
                              }}>
                                {line.name}
                              </span>
                            </div>

                            {/* Modifiers / Options */}
                            {line.options && (
                              <div style={{
                                fontSize: '13px',
                                color: '#f0d080',
                                marginTop: '4px',
                                paddingLeft: '4px'
                              }}>
                                • {line.options}
                              </div>
                            )}

                            {/* Item specific note */}
                            {line.note && (
                              <div style={{
                                fontSize: '12px',
                                color: '#f59e0b',
                                fontStyle: 'italic',
                                marginTop: '2px',
                                paddingLeft: '4px'
                              }}>
                                Note: {line.note}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* ── CARD ACTION WORKFLOW BUTTONS ── */}
                  <div style={{
                    padding: '14px 18px',
                    background: '#0d0d14',
                    borderTop: '1px solid rgba(255,255,255,0.08)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '10px'
                  }}>
                    {/* Undo Step Back Button */}
                    {isCooking && (
                      <button
                        type="button"
                        onClick={() => updateStatus(order, 'RECEIVED')}
                        disabled={isProcessing}
                        title="Revert back to Waiting"
                        style={{
                          width: '44px',
                          height: '46px',
                          borderRadius: '10px',
                          background: '#1a1a24',
                          border: '1px solid #333',
                          color: '#aaa',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <Undo2 size={18} />
                      </button>
                    )}

                    {/* Undo Step Back Button */}
                    {isCooking && (
                      <button
                        type="button"
                        onClick={() => updateStatus(order, 'RECEIVED')}
                        disabled={isProcessing}
                        title="Revert back to Waiting"
                        style={{
                          width: '44px',
                          height: '46px',
                          borderRadius: '10px',
                          background: '#1a1a24',
                          border: '1px solid #333',
                          color: '#aaa',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <Undo2 size={18} />
                      </button>
                    )}

                    {isReady && (
                      <button
                        type="button"
                        onClick={() => updateStatus(order, 'PREPARING')}
                        disabled={isProcessing}
                        title="Revert back to Cooking"
                        style={{
                          width: '44px',
                          height: '46px',
                          borderRadius: '10px',
                          background: '#1a1a24',
                          border: '1px solid #333',
                          color: '#aaa',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <Undo2 size={18} />
                      </button>
                    )}

                    {isOnTheWay && (
                      <button
                        type="button"
                        onClick={() => updateStatus(order, 'READY')}
                        disabled={isProcessing}
                        title="Revert back to Ready (Kitchen)"
                        style={{
                          width: '44px',
                          height: '46px',
                          borderRadius: '10px',
                          background: '#1a1a24',
                          border: '1px solid #333',
                          color: '#aaa',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          cursor: 'pointer'
                        }}
                      >
                        <Undo2 size={18} />
                      </button>
                    )}

                    {/* Primary Big Action Button */}
                    {isWaiting && (
                      <button
                        type="button"
                        onClick={() => updateStatus(order, 'PREPARING')}
                        disabled={isProcessing}
                        style={{
                          flex: 1,
                          height: '48px',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          border: 'none',
                          color: '#000',
                          fontSize: '15px',
                          fontWeight: 900,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          boxShadow: '0 4px 16px rgba(245, 158, 11, 0.4)'
                        }}
                      >
                        <Flame size={18} />
                        <span>START COOKING</span>
                      </button>
                    )}

                    {isCooking && (
                      <button
                        type="button"
                        onClick={() => updateStatus(order, 'READY')}
                        disabled={isProcessing}
                        style={{
                          flex: 1,
                          height: '48px',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          border: 'none',
                          color: '#fff',
                          fontSize: '15px',
                          fontWeight: 900,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)'
                        }}
                      >
                        <CheckCircle2 size={20} />
                        <span>MARK READY (PACKED)</span>
                      </button>
                    )}

                    {isReady && isDelivery && (
                      <button
                        type="button"
                        onClick={() => updateStatus(order, 'ON_THE_WAY')}
                        disabled={isProcessing}
                        style={{
                          flex: 1,
                          height: '48px',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                          border: 'none',
                          color: '#fff',
                          fontSize: '14px',
                          fontWeight: 900,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          boxShadow: '0 4px 16px rgba(139, 92, 246, 0.4)'
                        }}
                      >
                        <Truck size={20} />
                        <span>OUT FOR DELIVERY (HANDOVER) 🚗</span>
                      </button>
                    )}

                    {isReady && !isDelivery && (
                      <button
                        type="button"
                        onClick={() => updateStatus(order, 'COMPLETED')}
                        disabled={isProcessing}
                        style={{
                          flex: 1,
                          height: '48px',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                          border: 'none',
                          color: '#fff',
                          fontSize: '15px',
                          fontWeight: 900,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          boxShadow: '0 4px 16px rgba(59, 130, 246, 0.4)'
                        }}
                      >
                        <PackageCheck size={20} />
                        <span>PICKED UP / BUMP (DONE)</span>
                      </button>
                    )}

                    {isOnTheWay && (
                      <button
                        type="button"
                        onClick={() => updateStatus(order, 'DELIVERED')}
                        disabled={isProcessing}
                        style={{
                          flex: 1,
                          height: '48px',
                          borderRadius: '10px',
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          border: 'none',
                          color: '#fff',
                          fontSize: '14px',
                          fontWeight: 900,
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          cursor: 'pointer',
                          boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)'
                        }}
                      >
                        <CheckCircle2 size={20} />
                        <span>MARK DELIVERED (COMPLETE)</span>
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </main>

      {/* ── 80MM THERMAL RECEIPT SLIP PRINT CONTAINER ── */}
      {printingOrder && (
        <div id="thermal-receipt-container">
          <div style={{ textAlign: 'center', marginBottom: '8px' }}>
            <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900', textTransform: 'uppercase' }}>PREVA KITCHEN</h2>
            <p style={{ margin: '2px 0', fontSize: '11px' }}>13090 Inkster Rd, Redford MI</p>
            <p style={{ margin: '2px 0', fontSize: '11px' }}>Tel: (313) 541-7000 • prevakitchen.com</p>
            <div style={{ borderBottom: '2px dashed #000', margin: '8px 0' }} />
          </div>

          <div style={{ marginBottom: '8px', fontSize: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '900' }}>
              <span>ORDER #{printingOrder.orderNumber}</span>
              <span>{printingOrder.fulfilment || 'PICKUP'}</span>
            </div>
            <div style={{ fontSize: '11px', marginTop: '2px' }}>
              Time: {new Date(printingOrder.createdAt).toLocaleTimeString()} · {new Date(printingOrder.createdAt).toLocaleDateString()}
            </div>
            {printingOrder.isScheduled && (
              <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '2px' }}>
                SCHEDULED FOR: {printingOrder.scheduledAt}
              </div>
            )}
            <div style={{ borderBottom: '1px solid #000', margin: '6px 0' }} />
          </div>

          <div style={{ marginBottom: '8px', fontSize: '12px' }}>
            <div><strong>Customer:</strong> {printingOrder.customer?.name || 'Walk-in Guest'}</div>
            <div><strong>Phone:</strong> {printingOrder.customer?.phone || 'N/A'}</div>
            {printingOrder.fulfilment === 'DELIVERY' && (
              <div style={{ marginTop: '2px' }}>
                <strong>Delivery To:</strong> {printingOrder.customer?.address || ''} {printingOrder.customer?.postcode || ''}
              </div>
            )}
            <div style={{ borderBottom: '2px dashed #000', margin: '8px 0' }} />
          </div>

          {/* ITEMS CHECKLIST */}
          <div style={{ marginBottom: '8px' }}>
            <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>ITEMS ({printingOrder.lines?.length || 0}):</div>
            {(printingOrder.lines || []).map((line, lIdx) => (
              <div key={lIdx} style={{ marginBottom: '6px', fontSize: '12px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold' }}>
                  <span>[ ] {line.qty}x {line.name}</span>
                </div>
                {line.options && <div style={{ fontSize: '11px', paddingLeft: '16px' }}>• {line.options}</div>}
                {line.note && <div style={{ fontSize: '11px', paddingLeft: '16px', fontStyle: 'italic' }}>Note: {line.note}</div>}
              </div>
            ))}
            <div style={{ borderBottom: '1px solid #000', margin: '8px 0' }} />
          </div>

          {/* KITCHEN NOTE */}
          {printingOrder.customer?.note && (
            <div style={{ marginBottom: '8px', fontSize: '11px', background: '#eee', padding: '4px' }}>
              <strong>KITCHEN NOTE:</strong> {printingOrder.customer.note}
              <div style={{ borderBottom: '1px solid #000', margin: '6px 0' }} />
            </div>
          )}

          {/* FOOTER */}
          <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '11px' }}>
            <div style={{ fontWeight: 'bold' }}>*** KITCHEN PACKING SLIP ***</div>
            <div style={{ marginTop: '4px' }}>Thank you for dining with Preva Kitchen!</div>
          </div>
        </div>
      )}

      {/* ── PRINT MEDIA STYLESHEET ── */}
      <style jsx global>{`
        @media screen {
          #thermal-receipt-container {
            display: none !important;
          }
        }
        @media print {
          body * {
            visibility: hidden !important;
          }
          #thermal-receipt-container,
          #thermal-receipt-container * {
            visibility: visible !important;
          }
          #thermal-receipt-container {
            position: fixed !important;
            left: 0 !important;
            top: 0 !important;
            width: 78mm !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 4mm 3mm !important;
            background: #ffffff !important;
            color: #000000 !important;
            font-family: 'Courier New', Courier, monospace !important;
            font-size: 12px !important;
            line-height: 1.35 !important;
            display: block !important;
            z-index: 9999999 !important;
          }
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
