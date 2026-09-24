import { NextResponse } from 'next/server';
import { sendContactEmail } from '@/lib/nodemailer';

function generateReferenceId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `CON-${id}`;
}

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    // 1. Honeypot check: silent 200 for spam bots
    if (body.hp_field) {
      console.warn('[contact] Bot trapped via honeypot field.');
      return NextResponse.json({ ok: true, referenceId: 'CON-PROCESSED' }, { status: 200 });
    }

    // 2. Validation
    const name = String(body.name || [body.firstName, body.lastName].filter(Boolean).join(' ') || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    const subject = String(body.subject || body.inquiry || 'General Inquiry').trim();
    const message = String(body.message || '').trim();
    const pageUrl = String(body.pageUrl || '').trim();

    if (!name || !email || !message) {
      return NextResponse.json(
        { message: 'Please provide your name, email address, and a message.' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { message: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    const referenceId = generateReferenceId();
    const submittedAt = new Date();

    const contactData = {
      referenceId,
      name,
      email,
      phone,
      subject,
      message,
      pageUrl,
      submittedAt
    };

    // 3 & 4. Concurrent DB sync & Email dispatch for instant UI response
    const backendUrl = (process.env.BACKEND_URL || 'http://localhost:4000').replace(/\/$/, '');
    const dbSyncPromise = backendUrl
      ? fetch(`${backendUrl}/api/contact`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'x-internal-forward': 'true' },
          body: JSON.stringify({ ...body, referenceId, skipEmail: true })
        }).catch((backendErr) => {
          console.warn('[contact] Backend DB sync notice:', backendErr.message);
        })
      : Promise.resolve();

    const emailPromise = sendContactEmail(contactData).catch((emailErr) => {
      console.warn('[contact] Email dispatch notice:', emailErr.message);
    });

    await Promise.allSettled([dbSyncPromise, emailPromise]);

    return NextResponse.json({ ok: true, referenceId }, { status: 200 });
  } catch (error) {
    console.error('[contact] Error processing contact inquiry:', error);
    return NextResponse.json(
      { message: error.message || 'We could not send your message. Please call (313) 286-3586.' },
      { status: 500 }
    );
  }
}
