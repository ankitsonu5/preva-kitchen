import { NextResponse } from 'next/server';
import { sendReservationEmail } from '@/lib/nodemailer';

function generateReferenceId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `RES-${id}`;
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    // 1. Honeypot check: silent 200 for spam bots
    if (body.hp_field) {
      console.warn('[reservations] Bot trapped via honeypot field.');
      return NextResponse.json({ ok: true, referenceId: 'RES-PROCESSED' }, { status: 200 });
    }

    // 2. Validation
    const name = String(body.name || body.fullName || '').trim();
    const phone = String(body.phone || body.mobile || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    let date = String(body.date || '').trim();
    let time = String(body.time || '').trim();

    if ((!date || !time) && body.reservationDate) {
      const parts = String(body.reservationDate).split('T');
      if (!date && parts[0]) date = parts[0];
      if (!time && parts[1]) time = parts[1].replace(/:\d{2}$/, ''); // trim trailing seconds if present
    }

    const guests = Number(body.guests) || 2;
    const occasion = String(body.occasion || '').trim();
    const notes = String(body.notes || '').trim();
    const pageUrl = String(body.pageUrl || '').trim();

    if (!name || !phone || !email) {
      return NextResponse.json(
        { message: 'Please provide your full name, phone number, and email address.' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { message: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    if (!date || !time) {
      return NextResponse.json(
        { message: 'Please select your preferred reservation date and time.' },
        { status: 400 }
      );
    }

    if (guests < 1 || guests > 30) {
      return NextResponse.json(
        { message: 'Party size must be between 1 and 30 guests.' },
        { status: 400 }
      );
    }

    const referenceId = generateReferenceId();
    const submittedAt = new Date();

    const reservationData = {
      referenceId,
      name,
      phone,
      email,
      date,
      time,
      guests,
      occasion,
      notes,
      pageUrl,
      submittedAt
    };

    // 3 & 4. Concurrent DB sync & Email dispatch for instant UI response
    const backendUrl = process.env.BACKEND_URL;
    const isDev = process.env.NODE_ENV !== 'production';
    const shouldSyncBackend = Boolean(backendUrl && (isDev || !backendUrl.includes('localhost')));

    const dbSyncPromise = shouldSyncBackend
      ? fetch(`${backendUrl.replace(/\/$/, '')}/api/reservations`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-internal-forward': 'true' },
          body: JSON.stringify({ ...body, referenceId, skipEmail: true }),
          signal: AbortSignal.timeout(3000)
        }).catch((backendErr) => {
          console.warn('[reservations] Backend DB sync notice:', backendErr.message);
        })
      : Promise.resolve();

    const emailPromise = sendReservationEmail(reservationData).catch((emailErr) => {
      console.warn('[reservations] Email dispatch notice:', emailErr.message);
    });

    await Promise.allSettled([dbSyncPromise, emailPromise]);

    return NextResponse.json({ ok: true, referenceId }, { status: 200 });
  } catch (error) {
    console.error('[reservations] Error processing reservation:', error);
    return NextResponse.json(
      { message: error.message || 'We could not process your reservation. Please call (313) 286-3586.' },
      { status: 500 }
    );
  }
}
