"use client";

import { useState, useEffect, useRef } from 'react';
import { usePathname } from 'next/navigation';

export default function PageTransitionLoader() {
  const pathname = usePathname();
  const [loading, setLoading] = useState(true);
  const [fading, setFading] = useState(false);
  const timerRef = useRef(null);
  const fadeRef = useRef(null);

  // Trigger loader timer (1.5s display + 0.3s fade out = 1.8s total)
  const triggerLoader = () => {
    if (timerRef.current) clearTimeout(timerRef.current);
    if (fadeRef.current) clearTimeout(fadeRef.current);

    setLoading(true);
    setFading(false);

    fadeRef.current = setTimeout(() => {
      setFading(true);
    }, 1500);

    timerRef.current = setTimeout(() => {
      setLoading(false);
      setFading(false);
    }, 1800);
  };

  // Run loader on initial load and whenever pathname changes
  useEffect(() => {
    triggerLoader();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      if (fadeRef.current) clearTimeout(fadeRef.current);
    };
  }, [pathname]);

  // Handle internal link clicks safely without getting stuck
  useEffect(() => {
    const handleLinkClick = (e) => {
      const target = e.target.closest('a');
      if (target && target.href) {
        const href = target.getAttribute('href');
        // Only trigger for different valid internal pages (not anchors or current page)
        if (href && href.startsWith('/') && !href.startsWith('#') && href !== pathname) {
          triggerLoader();
        }
      }
    };

    document.addEventListener('click', handleLinkClick);
    return () => document.removeEventListener('click', handleLinkClick);
  }, [pathname]);

  if (!loading) return null;

  return (
    <div className={`preva-page-loader-overlay ${fading ? 'fade-out' : ''}`}>
      <div className="loader">
        <div className="scene">
          <div className="plate"></div>
          <div className="steam">
            <span></span>
            <span></span>
            <span></span>
          </div>
          <div className="cloche-group">
            <div className="cloche"></div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px' }}>
          <div>
            <div className="wordmark">Preva</div>
            <div className="tagline">Setting the table…</div>
          </div>
          <div className="bar">
            <span></span>
          </div>
        </div>
      </div>

      <style jsx global>{`
        .preva-page-loader-overlay {
          position: fixed;
          top: 0;
          left: 0;
          width: 100vw;
          height: 100vh;
          background: #0b0908;
          font-family: 'Inter', sans-serif;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          z-index: 999999;
          opacity: 1;
          pointer-events: all;
          transition: opacity 0.3s ease-in-out, visibility 0.3s ease-in-out;
        }

        .preva-page-loader-overlay.fade-out {
          opacity: 0;
          visibility: hidden;
          pointer-events: none;
        }

        .preva-page-loader-overlay .loader {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 34px;
        }

        /* ---- plate + cloche + steam ---- */
        .preva-page-loader-overlay .scene {
          position: relative;
          width: 180px;
          height: 150px;
        }

        .preva-page-loader-overlay .plate {
          position: absolute;
          bottom: 14px;
          left: 50%;
          transform: translateX(-50%);
          width: 150px;
          height: 26px;
          border-radius: 50%;
          background: linear-gradient(180deg, #2a2318, #17130c);
          border: 1px solid rgba(198, 161, 91, 0.35);
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5);
        }

        .preva-page-loader-overlay .plate::after {
          content: '';
          position: absolute;
          inset: 5px 18px;
          border-radius: 50%;
          border: 1px solid rgba(198, 161, 91, 0.18);
        }

        .preva-page-loader-overlay .cloche-group {
          position: absolute;
          bottom: 20px;
          left: 50%;
          transform: translateX(-50%);
          animation: clocheLiftAnim 1.8s cubic-bezier(0.45, 0, 0.2, 1) infinite;
        }

        .preva-page-loader-overlay .cloche {
          width: 120px;
          height: 70px;
          border-radius: 120px 120px 6px 6px;
          background: linear-gradient(160deg, #3a3120, #17140c);
          border: 1px solid rgba(198, 161, 91, 0.4);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.4);
          position: relative;
        }

        .preva-page-loader-overlay .cloche::before {
          content: '';
          position: absolute;
          top: -11px;
          left: 50%;
          transform: translateX(-50%);
          width: 14px;
          height: 14px;
          border-radius: 50%;
          background: #e2c78f;
        }

        .preva-page-loader-overlay .cloche::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 8px;
          background: linear-gradient(180deg, transparent, rgba(198, 161, 91, 0.25));
          border-radius: 0 0 6px 6px;
        }

        @keyframes clocheLiftAnim {
          0%, 18% { transform: translateX(-50%) translateY(0); }
          38%, 62% { transform: translateX(-50%) translateY(-38px); }
          82%, 100% { transform: translateX(-50%) translateY(0); }
        }

        /* steam only visible while cloche is lifted */
        .preva-page-loader-overlay .steam {
          position: absolute;
          bottom: 56px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 12px;
          opacity: 0;
          animation: steamVisibilityAnim 1.8s ease-in-out infinite;
        }

        .preva-page-loader-overlay .steam span {
          width: 3px;
          height: 26px;
          border-radius: 3px;
          background: linear-gradient(180deg, rgba(226, 199, 143, 0.55), transparent);
          animation: steamRiseAnim 1.1s ease-in-out infinite;
        }

        .preva-page-loader-overlay .steam span:nth-child(1) { animation-delay: 0s; }
        .preva-page-loader-overlay .steam span:nth-child(2) { animation-delay: 0.15s; height: 32px; }
        .preva-page-loader-overlay .steam span:nth-child(3) { animation-delay: 0.3s; }

        @keyframes steamVisibilityAnim {
          0%, 16% { opacity: 0; }
          30%, 68% { opacity: 1; }
          82%, 100% { opacity: 0; }
        }

        @keyframes steamRiseAnim {
          0% { transform: translateY(0) scaleY(1); opacity: 0.7; }
          100% { transform: translateY(-22px) scaleY(1.3); opacity: 0; }
        }

        /* ---- wordmark + copy ---- */
        .preva-page-loader-overlay .wordmark {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 26px;
          font-weight: 700;
          letter-spacing: 0.24em;
          color: #f4ede0;
          text-transform: uppercase;
          text-align: center;
        }

        .preva-page-loader-overlay .tagline {
          font-size: 12px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #8a7d68;
          margin-top: 2px;
          text-align: center;
        }

        /* ---- progress bar ---- */
        .preva-page-loader-overlay .bar {
          width: 160px;
          height: 2px;
          background: rgba(198, 161, 91, 0.15);
          border-radius: 2px;
          overflow: hidden;
          position: relative;
        }

        .preva-page-loader-overlay .bar span {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          width: 40%;
          background: linear-gradient(90deg, transparent, #e2c78f, transparent);
          animation: barSweepAnim 1.4s ease-in-out infinite;
        }

        @keyframes barSweepAnim {
          0% { left: -40%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}
