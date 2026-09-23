'use client';

import Link from 'next/link';
import {
  Bell,
  BellOff,
  Calendar,
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
  Truck,
  Undo2,
  Utensils,
  Volume2,
  WifiOff,
  X,
  Zap
} from 'lucide-react';
import KdsOperationsPanel from '@/components/kds/KdsOperationsPanel';
import { formatCountdown, formatElapsed, getStageInfo, getUrgency, msUntilFire } from '@/lib/kds/useKdsBoard';

const CANCELLATION_REASONS = [
  'Guest requested cancellation',
  'Payment issue',
  'Item out of stock',
  'Duplicate order',
  'Delivery unavailable',
  'Other operational reason'
];

/**
 * Shared ticket board rendered by both the admin KDS and the standalone
 * kitchen terminal. Page-specific concerns (login screen, fullscreen kiosk
 * lock, header auth controls) stay in the caller and are passed in as props
 * so this file owns only the ticket workflow both entry points must agree on.
 */
export default function KdsBoard({
  board,
  badgeLabel = 'KDS',
  headerLeft = null,
  headerRight = null,
  authToken = '',
  onUnauthorized,
  isFullscreen = false,
  onToggleFullscreen,
  newOrderAlert = null,
  onDismissNewOrderAlert,
  audioNeedsUnlock = false,
  onUnlockAudio
}) {
  const {
    filteredOrders,
    completedOrders,
    loading,
    refreshing,
    currentTime,
    soundEnabled,
    toggleSound,
    filterStage,
    setFilterStage,
    filterFulfilment,
    setFilterFulfilment,
    filterStation,
    setFilterStation,
    activeStations,
    showPrepSummary,
    setShowPrepSummary,
    showRecallDrawer,
    setShowRecallDrawer,
    checkedItems,
    processingId,
    errorNotice,
    setErrorNotice,
    printingOrder,
    setPrintingOrder,
    connectionStatus,
    pendingActionCount,
    scheduledHoldOrders,
    fireOrderNow,
    counts,
    allDayPrepSummary,
    fetchOrders,
    fetchRecalls,
    updateStatus,
    restoreOrder,
    toggleItemCheck,
    assignTicket,
    assignDriver,
    markDineInPaid
  } = board;

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
            onClick={onDismissNewOrderAlert}
            style={{ background: 'rgba(0,0,0,0.3)', border: 'none', color: '#fff', padding: '6px 14px', borderRadius: '6px', fontWeight: 700, cursor: 'pointer' }}
          >
            DISMISS
          </button>
        </div>
      )}

      {filteredOrders.some((order) => order.inventoryAlert === 'PAID_BUT_OVERSOLD') && (
        <div style={{
          background: '#7f1d1d',
          color: '#fee2e2',
          padding: '10px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '10px',
          borderBottom: '2px solid #ef4444',
          fontWeight: 900,
          letterSpacing: '0.3px'
        }}>
          <PackageCheck size={18} />
          <span>PAID BUT OVERSOLD: resolve the highlighted order before service.</span>
        </div>
      )}

      {/* ── AUDIO AUTOPLAY PERMISSION UNBLOCKER BANNER ── */}
      {audioNeedsUnlock && (
        <div
          onClick={onUnlockAudio}
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
          <span style={{ background: '#fef3c7', color: '#78350f', padding: '2px 10px', borderRadius: '6px', fontWeight: 900, fontSize: '11px', textTransform: 'uppercase' }}>
            Enable Chimes 🔔
          </span>
        </div>
      )}

      {/* ── TIER 1: BRANDING & SYSTEM UTILITIES BAR ───────────────────────── */}
      <header style={{
        background: 'linear-gradient(180deg, rgba(22, 22, 32, 0.88) 0%, rgba(17, 17, 24, 0.92) 100%)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
        padding: '10px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        height: '60px',
        boxSizing: 'border-box'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
          {headerLeft}

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
              {badgeLabel}
            </span>
          </div>

          <div style={{ width: '1px', height: '22px', background: 'rgba(255,255,255,0.12)', margin: '0 4px' }} />

          <ConnectionPill status={connectionStatus} refreshing={refreshing} />
          {pendingActionCount > 0 && (
            <span style={{ color: '#fbbf24', fontSize: '11px', fontWeight: 800 }}>
              {pendingActionCount} action{pendingActionCount === 1 ? '' : 's'} queued
            </span>
          )}

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px' }}>
            <Clock size={14} style={{ display: 'inline', color: '#c9a84c', flexShrink: 0 }} />
            <span style={{ color: '#f0d080', fontWeight: 800, fontFamily: 'monospace', fontSize: '14px', whiteSpace: 'nowrap' }}>
              {currentTime.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <KdsOperationsPanel authToken={authToken} onUnauthorized={onUnauthorized} />

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
            {soundEnabled ? <Bell size={15} /> : <BellOff size={15} />}
            <span>{soundEnabled ? 'Chime ON' : 'Muted'}</span>
          </button>

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

          {onToggleFullscreen && (
            <button
              type="button"
              onClick={onToggleFullscreen}
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
          )}

          <button
            type="button"
            onClick={() => fetchOrders({ silent: false })}
            title="Refresh Orders Now"
            disabled={refreshing}
            style={{
              height: '36px',
              padding: '0 12px',
              borderRadius: '8px',
              background: '#1c1c28',
              color: '#ddd',
              border: '1px solid rgba(255,255,255,0.12)',
              fontSize: '12px',
              fontWeight: 700,
              display: 'inline-flex',
              alignItems: 'center',
              gap: '6px',
              cursor: refreshing ? 'default' : 'pointer',
              whiteSpace: 'nowrap',
              boxSizing: 'border-box'
            }}
          >
            <RefreshCw size={14} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
            <span>Sync</span>
          </button>

          {headerRight}
        </div>
      </header>

      {/* ── TIER 2: STATION CONTROLS & FILTER COMMAND BAR ───────────────────── */}
      <div style={{
        background: 'rgba(13, 13, 20, 0.92)',
        backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)',
        borderBottom: '1px solid rgba(201, 168, 76, 0.25)',
        padding: '8px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
        height: '52px',
        boxSizing: 'border-box'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          background: '#151520',
          borderRadius: '10px',
          padding: '3px',
          border: '1px solid rgba(255,255,255,0.08)',
          gap: '3px'
        }}>
          {[
            ['ALL', 'All Active', counts.total, '#f0d080'],
            ['RECEIVED', '🔥 Waiting', counts.waiting, '#f59e0b'],
            ['PREPARING', '🍳 Cooking', counts.cooking, '#3b82f6'],
            ['READY', '✅ Ready', counts.ready, '#10b981'],
            ['ON_THE_WAY', '🚗 On Way', counts.onTheWay, '#8b5cf6']
          ].map(([stage, label, count, color]) => {
            const isActive = filterStage === stage;
            const activeBg = stage === 'ALL' ? 'linear-gradient(135deg, #f0d080 0%, #c9a84c 100%)' : color;
            const activeText = ['RECEIVED', 'READY', 'ALL'].includes(stage) ? '#000' : '#fff';
            return (
              <button
                key={stage}
                type="button"
                onClick={() => setFilterStage(stage)}
                style={{
                  height: '32px',
                  padding: '0 14px',
                  borderRadius: '7px',
                  border: 'none',
                  background: isActive ? activeBg : 'transparent',
                  color: isActive ? activeText : '#999',
                  fontWeight: 800,
                  fontSize: '13px',
                  cursor: 'pointer',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '6px',
                  whiteSpace: 'nowrap'
                }}
              >
                {label}
                <span style={{
                  background: isActive ? 'rgba(0,0,0,0.3)' : '#222230',
                  color: isActive ? activeText : '#aaa',
                  padding: '1px 6px',
                  borderRadius: '8px',
                  fontSize: '11px',
                  fontWeight: 900
                }}>{count}</span>
              </button>
            );
          })}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <select
            value={filterFulfilment}
            onChange={(e) => setFilterFulfilment(e.target.value)}
            style={{
              height: '36px',
              background: '#181824',
              color: '#f0d080',
              border: '1px solid rgba(201, 168, 76, 0.35)',
              borderRadius: '8px',
              padding: '0 14px',
              fontSize: '13px',
              fontWeight: 700,
              cursor: 'pointer',
              outline: 'none',
              whiteSpace: 'nowrap',
              boxSizing: 'border-box'
            }}
          >
            <option value="ALL">📦 All Types (Pickup & Delivery)</option>
            <option value="PICKUP">🛍️ Pickup Orders Only</option>
            <option value="DELIVERY">🚗 Delivery Orders Only</option>
            <option value="DINE_IN">🍽️ Dine-In Orders Only</option>
          </select>

          <select
            value={filterStation}
            onChange={(event) => setFilterStation(event.target.value)}
            style={{ height: '36px', background: '#181824', color: '#93c5fd', border: '1px solid rgba(147,197,253,.35)', borderRadius: '8px', padding: '0 12px', fontSize: '12px', fontWeight: 700, cursor: 'pointer', outline: 'none' }}
          >
            <option value="ALL">All Stations</option>
            {activeStations.map((station) => <option key={station} value={station}>{station}</option>)}
          </select>

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
              <span style={{ background: showPrepSummary ? 'rgba(0,0,0,0.3)' : '#f0d080', color: showPrepSummary ? '#fff' : '#000', padding: '1px 7px', borderRadius: '8px', fontSize: '11px', fontWeight: 900 }}>
                {allDayPrepSummary.length}
              </span>
            )}
          </button>

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

      {/* ── SCHEDULED / HELD ORDERS RAIL ─────────────────────────────────────
         Scheduled orders sit here — out of the active cooking queue — until
         they're inside the firing window, then promote themselves automatically.
         A cook can also pull one forward early with "Fire Now". */}
      {scheduledHoldOrders.length > 0 && (
        <div style={{
          background: 'linear-gradient(180deg, rgba(20, 18, 30, 0.96) 0%, rgba(14, 13, 22, 0.96) 100%)',
          borderBottom: '1px solid rgba(139, 92, 246, 0.3)',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: '14px',
          flexShrink: 0,
          overflowX: 'auto'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#c4b5fd', flexShrink: 0 }}>
            <Calendar size={16} />
            <span style={{ fontSize: '12px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
              Scheduled ({scheduledHoldOrders.length})
            </span>
          </div>
          <div style={{ display: 'flex', gap: '10px' }}>
            {scheduledHoldOrders.map((order) => {
              const remaining = msUntilFire(order);
              return (
                <div key={order.id} style={{
                  background: 'rgba(139, 92, 246, 0.1)',
                  border: '1px solid rgba(139, 92, 246, 0.35)',
                  borderRadius: '10px',
                  padding: '7px 12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  flexShrink: 0,
                  whiteSpace: 'nowrap'
                }}>
                  <span style={{ fontWeight: 900, color: '#fff', fontFamily: 'monospace' }}>#{order.orderNumber}</span>
                  <span style={{ fontSize: '12px', color: '#c4b5fd', fontWeight: 700 }}>
                    Fires in {formatCountdown(remaining)}
                  </span>
                  <button
                    type="button"
                    onClick={() => fireOrderNow(order.id)}
                    title="Pull this ticket into the active queue right now"
                    style={{ background: 'rgba(139, 92, 246, 0.25)', border: '1px solid #8b5cf6', color: '#e9d5ff', borderRadius: '6px', padding: '3px 8px', fontSize: '11px', fontWeight: 800, display: 'inline-flex', alignItems: 'center', gap: '4px', cursor: 'pointer' }}
                  >
                    <Zap size={11} />
                    Fire Now
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ── ALL-DAY PREP SUMMARY DRAWER ────────────────────────────────────── */}
      {showPrepSummary && (
        <div style={{
          background: 'linear-gradient(180deg, rgba(24, 20, 14, 0.98) 0%, rgba(16, 13, 8, 0.98) 100%)',
          borderBottom: '2px solid rgba(245, 158, 11, 0.45)',
          padding: '14px 24px',
          boxShadow: '0 12px 36px rgba(0,0,0,0.7), 0 0 20px rgba(245, 158, 11, 0.1)',
          flexShrink: 0
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', borderBottom: '1px solid rgba(245, 158, 11, 0.2)', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(245, 158, 11, 0.15)', border: '1px solid rgba(245, 158, 11, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <Flame size={17} color="#f59e0b" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#fbbf24' }}>
                    Batch Prep Aggregator (Consolidated Dishes Needed Now)
                  </h3>
                  <span style={{ background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid rgba(245, 158, 11, 0.35)', padding: '1px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 800 }}>
                    {allDayPrepSummary.length} Distinct Dishes
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: '#a8a29e', fontWeight: 500 }}>
                  Batch kitchen quantities aggregated across all active cooking orders.
                </span>
              </div>
            </div>
            <button type="button" onClick={() => setShowPrepSummary(false)} title="Close aggregator" style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={16} />
            </button>
          </div>

          {allDayPrepSummary.length === 0 ? (
            <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>No items pending preparation right now.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '10px', maxHeight: '180px', overflowY: 'auto', paddingRight: '4px' }}>
              {allDayPrepSummary.map((item, idx) => (
                <div key={idx} style={{ background: 'linear-gradient(145deg, #221a10 0%, #17120a 100%)', border: '1px solid rgba(245, 158, 11, 0.3)', borderRadius: '10px', padding: '10px 14px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', boxShadow: '0 3px 10px rgba(0,0,0,0.3)' }}>
                  <span style={{ fontWeight: 700, fontSize: '13px', color: '#f5f5f4', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.name}</span>
                  <span style={{ background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', color: '#000', fontWeight: 900, fontSize: '15px', padding: '2px 10px', borderRadius: '6px', minWidth: '24px', textAlign: 'center', flexShrink: 0 }}>{item.qty}×</span>
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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', borderBottom: '1px solid rgba(59, 130, 246, 0.2)', paddingBottom: '10px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: 'rgba(59, 130, 246, 0.15)', border: '1px solid rgba(59, 130, 246, 0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <History size={17} color="#60a5fa" />
              </div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <h3 style={{ margin: 0, fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.6px', color: '#93c5fd' }}>
                    Recently Completed Tickets (Recall / Undo)
                  </h3>
                  <span style={{ background: 'rgba(59, 130, 246, 0.2)', color: '#60a5fa', border: '1px solid rgba(59, 130, 246, 0.35)', padding: '1px 8px', borderRadius: '10px', fontSize: '11px', fontWeight: 800 }}>
                    {completedOrders.length} Available
                  </span>
                </div>
                <span style={{ fontSize: '11px', color: '#94a3b8', fontWeight: 500 }}>
                  Accidentally bumped a ticket? Tap &quot;Restore&quot; to push it right back to the active prep queue.
                </span>
              </div>
            </div>
            <button type="button" onClick={() => setShowRecallDrawer(false)} title="Close recall tray" style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(255,255,255,0.06)', border: '1px solid rgba(255,255,255,0.12)', color: '#94a3b8', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <X size={16} />
            </button>
          </div>

          {completedOrders.length === 0 ? (
            <p style={{ margin: 0, fontSize: '13px', color: '#888' }}>No completed orders to recall.</p>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '12px', maxHeight: '290px', overflowY: 'auto', paddingRight: '4px' }}>
              {completedOrders.map((order) => {
                const isDelivery = String(order.fulfilment).toUpperCase() === 'DELIVERY';
                const isProcessing = processingId === order.id;
                return (
                  <div key={order.id} style={{ background: 'linear-gradient(145deg, #161a2b 0%, #101423 100%)', border: '1px solid rgba(59, 130, 246, 0.3)', borderRadius: '12px', padding: '12px 14px', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: '10px', boxShadow: '0 4px 14px rgba(0, 0, 0, 0.35)', position: 'relative', overflow: 'hidden' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span style={{ fontSize: '18px', fontWeight: 900, color: '#fff', fontFamily: 'monospace', letterSpacing: '-0.5px' }}>#{order.orderNumber}</span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', fontSize: '10px', fontWeight: 800, padding: '2px 7px', borderRadius: '6px', textTransform: 'uppercase', letterSpacing: '0.4px', background: isDelivery ? 'rgba(99, 102, 241, 0.18)' : 'rgba(16, 185, 129, 0.18)', color: isDelivery ? '#a5b4fc' : '#6ee7b7', border: `1px solid ${isDelivery ? 'rgba(99, 102, 241, 0.35)' : 'rgba(16, 185, 129, 0.35)'}` }}>
                          {isDelivery ? <Truck size={10} /> : <Utensils size={10} />}
                          {order.fulfilment || 'PICKUP'}
                        </span>
                      </div>
                      <span style={{ fontSize: '11px', fontWeight: 700, color: '#64748b' }}>Done</span>
                    </div>

                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 700, color: '#f1f5f9', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.customer?.name || 'Guest'}</div>
                      {order.itemsSummary ? (
                        <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{order.itemsSummary}</div>
                      ) : (
                        <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Completed ticket</div>
                      )}
                    </div>

                    <button
                      type="button"
                      disabled={isProcessing}
                      onClick={() => restoreOrder(order)}
                      style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px', background: isProcessing ? 'rgba(59, 130, 246, 0.2)' : 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)', color: '#ffffff', border: '1px solid rgba(96, 165, 250, 0.4)', borderRadius: '8px', padding: '7px 12px', fontSize: '12px', fontWeight: 800, cursor: isProcessing ? 'not-allowed' : 'pointer', boxShadow: isProcessing ? 'none' : '0 2px 8px rgba(37, 99, 235, 0.4)' }}
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
        <div style={{ background: 'rgba(239, 68, 68, 0.15)', borderBottom: '1px solid #ef4444', color: '#fca5a5', padding: '8px 20px', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span>⚠️ {errorNotice}</span>
          <button type="button" onClick={() => setErrorNotice('')} style={{ background: 'transparent', border: 'none', color: '#fca5a5', cursor: 'pointer' }}>✕</button>
        </div>
      )}

      {/* ── MAIN TICKET DISPLAY GRID ───────────────────────────────────────── */}
      <main style={{ flex: 1, padding: '20px', overflowY: 'auto' }}>
        {loading && filteredOrders.length === 0 ? (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px' }}>
            {Array.from({ length: 6 }).map((_, idx) => (
              <div key={idx} className="kds-skeleton" style={{ height: '280px', borderRadius: '14px', border: '1px solid #22222e' }} />
            ))}
          </div>
        ) : filteredOrders.length === 0 ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '65vh', textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(201, 169, 110, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '16px', border: '1px solid rgba(201, 169, 110, 0.2)' }}>
              <ChefHat size={40} color="#c9a96e" />
            </div>
            <h2 style={{ fontSize: '22px', fontWeight: 700, margin: '0 0 6px', color: '#fff' }}>Kitchen is all caught up!</h2>
            <p style={{ color: '#888', fontSize: '14px', maxWidth: '400px', margin: 0 }}>
              No active orders in this view. New incoming tickets will automatically appear and ring the chime.
            </p>
          </div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))', gap: '18px', alignItems: 'start' }}>
            {filteredOrders.map((order) => (
              <OrderTicketCard
                key={order.id}
                order={order}
                stationFilter={filterStation}
                isProcessing={processingId === order.id}
                checkedItems={checkedItems}
                onToggleItem={toggleItemCheck}
                onUpdateStatus={updateStatus}
                onAssign={assignTicket}
                onAssignDriver={assignDriver}
                onPrint={() => setPrintingOrder(order)}
                onMarkPaid={(one) => {
                  const method = window.prompt('Payment method for this table (cash or card):', 'cash');
                  if (!method) return;
                  const clean = method.trim().toLowerCase();
                  if (!['cash', 'card'].includes(clean)) return window.alert('Enter "cash" or "card".');
                  const amount = window.prompt('Payment amount in dollars:', ((one.totalCents - (one.paymentPaidCents || 0)) / 100).toFixed(2));
                  const amountCents = Math.round(Number(amount) * 100);
                  if (!Number.isInteger(amountCents) || amountCents <= 0) return;
                  const details = { amountCents };
                  if (clean === 'cash') {
                    const tendered = window.prompt('Cash tendered in dollars:', (amountCents / 100).toFixed(2));
                    const cashTenderedCents = Math.round(Number(tendered) * 100);
                    if (!Number.isInteger(cashTenderedCents)) return;
                    details.cashTenderedCents = cashTenderedCents;
                  }
                  markDineInPaid(one, clean, details);
                }}
              />
            ))}
          </div>
        )}
      </main>

      {/* ── 80MM THERMAL RECEIPT SLIP PRINT CONTAINER ── */}
      {printingOrder && <PrintableReceipt order={printingOrder} />}

      {/* ── PRINT MEDIA STYLESHEET ── */}
      <style jsx global>{`
        @media screen {
          #thermal-receipt-container { display: none !important; }
        }
        @media print {
          body * { visibility: hidden !important; }
          #thermal-receipt-container,
          #thermal-receipt-container * { visibility: visible !important; }
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
          @page { size: 80mm auto; margin: 0; }
        }
        @keyframes spin {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.85; }
        }
        @keyframes ticketIn {
          from { opacity: 0; transform: translateY(10px) scale(0.98); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .kds-ticket-enter {
          animation: ticketIn 0.28s ease-out;
        }
        .kds-ticket-enter:hover {
          transform: translateY(-3px);
          box-shadow: 0 14px 32px rgba(0, 0, 0, 0.5);
        }
        @keyframes shimmer {
          0% { background-position: -400px 0; }
          100% { background-position: 400px 0; }
        }
        .kds-skeleton {
          background: linear-gradient(90deg, #16161f 0%, #1e1e2a 50%, #16161f 100%);
          background-size: 800px 100%;
          animation: shimmer 1.6s infinite linear;
        }
      `}</style>
    </div>
  );
}

function ConnectionPill({ status, refreshing }) {
  let color = '#10b981';
  let label = refreshing ? 'Syncing...' : 'Live';
  let Icon = null;
  let pulse = false;
  if (status === 'offline') {
    color = '#ef4444';
    label = 'Offline';
    Icon = WifiOff;
  } else if (status === 'reconnecting') {
    color = '#f59e0b';
    label = 'Reconnecting...';
    pulse = true;
  }

  return (
    <div style={{
      display: 'flex',
      alignItems: 'center',
      gap: '7px',
      fontSize: '13px',
      background: `${color}1a`,
      border: `1px solid ${color}55`,
      borderRadius: '999px',
      padding: '4px 10px 4px 8px'
    }}>
      {Icon ? (
        <Icon size={12} color={color} />
      ) : (
        <span style={{
          display: 'inline-block',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          background: color,
          boxShadow: `0 0 8px ${color}`,
          animation: pulse ? 'pulse 1s infinite' : 'none',
          flexShrink: 0
        }} />
      )}
      <span style={{ color, fontWeight: 700, whiteSpace: 'nowrap' }}>{label}</span>
    </div>
  );
}

function StageStepper({ status, fulfilment }) {
  const steps = fulfilment === 'DELIVERY'
    ? [['RECEIVED', 'Received'], ['PREPARING', 'Cooking'], ['READY', 'Ready'], ['ON_THE_WAY', 'On the way']]
    : [['RECEIVED', 'Received'], ['PREPARING', 'Cooking'], ['READY', 'Ready']];
  const normalized = status === 'PAID' ? 'RECEIVED' : status;
  const currentIndex = steps.findIndex(([key]) => key === normalized);

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', padding: '0 16px' }}>
      {steps.map(([key, label], idx) => {
        const isDone = idx < currentIndex;
        const isCurrent = idx === currentIndex;
        const color = isDone ? '#10b981' : isCurrent ? '#f0d080' : '#3a3a48';
        return (
          <div key={key} style={{ display: 'flex', alignItems: 'center', flex: idx < steps.length - 1 ? 1 : 'none' }}>
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '3px', flexShrink: 0 }}>
              <div style={{
                width: '9px',
                height: '9px',
                borderRadius: '50%',
                background: color,
                boxShadow: isCurrent ? `0 0 8px ${color}` : 'none',
                transition: 'background 0.2s ease'
              }} />
              <span style={{ fontSize: '9px', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.3px', color, whiteSpace: 'nowrap' }}>
                {label}
              </span>
            </div>
            {idx < steps.length - 1 && (
              <div style={{ flex: 1, height: '2px', background: isDone ? '#10b981' : '#2a2a36', margin: '0 4px 14px', borderRadius: '1px', transition: 'background 0.2s ease' }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

const SLA_COLORS = { ok: '#64748b', warning: '#f59e0b', breach: '#ef4444' };

function OrderTicketCard({ order, stationFilter = 'ALL', isProcessing, checkedItems, onToggleItem, onUpdateStatus, onAssign, onAssignDriver, onPrint, onMarkPaid }) {
  const elapsed = formatElapsed(order.createdAt);
  const urgency = getUrgency(order.createdAt, order.isScheduled, order.scheduledAt);
  const stageInfo = getStageInfo(order);
  const stageMinutes = Math.floor(stageInfo.elapsedMs / 60000);
  const slaColor = SLA_COLORS[stageInfo.level];
  const isWaiting = ['RECEIVED', 'PAID'].includes(order.status);
  const isCooking = order.status === 'PREPARING';
  const isReady = order.status === 'READY';
  const isOnTheWay = order.status === 'ON_THE_WAY';
  const isDelivery = order.fulfilment === 'DELIVERY';
  const isDineIn = order.fulfilment === 'DINE_IN';
  const isOpenPayment = isDineIn && ['UNPAID', 'PARTIAL'].includes(order.paymentStatus);
  const isOversold = order.inventoryAlert === 'PAID_BUT_OVERSOLD';
  const displayLines = (order.lines || [])
    .map((line, lineIndex) => ({ ...line, lineIndex }))
    .filter((line) => stationFilter === 'ALL' || (line.station || 'Expo') === stationFilter);

  let cardBorder = isOversold ? '3px solid #ef4444' : '1px solid #2c2c38';
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
  } else if (isOnTheWay) {
    cardBorder = '1.5px solid #8b5cf6';
    timerBg = 'rgba(139, 92, 246, 0.2)';
    timerColor = '#c4b5fd';
  } else if (isReady) {
    cardBorder = '1.5px solid #10b981';
    timerBg = 'rgba(16, 185, 129, 0.2)';
    timerColor = '#10b981';
  }
  if (isOversold) {
    cardBorder = '3px solid #ef4444';
  }

  const prevStatus = isOnTheWay ? 'READY' : isReady ? 'PREPARING' : 'RECEIVED';

  return (
    <div className="kds-ticket-enter" style={{ background: '#15151c', borderRadius: '14px', border: cardBorder, overflow: 'hidden', display: 'flex', flexDirection: 'column', boxShadow: urgency === 'urgent' ? '0 0 20px rgba(239, 68, 68, 0.25)' : '0 8px 24px rgba(0, 0, 0, 0.4)', transition: 'transform 0.15s ease, box-shadow 0.15s ease' }}>
      <div style={{ background: '#1a1a24', padding: '12px 16px', borderBottom: '1px solid #262634', display: 'flex', flexDirection: 'column', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{ fontSize: '26px', fontWeight: 900, color: '#f0d080', letterSpacing: '-0.5px', lineHeight: 1 }}>#{order.orderNumber}</span>
            {isDineIn ? (
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', padding: '3px 8px', borderRadius: '6px', background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24', border: '1px solid #f59e0b' }}>
                🍽️ Table {order.tableNumber || '?'}
              </span>
            ) : (
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', padding: '3px 8px', borderRadius: '6px', background: isDelivery ? 'rgba(59, 130, 246, 0.2)' : 'rgba(16, 185, 129, 0.2)', color: isDelivery ? '#60a5fa' : '#34d399', border: `1px solid ${isDelivery ? '#3b82f6' : '#10b981'}` }}>
                {isDelivery ? '🚗 Delivery' : '🏃 Pickup'}
              </span>
            )}
            {isOpenPayment && (
              <button
                type="button"
                onClick={() => onMarkPaid(order)}
                title="Record a full or partial payment"
                style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', padding: '3px 8px', borderRadius: '6px', background: 'rgba(239, 68, 68, 0.2)', color: '#fca5a5', border: '1px solid #ef4444', cursor: 'pointer' }}
              >
                {order.paymentStatus === 'PARTIAL' ? 'Partial · Add Payment' : 'Unpaid · Add Payment'}
              </button>
            )}
            {isOversold && (
              <span style={{ fontSize: '11px', fontWeight: 900, textTransform: 'uppercase', padding: '3px 8px', borderRadius: '6px', background: '#7f1d1d', color: '#fee2e2', border: '1px solid #ef4444' }}>
                Paid but oversold
              </span>
            )}
            {isOnTheWay && (
              <span style={{ fontSize: '11px', fontWeight: 800, textTransform: 'uppercase', padding: '3px 8px', borderRadius: '6px', background: 'rgba(139, 92, 246, 0.25)', color: '#c4b5fd', border: '1px solid #8b5cf6' }}>
                🚗 Out For Delivery
              </span>
            )}
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button type="button" onClick={() => onAssign(order)} title="Assign station or cook" style={{ background: 'rgba(59,130,246,.12)', border: '1px solid rgba(59,130,246,.35)', color: '#93c5fd', height: '30px', padding: '0 9px', borderRadius: '7px', display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '11px', fontWeight: 800 }}>
              <ChefHat size={13} />
              <span>{order.kdsAssignment?.assignee || order.kdsAssignment?.station || 'Assign'}</span>
            </button>
            {isDelivery && (
              <button type="button" onClick={() => onAssignDriver(order)} title="Assign delivery driver" style={{ background: 'rgba(16,185,129,.12)', border: '1px solid rgba(16,185,129,.35)', color: '#6ee7b7', height: '30px', padding: '0 9px', borderRadius: '7px', display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '11px', fontWeight: 800 }}>
                <Truck size={13} />
                <span>{order.kdsDriver?.name || 'Driver'}</span>
              </button>
            )}
            <button type="button" onClick={onPrint} title="Print 80mm Kitchen Packing Slip / KOT" style={{ background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.18)', color: '#f1f5f9', height: '30px', padding: '0 9px', borderRadius: '7px', display: 'inline-flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '12px', fontWeight: 700 }}>
              <Printer size={13} />
              <span>Print</span>
            </button>
            <div style={{ background: timerBg, color: timerColor, height: '30px', padding: '0 9px', borderRadius: '7px', fontSize: '14px', fontWeight: 900, fontFamily: 'monospace', display: 'inline-flex', alignItems: 'center', gap: '5px' }}>
              <Clock size={13} />
              <span>{elapsed}</span>
            </div>
          </div>
        </div>

        <StageStepper status={order.status} fulfilment={order.fulfilment} />

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
          <div style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span>{order.customer?.name || 'Walk-in Guest'}</span>
            {order.customer?.phone && <span style={{ color: '#cbd5e1' }}>• {order.customer.phone}</span>}
            {stageInfo.level !== 'ok' && (
              <span style={{ color: slaColor, fontWeight: 800, fontSize: '11px', textTransform: 'uppercase', letterSpacing: '0.3px' }}>
                • {stageInfo.label} {stageMinutes}m{stageInfo.level === 'breach' ? ' ⚠ SLA' : ''}
              </span>
            )}
          </div>
          {order.isScheduled && order.scheduledAt && (
            <span style={{ fontSize: '11px', fontWeight: 700, color: '#f59e0b', flexShrink: 0 }}>
              📅 {new Date(order.scheduledAt).toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}
            </span>
          )}
        </div>
      </div>

      {isDelivery && order.customer?.address && (
        <div style={{ background: 'rgba(139, 92, 246, 0.1)', borderLeft: '4px solid #8b5cf6', padding: '8px 16px', fontSize: '12px', color: '#f1f5f9', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Truck size={15} color="#a78bfa" style={{ flexShrink: 0 }} />
          <div style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            <strong style={{ color: '#a78bfa', textTransform: 'uppercase', fontSize: '10px', letterSpacing: '0.5px', marginRight: '6px' }}>Address:</strong>
            <span>{order.customer.address}{order.customer.postcode ? `, ${order.customer.postcode}` : ''}</span>
          </div>
        </div>
      )}

      {order.customer?.note && (
        <div style={{ background: 'rgba(245, 158, 11, 0.1)', borderLeft: '4px solid #f59e0b', padding: '10px 16px', fontSize: '13px', color: '#fef3c7', display: 'flex', alignItems: 'flex-start', gap: '8px' }}>
          <Flame size={16} color="#f59e0b" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ color: '#f59e0b', textTransform: 'uppercase', fontSize: '11px', letterSpacing: '0.5px' }}>Chef Instruction:</strong>
            <div style={{ fontStyle: 'italic', marginTop: '2px' }}>&quot;{order.customer.note}&quot;</div>
          </div>
        </div>
      )}

      <div style={{ padding: '16px 18px', display: 'flex', flexDirection: 'column', gap: '12px', flex: 1, minHeight: '140px' }}>
        {displayLines.map((line) => {
          const isChecked = Boolean(checkedItems[`${order.id}-${line.lineIndex}`]);
          return (
            <div
              key={line.lineIndex}
              onClick={() => onToggleItem(order.id, line.lineIndex)}
              style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', cursor: 'pointer', padding: '8px 10px', borderRadius: '8px', background: isChecked ? 'rgba(255,255,255,0.02)' : 'rgba(255,255,255,0.05)', opacity: isChecked ? 0.45 : 1, transition: 'all 0.15s ease' }}
            >
              <div style={{ width: '24px', height: '24px', borderRadius: '6px', border: `2px solid ${isChecked ? '#10b981' : '#f0d080'}`, background: isChecked ? '#10b981' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: '2px' }}>
                {isChecked && <Check size={16} color="#000" strokeWidth={3} />}
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
                  <span style={{ background: 'linear-gradient(135deg, #f0d080 0%, #c9a84c 100%)', color: '#000', fontWeight: 900, fontSize: '14px', padding: '1px 6px', borderRadius: '4px' }}>
                    {line.qty}x
                  </span>
                  <span style={{ fontSize: '16px', fontWeight: 800, color: isChecked ? '#aaa' : '#fff', textDecoration: isChecked ? 'line-through' : 'none' }}>
                    {line.name}
                  </span>
                </div>

                {line.station && (
                  <span style={{ display: 'inline-block', marginTop: '5px', padding: '2px 7px', borderRadius: '999px', background: '#25253a', color: '#93c5fd', fontSize: '10px', fontWeight: 900, textTransform: 'uppercase' }}>
                    {line.station}
                  </span>
                )}

                {line.options && (
                  <div style={{ fontSize: '13px', color: '#f0d080', marginTop: '4px', paddingLeft: '4px' }}>• {line.options}</div>
                )}

                {line.note && (
                  <div style={{ fontSize: '12px', color: '#f59e0b', fontStyle: 'italic', marginTop: '2px', paddingLeft: '4px' }}>Note: {line.note}</div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ padding: '14px 18px', background: '#0d0d14', borderTop: '1px solid rgba(255,255,255,0.08)', display: 'flex', alignItems: 'center', gap: '10px' }}>
        {['PREPARING', 'READY', 'ON_THE_WAY'].includes(order.status) && (
          <button
            type="button"
            onClick={() => onUpdateStatus(order, prevStatus)}
            disabled={isProcessing}
            title="Revert back one step"
            style={{ width: '44px', height: '46px', borderRadius: '10px', background: '#1a1a24', border: '1px solid #333', color: '#aaa', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <Undo2 size={18} />
          </button>
        )}

        {isWaiting && (
          <button
            type="button"
            disabled={isProcessing}
            title="Cancel order with a reason"
            onClick={() => {
              const choice = window.prompt(`Select cancellation reason:\n${CANCELLATION_REASONS.map((reason, index) => `${index + 1}. ${reason}`).join('\n')}`, '1');
              const index = Number(choice) - 1;
              if (Number.isInteger(index) && CANCELLATION_REASONS[index]) {
                onUpdateStatus(order, 'CANCELLED', { reason: CANCELLATION_REASONS[index] });
              }
            }}
            style={{ width: '44px', height: '46px', borderRadius: '10px', background: '#3a1c22', border: '1px solid #7f1d1d', color: '#fca5a5', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        )}

        {isWaiting && (
          <button
            type="button"
            onClick={() => onUpdateStatus(order, 'PREPARING')}
            disabled={isProcessing}
            style={{ flex: 1, height: '48px', borderRadius: '10px', background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)', border: 'none', color: '#000', fontSize: '15px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(245, 158, 11, 0.4)' }}
          >
            <Flame size={18} />
            <span>{isProcessing ? 'UPDATING...' : 'START COOKING'}</span>
          </button>
        )}

        {isCooking && (
          <button
            type="button"
            onClick={() => onUpdateStatus(order, 'READY')}
            disabled={isProcessing}
            style={{ flex: 1, height: '48px', borderRadius: '10px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', color: '#fff', fontSize: '15px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)' }}
          >
            <CheckCircle2 size={20} />
            <span>{isProcessing ? 'UPDATING...' : 'MARK READY (PACKED)'}</span>
          </button>
        )}

        {isReady && isDelivery && (
          <button
            type="button"
            onClick={() => onUpdateStatus(order, 'ON_THE_WAY')}
            disabled={isProcessing}
            style={{ flex: 1, height: '48px', borderRadius: '10px', background: 'linear-gradient(135deg, #8b5cf6 0%, #6d28d9 100%)', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(139, 92, 246, 0.4)' }}
          >
            <Truck size={20} />
            <span>{isProcessing ? 'UPDATING...' : 'OUT FOR DELIVERY (HANDOVER) 🚗'}</span>
          </button>
        )}

        {isReady && !isDelivery && (
          <button
            type="button"
            onClick={() => onUpdateStatus(order, 'COMPLETED')}
            disabled={isProcessing}
            style={{ flex: 1, height: '48px', borderRadius: '10px', background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)', border: 'none', color: '#fff', fontSize: '15px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(59, 130, 246, 0.4)' }}
          >
            <PackageCheck size={20} />
            <span>{isProcessing ? 'UPDATING...' : isDineIn ? 'SERVED TO TABLE (DONE)' : 'PICKED UP / BUMP (DONE)'}</span>
          </button>
        )}

        {isOnTheWay && (
          <button
            type="button"
            onClick={() => onUpdateStatus(order, 'DELIVERED')}
            disabled={isProcessing}
            style={{ flex: 1, height: '48px', borderRadius: '10px', background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', border: 'none', color: '#fff', fontSize: '14px', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.5px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 16px rgba(16, 185, 129, 0.4)' }}
          >
            <CheckCircle2 size={20} />
            <span>{isProcessing ? 'UPDATING...' : 'MARK DELIVERED (COMPLETE)'}</span>
          </button>
        )}
      </div>
    </div>
  );
}

function PrintableReceipt({ order }) {
  return (
    <div id="thermal-receipt-container">
      <div style={{ textAlign: 'center', marginBottom: '8px' }}>
        <h2 style={{ margin: 0, fontSize: '18px', fontWeight: '900', textTransform: 'uppercase' }}>PREVA KITCHEN</h2>
        <p style={{ margin: '2px 0', fontSize: '11px' }}>13090 Inkster Rd, Redford MI</p>
        <p style={{ margin: '2px 0', fontSize: '11px' }}>Tel: (313) 541-7000 • prevakitchen.com</p>
        <div style={{ borderBottom: '2px dashed #000', margin: '8px 0' }} />
      </div>

      <div style={{ marginBottom: '8px', fontSize: '12px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '900' }}>
          <span>ORDER #{order.orderNumber}</span>
          <span>{order.fulfilment || 'PICKUP'}</span>
        </div>
        <div style={{ fontSize: '11px', marginTop: '2px' }}>
          Time: {new Date(order.createdAt).toLocaleTimeString()} · {new Date(order.createdAt).toLocaleDateString()}
        </div>
        {order.isScheduled && (
          <div style={{ fontSize: '11px', fontWeight: 'bold', marginTop: '2px' }}>SCHEDULED FOR: {order.scheduledAt}</div>
        )}
        <div style={{ borderBottom: '1px solid #000', margin: '6px 0' }} />
      </div>

      <div style={{ marginBottom: '8px', fontSize: '12px' }}>
        <div><strong>Customer:</strong> {order.customer?.name || 'Walk-in Guest'}</div>
        <div><strong>Phone:</strong> {order.customer?.phone || 'N/A'}</div>
        {order.fulfilment === 'DELIVERY' && (
          <div style={{ marginTop: '2px' }}>
            <strong>Delivery To:</strong> {order.customer?.address || ''} {order.customer?.postcode || ''}
          </div>
        )}
        <div style={{ borderBottom: '2px dashed #000', margin: '8px 0' }} />
      </div>

      <div style={{ marginBottom: '8px' }}>
        <div style={{ fontWeight: 'bold', fontSize: '12px', marginBottom: '4px' }}>ITEMS ({order.lines?.length || 0}):</div>
        {(order.lines || []).map((line, lIdx) => (
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

      {order.customer?.note && (
        <div style={{ marginBottom: '8px', fontSize: '11px', background: '#eee', padding: '4px' }}>
          <strong>KITCHEN NOTE:</strong> {order.customer.note}
          <div style={{ borderBottom: '1px solid #000', margin: '6px 0' }} />
        </div>
      )}

      <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '11px' }}>
        <div style={{ fontWeight: 'bold' }}>*** KITCHEN PACKING SLIP ***</div>
        <div style={{ marginTop: '4px' }}>Thank you for dining with Preva Kitchen!</div>
      </div>
    </div>
  );
}
