'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bell,
  BellOff,
  CheckCircle2,
  Clock,
  Flame,
  Maximize2,
  Minimize2,
  Sparkles,
  Utensils,
  Volume2,
  VolumeX
} from 'lucide-react';

/* ── Web Audio Synth Alert (Domino's Style Chime) ────────────────────────── */

let audioCtx = null;

function playReadyChime() {
  try {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (!AudioContextClass) return;
    if (!audioCtx) audioCtx = new AudioContextClass();
    if (audioCtx.state === 'suspended') audioCtx.resume();

    const now = audioCtx.currentTime;

    // 3-tone cheerful restaurant chime (E5 -> G#5 -> B5)
    const tones = [
      { freq: 659.25, time: now, dur: 0.18, gain: 0.3 },
      { freq: 830.61, time: now + 0.15, dur: 0.22, gain: 0.35 },
      { freq: 987.77, time: now + 0.32, dur: 0.55, gain: 0.4 }
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
    console.warn('[TV Display Chime error]:', e);
  }
}

export default function RestaurantDisplayBoard() {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [newlyReadyIds, setNewlyReadyIds] = useState(new Set());
  const [audioNeedsUnlock, setAudioNeedsUnlock] = useState(false);

  const previousReadyIdsRef = useRef(new Set());
  const isFirstLoadRef = useRef(true);

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

  // Digital Clock
  useEffect(() => {
    const clockTimer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(clockTimer);
  }, []);

  // Lock body/html scrollbars completely on the TV display
  useEffect(() => {
    const origHtmlOverflow = document.documentElement.style.overflow;
    const origBodyOverflow = document.body.style.overflow;
    const origBodyHeight = document.body.style.height;

    document.documentElement.style.overflow = 'hidden';
    document.documentElement.style.overflowX = 'hidden';
    document.documentElement.style.overflowY = 'hidden';
    document.body.style.overflow = 'hidden';
    document.body.style.overflowX = 'hidden';
    document.body.style.overflowY = 'hidden';
    document.body.style.height = '100%';
    document.body.style.margin = '0';
    document.body.style.padding = '0';

    return () => {
      document.documentElement.style.overflow = origHtmlOverflow;
      document.documentElement.style.overflowX = '';
      document.documentElement.style.overflowY = '';
      document.body.style.overflow = origBodyOverflow;
      document.body.style.overflowX = '';
      document.body.style.overflowY = '';
      document.body.style.height = origBodyHeight;
      document.body.style.margin = '';
      document.body.style.padding = '';
    };
  }, []);

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

  // Fetch active display orders from backend
  const fetchBoardOrders = useCallback(async () => {
    try {
      const response = await fetch('/api/shop/display-board', { cache: 'no-store' });
      if (!response.ok) return;
      const data = await response.json();
      const boardRows = Array.isArray(data) ? data : [];

      // Detect orders that just moved into READY
      const currentReady = new Set(
        boardRows.filter(o => o.stage === 'READY').map(o => o.orderNumber)
      );

      if (!isFirstLoadRef.current) {
        const justBecameReady = new Set();
        for (const num of currentReady) {
          if (!previousReadyIdsRef.current.has(num)) {
            justBecameReady.add(num);
          }
        }

        if (justBecameReady.size > 0) {
          if (soundEnabled) playReadyChime();
          setNewlyReadyIds(justBecameReady);
          // Clear flash after 12 seconds
          setTimeout(() => setNewlyReadyIds(new Set()), 12000);
        }
      }

      previousReadyIdsRef.current = currentReady;
      isFirstLoadRef.current = false;
      setOrders(boardRows);
    } catch (e) {
      console.warn('[Display Board fetch error]:', e);
    } finally {
      setLoading(false);
    }
  }, [soundEnabled]);

  // Real-time polling every 4 seconds
  useEffect(() => {
    fetchBoardOrders();
    const pollInterval = setInterval(fetchBoardOrders, 4000);
    return () => clearInterval(pollInterval);
  }, [fetchBoardOrders]);

  // Split into Preparing and Ready
  const preparingOrders = useMemo(() => {
    return orders.filter(o => o.stage === 'PREPARING');
  }, [orders]);

  const readyOrders = useMemo(() => {
    return orders.filter(o => o.stage === 'READY' || o.stage === 'COMPLETED' || o.stage === 'ON_THE_WAY');
  }, [orders]);

  return (
    <div style={{
      width: '100%',
      height: '100%',
      maxWidth: '100vw',
      maxHeight: '100vh',
      background: '#07070a',
      color: '#f4f0e6',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, Roboto, sans-serif",
      overflow: 'hidden',
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 999999,
      userSelect: 'none'
    }}>
      {/* ── AUDIO AUTOPLAY UNBLOCKER ── */}
      {audioNeedsUnlock && (
        <div
          onClick={() => {
            if (audioCtx && audioCtx.state === 'suspended') {
              audioCtx.resume();
            }
            playReadyChime();
            setAudioNeedsUnlock(false);
          }}
          style={{
            background: 'linear-gradient(90deg, #92400e 0%, #b45309 100%)',
            color: '#fef3c7',
            padding: '8px 20px',
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
          <span>TV Audio is muted by browser policy. Click anywhere to activate live chime alerts.</span>
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

      {/* ── TOP RESTAURANT TV HEADER BAR ─────────────────────────────────────── */}
      <header style={{
        background: 'linear-gradient(180deg, #161520 0%, #0e0d14 100%)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: '62px',
        flexShrink: 0,
        boxSizing: 'border-box',
        boxShadow: '0 4px 20px rgba(0,0,0,0.5)'
      }}>
        {/* Restaurant Logo & Title */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          <div style={{
            width: '40px',
            height: '40px',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, #f0d080 0%, #c9a96e 100%)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 14px rgba(201, 169, 110, 0.35)',
            flexShrink: 0
          }}>
            <Utensils size={22} color="#0a0a0c" strokeWidth={2.5} />
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <h1 style={{
                margin: 0,
                fontSize: '22px',
                fontWeight: 900,
                letterSpacing: '1px',
                color: '#fff',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap'
              }}>
                PREVA KITCHEN
              </h1>
              <span style={{
                fontSize: '11px',
                fontWeight: 800,
                background: 'rgba(201, 169, 110, 0.15)',
                color: '#f0d080',
                border: '1px solid rgba(201, 169, 110, 0.35)',
                padding: '2px 8px',
                borderRadius: '5px',
                letterSpacing: '0.5px',
                textTransform: 'uppercase',
                whiteSpace: 'nowrap'
              }}>
                LIVE ORDER BOARD
              </span>
            </div>
            <p style={{ margin: '1px 0 0', color: '#888', fontSize: '12px', fontWeight: 600 }}>
              Real-time kitchen prep & counter pickup status
            </p>
          </div>
        </div>

        {/* Live Status, Clock & Controls (Uniform 36px Height) */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          {/* Live Indicator */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '7px',
            background: 'rgba(16, 185, 129, 0.12)',
            border: '1px solid rgba(16, 185, 129, 0.3)',
            padding: '0 12px',
            borderRadius: '8px',
            height: '36px',
            boxSizing: 'border-box'
          }}>
            <span style={{
              width: '8px',
              height: '8px',
              borderRadius: '50%',
              background: '#10b981',
              boxShadow: '0 0 8px #10b981',
              display: 'inline-block',
              animation: 'pulse 2s infinite',
              flexShrink: 0
            }} />
            <span style={{ fontSize: '12px', fontWeight: 800, color: '#34d399', letterSpacing: '0.5px', whiteSpace: 'nowrap' }}>
              LIVE UPDATES
            </span>
          </div>

          {/* Big Digital Clock */}
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            background: '#181824',
            border: '1px solid rgba(255,255,255,0.1)',
            padding: '0 14px',
            borderRadius: '8px',
            height: '36px',
            boxSizing: 'border-box'
          }}>
            <Clock size={16} color="#c9a96e" />
            <span style={{
              fontSize: '16px',
              fontWeight: 900,
              letterSpacing: '0.5px',
              color: '#f0d080',
              fontFamily: 'monospace',
              whiteSpace: 'nowrap'
            }}>
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>

          {/* Sound Mute Toggle */}
          <button
            type="button"
            onClick={() => {
              const next = !soundEnabled;
              setSoundEnabled(next);
              if (next) playReadyChime();
            }}
            title={soundEnabled ? 'Mute Chime Alerts' : 'Enable Chime Alerts'}
            style={{
              background: soundEnabled ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
              border: `1px solid ${soundEnabled ? 'rgba(16, 185, 129, 0.35)' : 'rgba(239, 68, 68, 0.35)'}`,
              color: soundEnabled ? '#34d399' : '#f87171',
              padding: '0 12px',
              borderRadius: '8px',
              height: '36px',
              fontSize: '12px',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              boxSizing: 'border-box'
            }}
          >
            {soundEnabled ? <Volume2 size={16} /> : <VolumeX size={16} />}
            <span>{soundEnabled ? 'Chime ON' : 'Muted'}</span>
          </button>

          {/* Fullscreen Toggle */}
          <button
            type="button"
            onClick={toggleFullscreen}
            title="Toggle TV Fullscreen (Key: F)"
            style={{
              background: '#181824',
              border: '1px solid rgba(255,255,255,0.12)',
              color: '#f0d080',
              padding: '0 14px',
              borderRadius: '8px',
              height: '36px',
              fontSize: '12px',
              fontWeight: 800,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              whiteSpace: 'nowrap',
              boxSizing: 'border-box'
            }}
          >
            {isFullscreen ? <Minimize2 size={15} /> : <Maximize2 size={15} />}
            <span>{isFullscreen ? 'Window' : 'Fullscreen'}</span>
          </button>
        </div>
      </header>

      {/* ── 2 BIG DOMINO'S-STYLE TV COLUMNS (PREPARING vs READY) ─────────────── */}
      <div style={{
        flex: '1 1 auto',
        height: 'calc(100vh - 62px - 46px)',
        minHeight: 0,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: '16px',
        padding: '16px 20px 14px 20px',
        overflow: 'hidden',
        boxSizing: 'border-box'
      }}>
        {/* ── COLUMN 1: PREPARING / IN THE OVEN ── */}
        <section style={{
          background: '#0d0d14',
          borderRadius: '16px',
          border: '1.5px solid rgba(245, 158, 11, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 8px 30px rgba(0,0,0,0.6)',
          height: '100%',
          minHeight: 0
        }}>
          {/* Column Header */}
          <div style={{
            background: 'linear-gradient(135deg, #1c150b 0%, #2e1d06 100%)',
            borderBottom: '2px solid rgba(245, 158, 11, 0.4)',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(245, 158, 11, 0.2)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #f59e0b'
              }}>
                <Flame size={22} color="#f59e0b" />
              </div>
              <div>
                <h2 style={{
                  margin: 0,
                  fontSize: '24px',
                  fontWeight: 900,
                  letterSpacing: '1px',
                  color: '#fbbf24',
                  textTransform: 'uppercase'
                }}>
                  PREPARING
                </h2>
                <span style={{ fontSize: '13px', color: '#aaa', fontWeight: 600 }}>
                  In kitchen &amp; oven prep
                </span>
              </div>
            </div>

            <span style={{
              background: '#2b1c07',
              color: '#f59e0b',
              border: '1.5px solid #f59e0b',
              padding: '6px 16px',
              borderRadius: '12px',
              fontSize: '18px',
              fontWeight: 900
            }}>
              {preparingOrders.length}
            </span>
          </div>

          {/* Preparing Orders Grid */}
          <div style={{
            flex: 1,
            padding: '20px',
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
            gap: '16px',
            alignContent: 'start'
          }}>
            {preparingOrders.length === 0 ? (
              <div style={{
                gridColumn: '1 / -1',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#666',
                paddingTop: '60px'
              }}>
                <Flame size={48} color="#444" style={{ marginBottom: '12px' }} />
                <p style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>No orders currently in prep</p>
              </div>
            ) : (
              preparingOrders.map((order) => (
                <div
                  key={order.orderNumber}
                  style={{
                    background: '#161520',
                    border: '1.5px solid #2d2b3d',
                    borderRadius: '16px',
                    padding: '16px 18px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '8px',
                    boxShadow: '0 4px 16px rgba(0,0,0,0.3)',
                    transition: 'transform 0.2s ease'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <span style={{
                      fontSize: '36px',
                      fontWeight: 900,
                      color: '#fff',
                      letterSpacing: '-1px'
                    }}>
                      #{order.orderNumber}
                    </span>

                    <span style={{
                      fontSize: '11px',
                      fontWeight: 800,
                      padding: '3px 8px',
                      borderRadius: '6px',
                      background: order.fulfilment === 'DELIVERY' ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)',
                      color: order.fulfilment === 'DELIVERY' ? '#60a5fa' : '#34d399',
                      border: `1px solid ${order.fulfilment === 'DELIVERY' ? '#3b82f6' : '#10b981'}`
                    }}>
                      {order.fulfilment === 'DELIVERY' ? '🚗 Delivery' : '🏃 Pickup'}
                    </span>
                  </div>

                  <div style={{
                    fontSize: '16px',
                    fontWeight: 700,
                    color: '#d1d5db',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap'
                  }}>
                    {order.customerName}
                  </div>

                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '12px',
                    color: '#f59e0b',
                    fontWeight: 700,
                    marginTop: '4px'
                  }}>
                    <span style={{
                      display: 'inline-block',
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      background: '#f59e0b'
                    }} />
                    <span>Cooking now...</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>

        {/* ── COLUMN 2: READY FOR PICKUP / COLLECT NOW ── */}
        <section style={{
          background: '#0b130e',
          borderRadius: '20px',
          border: '2px solid rgba(16, 185, 129, 0.35)',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: '0 12px 40px rgba(16, 185, 129, 0.15)',
          height: '100%',
          minHeight: 0
        }}>
          {/* Column Header */}
          <div style={{
            background: 'linear-gradient(135deg, #092116 0%, #0d3221 100%)',
            borderBottom: '2px solid #10b981',
            padding: '18px 24px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <div style={{
                width: '38px',
                height: '38px',
                borderRadius: '10px',
                background: 'rgba(16, 185, 129, 0.25)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                border: '1px solid #10b981'
              }}>
                <CheckCircle2 size={24} color="#10b981" />
              </div>
              <div>
                <h2 style={{
                  margin: 0,
                  fontSize: '24px',
                  fontWeight: 900,
                  letterSpacing: '1px',
                  color: '#34d399',
                  textTransform: 'uppercase'
                }}>
                  READY FOR PICKUP
                </h2>
                <span style={{ fontSize: '13px', color: '#a7f3d0', fontWeight: 600 }}>
                  Please proceed to front counter
                </span>
              </div>
            </div>

            <span style={{
              background: '#0d3221',
              color: '#34d399',
              border: '1.5px solid #10b981',
              padding: '6px 16px',
              borderRadius: '12px',
              fontSize: '18px',
              fontWeight: 900
            }}>
              {readyOrders.length} READY
            </span>
          </div>

          {/* Ready Orders Grid */}
          <div style={{
            flex: 1,
            padding: '20px',
            overflowY: 'auto',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))',
            gap: '18px',
            alignContent: 'start'
          }}>
            {readyOrders.length === 0 ? (
              <div style={{
                gridColumn: '1 / -1',
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                color: '#4b755d',
                paddingTop: '60px'
              }}>
                <CheckCircle2 size={48} color="#2b503c" style={{ marginBottom: '12px' }} />
                <p style={{ fontSize: '18px', fontWeight: 700, margin: 0 }}>Orders will appear here when ready</p>
              </div>
            ) : (
              readyOrders.map((order) => {
                const isFreshlyReady = newlyReadyIds.has(order.orderNumber);

                return (
                  <div
                    key={order.orderNumber}
                    style={{
                      background: isFreshlyReady
                        ? 'linear-gradient(135deg, #133a28 0%, #0d291c 100%)'
                        : '#0e2318',
                      border: `2px solid ${isFreshlyReady ? '#34d399' : '#10b981'}`,
                      borderRadius: '18px',
                      padding: '18px 20px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px',
                      boxShadow: isFreshlyReady
                        ? '0 0 30px rgba(52, 211, 153, 0.6)'
                        : '0 6px 20px rgba(0,0,0,0.4)',
                      animation: isFreshlyReady ? 'readyPulse 1.5s infinite' : 'none',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                  >
                    {isFreshlyReady && (
                      <div style={{
                        position: 'absolute',
                        top: 0,
                        right: 0,
                        background: '#34d399',
                        color: '#000',
                        fontSize: '10px',
                        fontWeight: 900,
                        padding: '2px 8px',
                        borderBottomLeftRadius: '8px',
                        letterSpacing: '0.5px'
                      }}>
                        JUST READY!
                      </div>
                    )}

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <span style={{
                        fontSize: '42px',
                        fontWeight: 900,
                        color: '#fff',
                        letterSpacing: '-1.5px',
                        textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                      }}>
                        #{order.orderNumber}
                      </span>

                      <span style={{
                        fontSize: '11px',
                        fontWeight: 800,
                        padding: '3px 8px',
                        borderRadius: '6px',
                        background: 'rgba(52, 211, 153, 0.25)',
                        color: '#6ee7b7',
                        border: '1px solid #34d399'
                      }}>
                        {order.fulfilment === 'DELIVERY' ? '🚗 Delivery' : '🏃 Pickup'}
                      </span>
                    </div>

                    <div style={{
                      fontSize: '18px',
                      fontWeight: 800,
                      color: '#a7f3d0',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {order.customerName}
                    </div>

                    <div style={{
                      background: order.stage === 'ON_THE_WAY' ? 'rgba(139, 92, 246, 0.25)' : 'rgba(16, 185, 129, 0.2)',
                      border: `1px solid ${order.stage === 'ON_THE_WAY' ? 'rgba(139, 92, 246, 0.5)' : 'rgba(16, 185, 129, 0.4)'}`,
                      borderRadius: '8px',
                      padding: '6px 10px',
                      marginTop: '4px',
                      textAlign: 'center',
                      fontSize: '12px',
                      fontWeight: 800,
                      color: order.stage === 'ON_THE_WAY' ? '#c4b5fd' : '#6ee7b7',
                      letterSpacing: '0.5px'
                    }}>
                      {order.stage === 'ON_THE_WAY' ? '🚗 ON THE WAY (OUT FOR DELIVERY)' : 'COLLECT AT COUNTER ➔'}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      </div>

      {/* ── BOTTOM TV MARQUEE / TICKER BAR ───────────────────────────────────── */}
      <footer style={{
        background: '#0e0d13',
        borderTop: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: '13px',
        fontWeight: 600,
        color: '#aaa',
        height: '46px',
        flexShrink: 0,
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{
            background: 'linear-gradient(135deg, #f0d080, #c9a96e)',
            color: '#000',
            fontWeight: 800,
            fontSize: '11px',
            padding: '2px 8px',
            borderRadius: '4px',
            letterSpacing: '0.5px'
          }}>
            NOTICE
          </span>
          <span style={{ color: '#eee' }}>
            Please have your Order # ready at the counter • Thank you for dining with Preva Kitchen!
          </span>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', fontSize: '12px', color: '#777' }}>
          <span>13090 Inkster Rd, Redford MI</span>
          <span>•</span>
          <span>(313) 541-7000</span>
          <span>•</span>
          <span>prevakitchen.com</span>
        </div>
      </footer>

      {/* ── GLOBAL ANIMATIONS & SCROLLBAR SUPPRESSION ── */}
      <style jsx global>{`
        html, body, #preva-app {
          overflow: hidden !important;
          overflow-x: hidden !important;
          overflow-y: hidden !important;
          height: 100% !important;
          max-height: 100vh !important;
          width: 100% !important;
          max-width: 100vw !important;
          margin: 0 !important;
          padding: 0 !important;
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        * {
          scrollbar-width: none !important;
          -ms-overflow-style: none !important;
        }
        *::-webkit-scrollbar, ::-webkit-scrollbar {
          display: none !important;
          width: 0px !important;
          height: 0px !important;
          background: transparent !important;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.4; transform: scale(0.85); }
        }
        @keyframes readyPulse {
          0%, 100% { border-color: #34d399; box-shadow: 0 0 25px rgba(52, 211, 153, 0.7); }
          50% { border-color: #f0d080; box-shadow: 0 0 35px rgba(240, 208, 128, 0.9); }
        }
      `}</style>
    </div>
  );
}
