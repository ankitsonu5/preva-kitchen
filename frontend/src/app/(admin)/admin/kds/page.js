'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import Link from 'next/link';
import {
  AlertTriangle,
  ArrowLeft,
  Bell,
  BellOff,
  Check,
  CheckCircle2,
  ChefHat,
  Clock,
  ExternalLink,
  Flame,
  History,
  Maximize2,
  Minimize2,
  PackageCheck,
  Printer,
  RefreshCw,
  Search,
  Sparkles,
  Truck,
  Undo2,
  Utensils,
  Volume2,
  X
} from 'lucide-react';
import { api, getUser } from '@/lib/admin-api';

/* ── Web Audio Synth Alert ──────────────────────────────────────────────── */

let audioCtx = null;

function playKitchenChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;

    // First tone (D5)
    const osc1 = audioCtx.createOscillator();
    const gain1 = audioCtx.createGain();
    osc1.type = 'triangle';
    osc1.frequency.setValueAtTime(587.33, now);
    gain1.gain.setValueAtTime(0.28, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
    osc1.connect(gain1);
    gain1.connect(audioCtx.destination);
    osc1.start(now);
    osc1.stop(now + 0.22);

    // Second tone (A5)
    const osc2 = audioCtx.createOscillator();
    const gain2 = audioCtx.createGain();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(880.0, now + 0.15);
    gain2.gain.setValueAtTime(0.35, now + 0.15);
    gain2.gain.exponentialRampToValueAtTime(0.001, now + 0.55);
    osc2.connect(gain2);
    gain2.connect(audioCtx.destination);
    osc2.start(now + 0.15);
    osc2.stop(now + 0.55);
  } catch (e) {
    console.warn('[KDS Audio] Chime error:', e);
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
    if (timeUntil < 0) return 'urgent'; // past scheduled time!
    if (timeUntil < 20 * 60 * 1000) return 'warning';
    return 'scheduled';
  }
  const minutes = (Date.now() - new Date(createdAt).getTime()) / (60 * 1000);
  if (minutes >= 25) return 'urgent';
  if (minutes >= 14) return 'warning';
  return 'normal';
}

/* ── Main KDS Page Component ────────────────────────────────────────────── */

