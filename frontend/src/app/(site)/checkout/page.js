import { cmsFetch } from '@/lib/cms';
import { ShopProvider } from '@/components/shop/ShopProvider';
import CheckoutForm from '@/components/shop/CheckoutForm';

export const dynamic = 'force-dynamic';

export const metadata = { title: 'Your Cart — Preva Kitchen', robots: 'noindex' };

export default async function CheckoutPage({ searchParams }) {
  const query = await searchParams;
  const cancelledOrderNumber = /^\d+$/.test(String(query?.cancelled || ''))
    ? String(query.cancelled)
    : '';
  const settings = (await cmsFetch('/shop/settings')) || {
    pickupEnabled: true,
    deliveryEnabled: true,
    pickupMinutes: 25,
    deliveryMinutes: 45,
    tipPresets: [15, 18, 20]
  };

  return (
    <ShopProvider>
      <div className="ps">
        <div className="ps-wrap">
          <section className="ps-sec ps-sec--tight">
            <span className="ps-kicker">Preva Kitchen</span>
            <h1 className="ps-h1" style={{ fontSize: 'clamp(26px, 3vw, 38px)' }}>Your Cart</h1>
          </section>
          <div style={{ paddingBottom: 80 }}>
            <CheckoutForm settings={settings} cancelledOrderNumber={cancelledOrderNumber} />
          </div>
        </div>
      </div>
    </ShopProvider>
  );
}
