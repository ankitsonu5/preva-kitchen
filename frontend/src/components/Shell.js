"use client";

import { useEffect, useState } from 'react';
import Header from './Header';
import Footer from './Footer';
import OrderOnlineModal from './OrderOnlineModal';
import LenisProvider from './LenisProvider';
import LuxeReveal from './LuxeReveal';
import ActiveOrderFloatingBar from './ActiveOrderFloatingBar';

export default function Shell({ children }) {
  const [isOrderOpen, setIsOrderOpen] = useState(false);

  useEffect(() => {
    window.openOrderModal = () => setIsOrderOpen(true);
    window.openMenuModal = () => { window.location.href = '/preva-kitchen-menu'; };
    return () => {
      delete window.openOrderModal;
      delete window.openMenuModal;
    };
  }, []);

  useEffect(() => {
    if (!isOrderOpen) return undefined;
    document.body.style.overflow = 'hidden';
    window.lenis?.stop();
    return () => {
      document.body.style.overflow = '';
      window.lenis?.start();
    };
  }, [isOrderOpen]);

  return (
    <LenisProvider>
      <LuxeReveal />
      <div className="site-shell">
        <Header />
        <main className="site-main">{children}</main>
        <Footer />
        <OrderOnlineModal open={isOrderOpen} onClose={() => setIsOrderOpen(false)} />
      </div>
    </LenisProvider>
  );
}