export default function KitchenDisplayPage() {
  const [orders, setOrders] = useState([]);
  const [completedOrders, setCompletedOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(new Date());
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [filterStage, setFilterStage] = useState('ALL'); // ALL, RECEIVED, PREPARING, READY
  const [filterFulfilment, setFilterFulfilment] = useState('ALL'); // ALL, PICKUP, DELIVERY
  const [showPrepSummary, setShowPrepSummary] = useState(false);
  const [showRecallDrawer, setShowRecallDrawer] = useState(false);
  const [checkedItems, setCheckedItems] = useState({}); // { `${orderId}-${itemIdx}`: true }
  const [processingId, setProcessingId] = useState(null);
  const [errorNotice, setErrorNotice] = useState('');
  const [printingOrder, setPrintingOrder] = useState(null);

  // Trigger print when printingOrder is set
  useEffect(() => {
    if (printingOrder) {
      const timer = setTimeout(() => {
        window.print();
      }, 180);
      return () => clearTimeout(timer);
    }
  }, [printingOrder]);

  const previousOrderIdsRef = useRef(new Set());
  const isInitialLoadRef = useRef(true);

  // Sound preference persistence
  useEffect(() => {
    const savedSound = localStorage.getItem('preva_kds_sound');
    if (savedSound !== null) setSoundEnabled(savedSound === 'true');
  }, []);

  const toggleSound = () => {
    const next = !soundEnabled;
    setSoundEnabled(next);
    localStorage.setItem('preva_kds_sound', String(next));
    if (next) playKitchenChime();
  };

  // Fullscreen toggle
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
    document.addEventListener('fullscreenchange', handleFsChange);
    return () => document.removeEventListener('fullscreenchange', handleFsChange);
  }, []);

  // Ticking clock & live elapsed timers (updates every 1 second)
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Fetch active orders from backend
  const fetchOrders = useCallback(async ({ silent = false } = {}) => {
    if (silent) setRefreshing(true);
    else setLoading(true);

    try {
      // Fetch open KDS orders in FIFO order (oldest first)
      let res = await api('/admin/orders?status=KDS&sort=fifo&limit=150');
      if (!res.ok) {
        res = await fetch('/api/shop/kitchen-tickets', { cache: 'no-store' });
      }
      if (!res.ok) throw new Error('Could not fetch active orders');
      const data = await res.json();
      const activeRows = Array.isArray(data) ? data : [];

      // Check if new orders arrived
      const currentIds = new Set(activeRows.map(o => o.id));
      if (!isInitialLoadRef.current && soundEnabled) {
        let hasNewOrder = false;
        for (const id of currentIds) {
          if (!previousOrderIdsRef.current.has(id)) {
            hasNewOrder = true;
            break;
          }
        }
        if (hasNewOrder) {
          playKitchenChime();
        }
      }

      previousOrderIdsRef.current = currentIds;
      isInitialLoadRef.current = false;

      setOrders(activeRows);
      setLastUpdated(new Date());
      setErrorNotice('');
    } catch (err) {
      console.error('[KDS] fetch error:', err.message);
      setErrorNotice('Connection problem. Reconnecting...');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [soundEnabled]);

  // Fetch recently completed orders for the Recall drawer
  const fetchRecalls = useCallback(async () => {
    try {
      let res = await api('/admin/orders?status=COMPLETED&limit=20');
      if (!res.ok) {
        res = await fetch('/api/shop/kitchen-recalls', { cache: 'no-store' });
      }
      if (res.ok) {
        const data = await res.json();
        setCompletedOrders(Array.isArray(data) ? data : []);
      }
    } catch (e) {
      console.warn('[KDS Recalls] error:', e);
    }
  }, []);

  // Auto-polling interval: every 3.5 seconds
  useEffect(() => {
    fetchOrders();
    const interval = setInterval(() => fetchOrders({ silent: true }), 3500);
    return () => clearInterval(interval);
  }, [fetchOrders]);

  // Advance or bump order status
  const updateStatus = async (order, targetStatus) => {
    setProcessingId(order.id);
    setErrorNotice('');
    try {
      let res = await api(`/admin/orders/${order.id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ status: targetStatus })
      });
      if (!res.ok) {
        res = await fetch(`/api/shop/kitchen-tickets/${order.id}/status`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: targetStatus })
        });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data?.message || 'Failed to update order');

      // Optimistic update
      if (['COMPLETED', 'DELIVERED', 'CANCELLED'].includes(targetStatus)) {
        setOrders(prev => prev.filter(o => o.id !== order.id));
      } else {
        setOrders(prev => prev.map(o => (o.id === order.id ? { ...o, status: targetStatus } : o)));
      }

      // Re-fetch in background
      fetchOrders({ silent: true });
    } catch (err) {
      setErrorNotice(err.message || 'Could not update status.');
    } finally {
      setProcessingId(null);
    }
  };

  // Toggle item strike-through
  const toggleItemCheck = (orderId, idx) => {
    const key = `${orderId}-${idx}`;
    setCheckedItems(prev => ({ ...prev, [key]: !prev[key] }));
  };

  // Filtered orders
  const filteredOrders = useMemo(() => {
    return orders.filter(order => {
      // Stage filter
      if (filterStage === 'RECEIVED' && !['RECEIVED', 'PAID'].includes(order.status)) return false;
      if (filterStage === 'PREPARING' && order.status !== 'PREPARING') return false;
      if (filterStage === 'READY' && order.status !== 'READY') return false;
      if (filterStage === 'ON_THE_WAY' && order.status !== 'ON_THE_WAY') return false;

      // Fulfilment filter
      if (filterFulfilment !== 'ALL' && order.fulfilment !== filterFulfilment) return false;

      return true;
    });
  }, [orders, filterStage, filterFulfilment]);

  // Counts by stage
  const counts = useMemo(() => {
    const waiting = orders.filter(o => ['RECEIVED', 'PAID'].includes(o.status)).length;
    const cooking = orders.filter(o => o.status === 'PREPARING').length;
    const ready = orders.filter(o => o.status === 'READY').length;
    const onTheWay = orders.filter(o => o.status === 'ON_THE_WAY').length;
    return { waiting, cooking, ready, onTheWay, total: orders.length };
  }, [orders]);

  // All-Day Aggregate Item Counts (prep summary across all active tickets)
  const allDayPrepSummary = useMemo(() => {
    const map = new Map();
    for (const order of orders) {
      if (order.status === 'READY') continue; // only items still waiting or cooking
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

  return (
    <div style={{
      background: '#0a0a0c',
      color: '#f4f0e6',
      minHeight: '100vh',
      fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
      display: 'flex',
      flexDirection: 'column',
      userSelect: 'none'
    }}>
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
        {/* Left: Back to Admin, Brand & Digital Clock */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <Link
            href="/admin/orders"
            title="Back to Orders Dashboard"
            style={{
              height: '36px',
              padding: '0 12px',
              borderRadius: '8px',
              background: '#1c1c28',
              border: '1px solid rgba(255, 255, 255, 0.12)',
              color: '#c9a96e',
              textDecoration: 'none',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              fontSize: '12px',
              fontWeight: 700,
              boxSizing: 'border-box'
            }}
          >
            <ArrowLeft size={16} />
            <span>Admin</span>
          </Link>

          <div style={{
            width: '36px',
            height: '36px',
            borderRadius: '8px',
            background: 'linear-gradient(135deg, rgba(201, 168, 76, 0.25) 0%, rgba(201, 168, 76, 0.06) 100%)',
            border: '1px solid rgba(201, 168, 76, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 0 14px rgba(201, 168, 76, 0.15)',
            flexShrink: 0
          }}>
            <ChefHat size={20} color="#f0d080" />
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '10px' }}>
            <h1 style={{
              margin: 0,
              fontSize: '18px',
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
              ADMIN KDS
            </span>
          </div>

          <div style={{ width: '1px', height: '20px', background: 'rgba(255,255,255,0.12)', margin: '0 4px' }} />

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
            <span style={{ color: '#aaa', whiteSpace: 'nowrap' }}>{refreshing ? 'Syncing...' : 'Live auto-refresh'}</span>
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
            title={soundEnabled ? 'Mute Kitchen Chime' : 'Unmute Kitchen Chime'}
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
              whiteSpace: 'nowrap',
              boxSizing: 'border-box'
            }}
          >
            {soundEnabled ? <Volume2 size={15} /> : <BellOff size={15} />}
            <span>{soundEnabled ? 'Chime ON' : 'Muted'}</span>
          </button>

          {/* Customer TV Pickup Board link */}
          <Link
            href="/display"
            target="_blank"
            title="Open Live Customer Pickup Display TV Board in new tab"
            style={{
              height: '36px',
              padding: '0 12px',
              borderRadius: '8px',
              background: '#1c1c28',
              color: '#f0d080',
              border: '1px solid rgba(255,255,255,0.12)',
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
              whiteSpace: 'nowrap',
              boxSizing: 'border-box'
            }}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            <span>{isFullscreen ? 'Window' : 'Fullscreen'}</span>
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
        {/* Left: Stage Filter Tabs (Uniform 32px Segmented Control) */}
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

        {/* Right: Operational Toolset (Uniform 36px Height & 8px Radius) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          {/* Fulfilment Filter Dropdown */}
          <select
            value={filterFulfilment}
            onChange={(e) => setFilterFulfilment(e.target.value)}
            style={{
              height: '36px',
              background: '#151520',
              color: '#eee',
              border: '1px solid rgba(255,255,255,0.12)',
              borderRadius: '8px',
              padding: '0 12px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          >
            <option value="ALL">All Types ▾</option>
            <option value="PICKUP">Pickup Only 🏃</option>
            <option value="DELIVERY">Delivery Only 🚗</option>
          </select>

          {/* All-Day Items Prep Aggregator Toggle */}
          <button
            type="button"
            onClick={() => setShowPrepSummary(!showPrepSummary)}
            title="Consolidated count of all items being cooked right now"
            style={{
              height: '36px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 12px',
              borderRadius: '8px',
              background: showPrepSummary ? 'linear-gradient(135deg, #f0d080, #c9a84c)' : '#151520',
              color: showPrepSummary ? '#000' : '#ddd',
              border: showPrepSummary ? 'none' : '1px solid rgba(255,255,255,0.12)',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxSizing: 'border-box'
            }}
          >
            <Utensils size={14} />
            <span>All-Day Count</span>
            {allDayPrepSummary.length > 0 && (
              <span style={{
                background: showPrepSummary ? 'rgba(0,0,0,0.3)' : '#c9a84c',
                color: showPrepSummary ? '#000' : '#000',
                padding: '1px 6px',
                borderRadius: '8px',
                fontSize: '11px',
                fontWeight: 900
              }}>{allDayPrepSummary.length}</span>
            )}
          </button>

          {/* Recalls / Bumps History */}
          <button
            type="button"
            onClick={() => {
              setShowRecallDrawer(!showRecallDrawer);
              if (!showRecallDrawer) fetchRecalls();
            }}
            title="View recently completed/bumped orders"
            style={{
              height: '36px',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              padding: '0 12px',
              borderRadius: '8px',
              background: showRecallDrawer ? '#3b82f6' : '#151520',
              color: showRecallDrawer ? '#fff' : '#ddd',
              border: showRecallDrawer ? 'none' : '1px solid rgba(255,255,255,0.12)',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxSizing: 'border-box'
            }}
          >
            <History size={14} />
            <span>Recalls</span>
          </button>

          {/* Manual Refresh Button */}
          <button
            type="button"
            onClick={() => fetchOrders({ silent: false })}
            title="Refresh Orders Now"
            disabled={refreshing}
            style={{
              height: '36px',
              padding: '0 12px',
              borderRadius: '8px',
              background: '#151520',
              color: '#ddd',
              border: '1px solid rgba(255,255,255,0.12)',
              fontSize: '12px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              boxSizing: 'border-box'
            }}
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            <span>Sync</span>
          </button>
        </div>
      </div>

      {/* ── ALL-DAY PREP SUMMARY DRAWER (Consolidated Item Count) ──────────── */}
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
                    All-Day Cook Summary (Items in Active Preparation)
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
                  Consolidated dishes currently being prepared across all active tickets.
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowPrepSummary(false)}
              title="Close summary"
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
            <p style={{ margin: 0, color: '#888', fontSize: '13px' }}>No items currently in preparation.</p>
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

      {/* ── RECENT ORDERS RECALL DRAWER ────────────────────────────────────── */}
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
            <p style={{ margin: 0, color: '#888', fontSize: '13px' }}>No recently completed orders found.</p>
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

      {/* ── ERROR NOTICE BANNER ────────────────────────────────────────────── */}
      {errorNotice && (
        <div style={{
          background: 'rgba(239, 68, 68, 0.15)',
          borderBottom: '1px solid #ef4444',
          color: '#fca5a5',
          padding: '8px 20px',
          fontSize: '13px',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between'
        }}>
          <span>⚠️ {errorNotice}</span>
          <button
            type="button"
            onClick={() => setErrorNotice('')}
            style={{ background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer' }}
          >
            ✕
          </button>
        </div>
      )}

      {/* ── MAIN TICKET DISPLAY GRID ───────────────────────────────────────── */}
      <main style={{
        flex: 1,
        padding: '20px',
        overflowY: 'auto'
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
            <RefreshCw size={36} style={{ animation: 'spin 1s linear infinite', color: '#c9a96e', marginBottom: '16px' }} />
            <p style={{ fontSize: '16px', fontWeight: 600 }}>Connecting to kitchen order stream...</p>
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
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'rgba(201, 169, 110, 0.1)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              marginBottom: '16px',
              border: '1px solid rgba(201, 169, 110, 0.2)'
            }}>
              <ChefHat size={40} color="#c9a96e" />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 6px', color: '#fff' }}>
              Kitchen is all caught up!
            </h2>
            <p style={{ color: '#888', fontSize: '14px', maxWidth: '400px', margin: 0 }}>
              No active orders in this view. New incoming tickets will automatically appear and ring the chime.
            </p>
          </div>
        ) : (
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
            gap: '18px',
            alignItems: 'start'
          }}>
            {filteredOrders.map((order) => {
              const elapsed = formatElapsed(order.createdAt);
              const urgency = getUrgency(order.createdAt, order.isScheduled, order.scheduledAt);
              const isProcessing = processingId === order.id;

              // Border & header color based on urgency & status
              let cardBorder = '1px solid #2c2c38';
              let timerBg = '#22222e';
              let timerColor = '#ddd';

              if (urgency === 'urgent') {
                cardBorder = '2px solid #ef4444';
                timerBg = 'rgba(239, 68, 68, 0.2)';
                timerColor = '#ef4444';
              } else if (urgency === 'warning') {
                cardBorder = '1.5px solid #f59e0b';
                timerBg = 'rgba(245, 158, 11, 0.2)';
                timerColor = '#f59e0b';
              } else if (order.status === 'ON_THE_WAY') {
                cardBorder = '1.5px solid #8b5cf6';
                timerBg = 'rgba(139, 92, 246, 0.2)';
                timerColor = '#c4b5fd';
              } else if (order.status === 'READY') {
                cardBorder = '1.5px solid #10b981';
                timerBg = 'rgba(16, 185, 129, 0.2)';
                timerColor = '#10b981';
              }

              return (
                <div
                  key={order.id}
                  style={{
                    background: '#15151c',
                    borderRadius: '14px',
                    border: cardBorder,
                    overflow: 'hidden',
                    display: 'flex',
                    flexDirection: 'column',
                    boxShadow: urgency === 'urgent'
                      ? '0 0 20px rgba(239, 68, 68, 0.25)'
                      : '0 8px 24px rgba(0, 0, 0, 0.4)',
                    transition: 'transform 0.15s ease, box-shadow 0.15s ease'
                  }}
                >
                  {/* ── CARD HEADER ── */}
                  <div style={{
                    background: '#1a1a24',
                    padding: '12px 16px',
                    borderBottom: '1px solid #262634',
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
                          border: `1px solid ${order.fulfilment === 'DELIVERY' ? '#3b82f6' : '#10b981'}`
                        }}>
                          {order.fulfilment === 'DELIVERY' ? '🚗 Delivery' : '🏃 Pickup'}
                        </span>

                        {order.status === 'ON_THE_WAY' && (
                          <span style={{
                            fontSize: '11px',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            padding: '3px 8px',
                            borderRadius: '6px',
                            background: 'rgba(139, 92, 246, 0.25)',
                            color: '#c4b5fd',
                            border: '1px solid #8b5cf6'
                          }}>
                            🚗 Out For Delivery
                          </span>
                        )}
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <button
                          type="button"
                          onClick={() => setPrintingOrder(order)}
                          title="Print 80mm Kitchen Packing Slip / KOT"
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

                    {/* Bottom Row: Customer Details (Left) & Scheduled Time (Right) */}
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

                      {order.isScheduled && order.scheduledAt && (
                        <span style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: '#f59e0b',
                          flexShrink: 0
                        }}>
                          📅 {new Date(order.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* ── CUSTOMER DELIVERY ADDRESS BANNER ── */}
                  {order.fulfilment === 'DELIVERY' && order.customer?.address && (
                    <div style={{
                      background: 'rgba(139, 92, 246, 0.12)',
                      borderBottom: '1px solid rgba(139, 92, 246, 0.25)',
                      padding: '8px 16px',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#c4b5fd',
                      fontSize: '12px'
                    }}>
                      <Truck size={14} style={{ flexShrink: 0, color: '#a78bfa' }} />
                      <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        <strong style={{ color: '#a78bfa', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px', marginRight: '6px' }}>Address:</strong>
                        <span>{order.customer.address}{order.customer.postcode ? `, ${order.customer.postcode}` : ''}</span>
                      </div>
                    </div>
                  )}

                  {/* ── ALLERGY / CUSTOMER NOTE CALLOUT ── */}
                  {order.customer?.note && (
                    <div style={{
                      background: 'rgba(245, 158, 11, 0.12)',
                      borderBottom: '1px solid rgba(245, 158, 11, 0.3)',
                      padding: '10px 16px',
                      display: 'flex',
                      alignItems: 'flex-start',
                      gap: '8px',
                      color: '#fcd34d'
                    }}>
                      <AlertTriangle size={16} style={{ flexShrink: 0, marginTop: '2px' }} />
                      <div style={{ fontSize: '13px', lineHeight: '1.4' }}>
                        <b style={{ textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>Kitchen Note: </b>
                        {order.customer.note}
                      </div>
                    </div>
                  )}

                  {/* ── LINE ITEMS LIST (Tap to strike) ── */}
                  <div style={{
                    padding: '14px 16px',
                    flex: 1,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '10px'
                  }}>
                    {(order.lines || []).map((line, idx) => {
                      const itemKey = `${order.id}-${idx}`;
                      const isChecked = Boolean(checkedItems[itemKey]);

                      return (
                        <div
                          key={idx}
                          onClick={() => toggleItemCheck(order.id, idx)}
                          style={{
                            padding: '10px 12px',
                            borderRadius: '10px',
                            background: isChecked ? '#121218' : '#1d1d27',
                            border: `1px solid ${isChecked ? '#22222c' : '#2b2b3b'}`,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                            opacity: isChecked ? 0.45 : 1,
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {/* Checkbox */}
                          <div style={{
                            width: '24px',
                            height: '24px',
                            borderRadius: '6px',
                            background: isChecked ? '#10b981' : '#262636',
                            border: `1.5px solid ${isChecked ? '#10b981' : '#444456'}`,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            flexShrink: 0,
                            marginTop: '1px'
                          }}>
                            {isChecked && <Check size={16} color="#000" strokeWidth={3} />}
                          </div>

                          {/* Item Details */}
                          <div style={{ flex: 1 }}>
                            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                              <span style={{
                                fontSize: '18px',
                                fontWeight: 900,
                                color: isChecked ? '#888' : '#f0d080',
                                minWidth: '24px'
                              }}>
                                {line.qty}×
                              </span>
                              <span style={{
                                fontSize: '16px',
                                fontWeight: 700,
                                color: isChecked ? '#888' : '#fff',
                                textDecoration: isChecked ? 'line-through' : 'none'
                              }}>
                                {line.name}
                              </span>
                            </div>

                            {/* Chosen Options / Modifiers */}
                            {line.options && (
                              <div style={{
                                fontSize: '12.5px',
                                color: isChecked ? '#666' : '#fcd34d',
                                fontWeight: 600,
                                marginTop: '4px',
                                paddingLeft: '32px'
                              }}>
                                ↳ {line.options}
                              </div>
                            )}

                            {/* Line Note */}
                            {line.note && (
                              <div style={{
                                fontSize: '12px',
                                color: '#f87171',
                                fontWeight: 600,
                                marginTop: '2px',
                                paddingLeft: '32px'
                              }}>
                                ⚠️ Note: {line.note}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* ── CARD ACTION FOOTER ── */}
                  <div style={{
                    padding: '12px 16px',
                    background: '#13131a',
                    borderTop: '1px solid #242432',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}>
                    {/* Revert / Undo step */}
                    {['PREPARING', 'READY', 'ON_THE_WAY'].includes(order.status) && (
                      <button
                        type="button"
                        onClick={() => {
                          const prev = order.status === 'ON_THE_WAY' ? 'READY' : order.status === 'READY' ? 'PREPARING' : 'RECEIVED';
                          updateStatus(order, prev);
                        }}
                        disabled={isProcessing}
                        title="Revert back one step"
                        style={{
                          background: '#222230',
                          border: '1px solid #333346',
                          color: '#aaa',
                          borderRadius: '10px',
                          padding: '12px 14px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                      >
                        <Undo2 size={16} />
                      </button>
                    )}

                    {/* Primary Step Button */}
                    {['PAID', 'RECEIVED'].includes(order.status) && (
                      <button
                        type="button"
                        onClick={() => updateStatus(order, 'PREPARING')}
                        disabled={isProcessing}
                        style={{
                          flex: 1,
                          background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
                          color: '#000',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '13px 16px',
                          fontSize: '15px',
                          fontWeight: 900,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          letterSpacing: '0.5px',
                          boxShadow: '0 4px 14px rgba(245, 158, 11, 0.35)'
                        }}
                      >
                        <Flame size={18} />
                        {isProcessing ? 'UPDATING...' : 'START COOKING'}
                      </button>
                    )}

                    {order.status === 'PREPARING' && (
                      <button
                        type="button"
                        onClick={() => updateStatus(order, 'READY')}
                        disabled={isProcessing}
                        style={{
                          flex: 1,
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: '#000',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '13px 16px',
                          fontSize: '15px',
                          fontWeight: 900,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          letterSpacing: '0.5px',
                          boxShadow: '0 4px 14px rgba(16, 185, 129, 0.35)'
                        }}
                      >
                        <CheckCircle2 size={18} />
                        {isProcessing ? 'UPDATING...' : 'MARK READY (PACKED)'}
                      </button>
                    )}

                    {order.status === 'READY' && order.fulfilment === 'DELIVERY' && (
                      <button
                        type="button"
                        onClick={() => updateStatus(order, 'ON_THE_WAY')}
                        disabled={isProcessing}
                        style={{
                          flex: 1,
                          background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '13px 16px',
                          fontSize: '15px',
                          fontWeight: 900,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          letterSpacing: '0.5px',
                          boxShadow: '0 4px 16px rgba(139, 92, 246, 0.4)'
                        }}
                      >
                        <Truck size={18} />
                        {isProcessing ? 'UPDATING...' : 'OUT FOR DELIVERY (HANDOVER) 🚗'}
                      </button>
                    )}

                    {order.status === 'READY' && order.fulfilment === 'PICKUP' && (
                      <button
                        type="button"
                        onClick={() => updateStatus(order, 'COMPLETED')}
                        disabled={isProcessing}
                        style={{
                          flex: 1,
                          background: 'linear-gradient(135deg, #c9a96e 0%, #a28347 100%)',
                          color: '#000',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '13px 16px',
                          fontSize: '15px',
                          fontWeight: 900,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          letterSpacing: '0.5px',
                          boxShadow: '0 4px 14px rgba(201, 169, 110, 0.35)'
                        }}
                      >
                        <PackageCheck size={18} />
                        {isProcessing ? 'UPDATING...' : 'BUMP / COLLECTED'}
                      </button>
                    )}

                    {order.status === 'ON_THE_WAY' && (
                      <button
                        type="button"
                        onClick={() => updateStatus(order, 'DELIVERED')}
                        disabled={isProcessing}
                        style={{
                          flex: 1,
                          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
                          color: '#fff',
                          border: 'none',
                          borderRadius: '10px',
                          padding: '13px 16px',
                          fontSize: '15px',
                          fontWeight: 900,
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '8px',
                          letterSpacing: '0.5px',
                          boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)'
                        }}
                      >
                        <CheckCircle2 size={18} />
                        {isProcessing ? 'UPDATING...' : 'MARK DELIVERED (COMPLETE)'}
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
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
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
