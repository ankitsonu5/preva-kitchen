import { NextResponse } from 'next/server';
import { sendCareerEmail } from '@/lib/nodemailer';

function generateReferenceId() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `APP-${id}`;
}

const ALLOWED_MIME_TYPES = new Set([
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/octet-stream'
]);

export async function POST(request) {
  try {
    const body = await request.json().catch(() => ({}));

    // 1. Honeypot check: silent 200 for spam bots
    if (body.hp_field) {
      console.warn('[career-applications] Bot trapped via honeypot field.');
      return NextResponse.json({ ok: true, referenceId: 'APP-PROCESSED' }, { status: 200 });
    }

    // 2. Validation
    const firstName = String(body.firstName || '').trim();
    const lastName = String(body.lastName || '').trim();
    const email = String(body.email || '').trim().toLowerCase();
    const phone = String(body.phone || '').trim();
    const role = String(body.role || '').trim();
    const availability = String(body.availability || '').trim();
    const startDate = String(body.startDate || '').trim();
    const message = String(body.message || '').trim();
    const consent = body.consent === true;
    const pageUrl = String(body.pageUrl || '').trim();

    if (!firstName || !lastName || !email || !phone || !role || !availability) {
      return NextResponse.json(
        { message: 'Please complete all required fields (Name, Email, Phone, Role, and Availability).' },
        { status: 400 }
      );
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json(
        { message: 'Please provide a valid email address.' },
        { status: 400 }
      );
    }

    if (!consent) {
      return NextResponse.json(
        { message: 'You must agree to the contact consent to submit your application.' },
        { status: 400 }
      );
    }

    // 3. Resume validation
    let resume = null;
    if (body.resume) {
      const name = String(body.resume.name || '').trim();
      const type = String(body.resume.type || '').toLowerCase();
      const size = Number(body.resume.size) || 0;
      const data = String(body.resume.data || '');

      // Max 3MB
      if (size > 3 * 1024 * 1024) {
        return NextResponse.json(
          { message: 'Résumé file must be 3 MB or smaller.' },
          { status: 400 }
        );
      }

      const hasValidExt = /\.(pdf|doc|docx)$/i.test(name);
      if (!name || (!ALLOWED_MIME_TYPES.has(type) && !hasValidExt)) {
        return NextResponse.json(
          { message: 'Please upload your résumé in PDF, DOC, or DOCX format.' },
          { status: 400 }
        );
      }

      if (!data.startsWith('data:')) {
        return NextResponse.json(
          { message: 'Invalid résumé upload data.' },
          { status: 400 }
        );
      }

      resume = { name, type, size, data };
    } else {
      return NextResponse.json(
        { message: 'Please upload your résumé / CV to complete your application.' },
        { status: 400 }
      );
    }

    const referenceId = generateReferenceId();
    const submittedAt = new Date();

    const applicationData = {
      referenceId,
      firstName,
      lastName,
      email,
      phone,
      role,
      position: role === 'general-application' ? 'General Application' : role.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()),
      availability,
      startDate,
      message,
      resume,
      pageUrl,
      submittedAt
    };

    // 4. Send email via Nodemailer SMTP to CAREER_EMAIL (donnaw@prevaclub.com) with resume attached
    await sendCareerEmail(applicationData);

    // 5. Synchronize with backend MongoDB storage if available (for Admin career applications)
    const backendUrl = (process.env.BACKEND_URL || 'http://localhost:4000').replace(/\/$/, '');
    if (backendUrl) {
      fetch(`${backendUrl}/api/career-applications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-internal-forward': 'true' },
        body: JSON.stringify({ ...body, referenceId, skipEmail: true })
      }).catch((backendErr) => {
        console.warn('[career-applications] Backend DB sync notice:', backendErr.message);
      });
    }

    return NextResponse.json({ ok: true, referenceId }, { status: 201 });
  } catch (error) {
    console.error('[career-applications] Error processing career application:', error);
    return NextResponse.json(
      { message: error.message || 'We could not submit your application. Please try again.' },
      { status: 500 }
    );
  }
}
