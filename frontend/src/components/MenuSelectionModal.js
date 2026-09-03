"use client";

import { useState, useEffect } from 'react';
import SvgIcon from './SvgIcon';

export default function MenuSelectionModal({ isOpen, onClose }) {
  const [zoom, setZoom] = useState(100);

  useEffect(() => {
    if (!isOpen) {
      setZoom(100);
      return;
    }

    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };

    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      document.body.style.overflow = '';
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleZoomIn = () => setZoom((z) => Math.min(z + 25, 200));
  const handleZoomOut = () => setZoom((z) => Math.max(z - 25, 75));
  const handleZoomReset = () => setZoom(100);

  return (
    <div
      className="preva-selection-modal-backdrop"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="Preva Kitchen Menu"
    >
      <div
        className="preva-selection-modal-card"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Toolbar */}
        <div className="preva-selection-modal-bar">
          <div className="preva-selection-modal-title">
            <span className="preva-selection-tag">PREVA KITCHEN & LOUNGE</span>
            <h2>Dine-In & Takeout Menu</h2>
          </div>

          <div className="preva-selection-modal-actions">
            <div className="preva-selection-zoom-controls">
              <button
                type="button"
                onClick={handleZoomOut}
                disabled={zoom <= 75}
                title="Zoom Out"
                aria-label="Zoom Out"
                className="preva-zoom-btn"
              >
                −
              </button>
              <span className="preva-zoom-val">{zoom}%</span>
              <button
                type="button"
                onClick={handleZoomIn}
                disabled={zoom >= 200}
                title="Zoom In"
                aria-label="Zoom In"
                className="preva-zoom-btn"
              >
                +
              </button>
              {zoom !== 100 && (
                <button
                  type="button"
                  onClick={handleZoomReset}
                  className="preva-zoom-reset"
                  title="Reset Zoom"
                >
                  Reset
                </button>
              )}
            </div>

            <a
              href="/asset/preva-menu-card.jpg"
              download="Preva-Kitchen-Menu.jpg"
              className="preva-modal-download-btn"
              title="Download Menu"
            >
              <SvgIcon name="download" size={16} />
              <span>Download</span>
            </a>

            <button
              type="button"
              className="preva-selection-modal-close"
              onClick={onClose}
              aria-label="Close menu"
              title="Close (Esc)"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Modal Content / Scrollable Image View */}
        <div className="preva-selection-modal-viewer">
          <div
            className="preva-selection-image-wrap"
            style={{ width: `${zoom}%`, transition: 'width 0.2s ease' }}
          >
            <img
              src="/asset/preva-menu-card.jpg"
              alt="Preva Kitchen and Lounge Menu — Our Selection"
              className="preva-selection-image"
              loading="eager"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
