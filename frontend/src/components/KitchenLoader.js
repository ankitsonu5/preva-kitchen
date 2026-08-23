import React from 'react';

export default function KitchenLoader({ text = "Setting the table…" }) {
  return (
    <div className="preva-cloche-inline-loader">
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
            <div className="tagline">{text}</div>
          </div>
          <div className="bar">
            <span></span>
          </div>
        </div>
      </div>

      <style>{`
        .preva-cloche-inline-loader {
          display: flex;
          align-items: center;
          justify-content: center;
          padding: 60px 20px;
          width: 100%;
          font-family: 'Inter', sans-serif;
        }

        .preva-cloche-inline-loader .loader {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 28px;
        }

        .preva-cloche-inline-loader .scene {
          position: relative;
          width: 160px;
          height: 130px;
        }

        .preva-cloche-inline-loader .plate {
          position: absolute;
          bottom: 12px;
          left: 50%;
          transform: translateX(-50%);
          width: 130px;
          height: 22px;
          border-radius: 50%;
          background: linear-gradient(180deg, #2a2318, #17130c);
          border: 1px solid rgba(198, 161, 91, 0.35);
          box-shadow: 0 6px 18px rgba(0, 0, 0, 0.5);
        }

        .preva-cloche-inline-loader .plate::after {
          content: '';
          position: absolute;
          inset: 4px 14px;
          border-radius: 50%;
          border: 1px solid rgba(198, 161, 91, 0.18);
        }

        .preva-cloche-inline-loader .cloche-group {
          position: absolute;
          bottom: 18px;
          left: 50%;
          transform: translateX(-50%);
          animation: inlineClocheLift 2.6s cubic-bezier(0.45, 0, 0.2, 1) infinite;
        }

        .preva-cloche-inline-loader .cloche {
          width: 104px;
          height: 60px;
          border-radius: 104px 104px 6px 6px;
          background: linear-gradient(160deg, #3a3120, #17140c);
          border: 1px solid rgba(198, 161, 91, 0.4);
          box-shadow: 0 10px 20px rgba(0, 0, 0, 0.4);
          position: relative;
        }

        .preva-cloche-inline-loader .cloche::before {
          content: '';
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%);
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #e2c78f;
        }

        .preva-cloche-inline-loader .cloche::after {
          content: '';
          position: absolute;
          bottom: 0;
          left: 0;
          right: 0;
          height: 7px;
          background: linear-gradient(180deg, transparent, rgba(198, 161, 91, 0.25));
          border-radius: 0 0 6px 6px;
        }

        @keyframes inlineClocheLift {
          0%, 18% { transform: translateX(-50%) translateY(0); }
          38%, 62% { transform: translateX(-50%) translateY(-32px); }
          82%, 100% { transform: translateX(-50%) translateY(0); }
        }

        .preva-cloche-inline-loader .steam {
          position: absolute;
          bottom: 48px;
          left: 50%;
          transform: translateX(-50%);
          display: flex;
          gap: 10px;
          opacity: 0;
          animation: inlineSteamVisibility 2.6s ease-in-out infinite;
        }

        .preva-cloche-inline-loader .steam span {
          width: 3px;
          height: 22px;
          border-radius: 3px;
          background: linear-gradient(180deg, rgba(226, 199, 143, 0.55), transparent);
          animation: inlineSteamRise 1.3s ease-in-out infinite;
        }

        .preva-cloche-inline-loader .steam span:nth-child(1) { animation-delay: 0s; }
        .preva-cloche-inline-loader .steam span:nth-child(2) { animation-delay: 0.2s; height: 28px; }
        .preva-cloche-inline-loader .steam span:nth-child(3) { animation-delay: 0.4s; }

        @keyframes inlineSteamVisibility {
          0%, 16% { opacity: 0; }
          30%, 68% { opacity: 1; }
          82%, 100% { opacity: 0; }
        }

        @keyframes inlineSteamRise {
          0% { transform: translateY(0) scaleY(1); opacity: 0.7; }
          100% { transform: translateY(-18px) scaleY(1.3); opacity: 0; }
        }

        .preva-cloche-inline-loader .wordmark {
          font-family: 'Cormorant Garamond', Georgia, serif;
          font-size: 22px;
          font-weight: 700;
          letter-spacing: 0.24em;
          color: #f4ede0;
          text-transform: uppercase;
          text-align: center;
        }

        .preva-cloche-inline-loader .tagline {
          font-size: 11px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          color: #8a7d68;
          margin-top: 2px;
          text-align: center;
        }

        .preva-cloche-inline-loader .bar {
          width: 140px;
          height: 2px;
          background: rgba(198, 161, 91, 0.15);
          border-radius: 2px;
          overflow: hidden;
          position: relative;
        }

        .preva-cloche-inline-loader .bar span {
          position: absolute;
          top: 0;
          left: 0;
          height: 100%;
          width: 40%;
          background: linear-gradient(90deg, transparent, #e2c78f, transparent);
          animation: inlineBarSweep 1.6s ease-in-out infinite;
        }

        @keyframes inlineBarSweep {
          0% { left: -40%; }
          100% { left: 100%; }
        }
      `}</style>
    </div>
  );
}
