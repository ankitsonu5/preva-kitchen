import 'server-only';
import nodemailer from 'nodemailer';

/* ══════════════════════════════════════════════════════════════════════════
   Preva Kitchen - Nodemailer SMTP Email Service
   ══════════════════════════════════════════════════════════════════════════ */

const BRAND_NAME = 'Preva Kitchen';
const BRAND_ADDRESS = '13090 Inkster Rd, Redford Township, MI 48239';
const BRAND_PHONE = '(313) 286-3586';
const BRAND_GOLD = '#C9A96E';

export function getSmtpConfig() {
  const host = String(process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = Number(process.env.SMTP_PORT) || 465;
  const secure = process.env.SMTP_SECURE !== undefined
    ? String(process.env.SMTP_SECURE).toLowerCase() === 'true'
    : port === 465;
  const user = String(process.env.SMTP_USER || process.env.GMAIL_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '').trim();

  return { host, port, secure, user, pass };
}

export function isSmtpConfigured() {
  const { user, pass } = getSmtpConfig();
  return Boolean(user && pass);
}

export function getFromAddress() {
  const configured = String(process.env.FROM_EMAIL || '').trim();
  if (configured) return configured;
  const { user } = getSmtpConfig();
  if (user) return `Preva Kitchen <${user}>`;
  return 'Preva Kitchen <info@prevakitchen.com>';
}

export function getReservationRecipient() {
  return String(process.env.RESERVATION_EMAIL || 'reservations@prevakitchen.com').trim();
}

export function getContactRecipient() {
  return String(process.env.CONTACT_EMAIL || 'info@prevakitchen.com').trim();
}

export function getCareerRecipient() {
  return String(process.env.CAREER_EMAIL || 'donnaw@prevaclub.com').trim();
}

export function getSiteUrl() {
  return String(process.env.NEXT_PUBLIC_SITE_URL || 'https://prevakitchen.com').replace(/\/$/, '').trim();
}

let _transporter = null;
let _cachedKey = null;

export function getTransporter() {
  const { host, port, secure, user, pass } = getSmtpConfig();
  const key = `${host}:${port}:${secure}:${user}:${pass}`;

  if (!_transporter || _cachedKey !== key) {
    _cachedKey = key;
    _transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: user && pass ? { user, pass } : undefined,
      pool: true,
      maxConnections: 3,
      maxMessages: 100,
      rateDelta: 1000,
      rateLimit: 5
    });
  }
  return _transporter;
}

/**
 * Checks whether an email belongs to restaurant staff or admin inboxes.
 * Ensures customer confirmation receipts are NEVER sent to the restaurant admin.
 */
export function isStaffEmail(email) {
  if (!email) return false;
  const clean = String(email).trim().toLowerCase();
  const staffAddresses = [
    getReservationRecipient().toLowerCase(),
    getContactRecipient().toLowerCase(),
    getCareerRecipient().toLowerCase(),
    'reservations@prevakitchen.com',
    'info@prevakitchen.com',
    'donnaw@prevaclub.com',
    'admin@prevakitchen.com'
  ];
  return staffAddresses.includes(clean) || clean.endsWith('@prevakitchen.com') || clean.endsWith('@prevaclub.com');
}

function escapeHtml(value) {
  if (value === null || value === undefined) return '';
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function row(label, value, isHtml = false, isLast = false) {
  if (value === null || value === undefined || String(value).trim() === '') return '';
  const display = isHtml ? value : escapeHtml(value);
  const isReference = /reference/i.test(label);
  const isEmail = /email/i.test(label) && !isHtml;
  const isPhone = /phone/i.test(label) && !isHtml;
  const isMessage = /message|notes|cover/i.test(label);

  let formattedValue = display;
  if (isReference) {
    formattedValue = `<span style="display:inline-block;background:#241C0E;color:#F5D899;border:1px solid #5C441E;padding:4px 10px;border-radius:4px;font-weight:700;font-family:Consolas,monospace;font-size:12px;letter-spacing:0.8px;">${display}</span>`;
  } else if (isEmail) {
    formattedValue = `<a href="mailto:${display}" style="color:#E8C57A;text-decoration:none;font-weight:600;border-bottom:1px dotted #E8C57A;">${display}</a>`;
  } else if (isPhone) {
    formattedValue = `<a href="tel:${display}" style="color:#E8C57A;text-decoration:none;font-weight:600;">${display}</a>`;
  } else if (isMessage && !isHtml) {
    formattedValue = `<div style="background:#13100B;border:1px solid #2B2113;border-radius:6px;padding:12px 14px;color:#F5EFE6;font-size:13px;line-height:1.6;">${display}</div>`;
  }

  const borderBottom = isLast ? 'none' : '1px solid #1C1710';

  return `
    <tr>
      <td style="padding:14px 16px 14px 0;color:#9E8E75;font-size:11px;font-weight:700;letter-spacing:1px;text-transform:uppercase;white-space:nowrap;vertical-align:top;border-bottom:${borderBottom};width:28%;">${escapeHtml(label)}</td>
      <td style="padding:14px 0;color:#FFFFFF;font-size:14px;font-weight:500;line-height:1.5;vertical-align:top;border-bottom:${borderBottom};">${formattedValue}</td>
    </tr>`;
}

function wrapEmail({ title, subtitle, referenceId, badgeText = 'Website Notification', tableRows, footerNote = 'Reply directly to contact the submitter' }) {
  const siteUrl = getSiteUrl();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #070708; }
    @media only screen and (max-width: 640px) {
      .email-container { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; }
      .content-cell { padding: 18px 18px !important; }
      .header-cell { padding: 18px 18px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#070708;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#070708;width:100%;padding:28px 12px;table-layout:fixed;">
    <tr>
      <td align="center" valign="top">
        <table role="presentation" class="email-container" width="100%" cellpadding="0" cellspacing="0" style="max-width:660px;margin:0 auto;background:#12110F;border-radius:14px;border:1px solid #362918;box-shadow:0 16px 48px rgba(0,0,0,0.85);overflow:hidden;">
          <tr>
            <td height="4" style="background:linear-gradient(90deg, #8A641E 0%, #F5D899 50%, #8A641E 100%);font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td class="header-cell" style="background:linear-gradient(180deg, #1C1710 0%, #13100B 100%);padding:22px 28px;border-bottom:1px solid #2B2113;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left" valign="middle">
                    <span style="color:#F5D899;font-size:16px;font-weight:800;letter-spacing:5px;text-transform:uppercase;">PREVA</span>
                    <span style="color:#8A7B66;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin-left:8px;">KITCHEN &bull; REDFORD</span>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display:inline-block;padding:5px 12px;background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.32);border-radius:999px;color:#F3D58C;font-size:9.5px;font-weight:800;letter-spacing:1px;text-transform:uppercase;">
                      ${escapeHtml(badgeText)}
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="content-cell" style="padding:24px 28px 22px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
                <tr>
                  <td align="left" valign="middle">
                    <h1 style="margin:0;color:#FFFFFF;font-size:20px;font-weight:700;line-height:1.3;">${escapeHtml(title)}</h1>
                  </td>
                  ${referenceId ? `
                  <td align="right" valign="middle" style="white-space:nowrap;">
                    <span style="display:inline-block;background:#20190F;color:#F5D899;border:1px solid #5C451F;padding:4px 10px;border-radius:4px;font-weight:700;font-family:Consolas,monospace;font-size:11.5px;letter-spacing:0.8px;">${escapeHtml(referenceId)}</span>
                  </td>` : ''}
                </tr>
              </table>
              ${subtitle ? `<p style="margin:0 0 16px;color:#C9A96E;font-size:13.5px;line-height:1.4;font-weight:500;">${escapeHtml(subtitle)}</p>` : ''}

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#09090A;border:1px solid #231C12;border-radius:8px;overflow:hidden;">
                <tr>
                  <td style="padding:6px 18px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      ${tableRows}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#0B0907;padding:16px 24px;border-top:1px solid #1C160E;text-align:center;">
              <p style="margin:0 0 4px;color:#DFD5C3;font-size:11px;letter-spacing:2px;font-weight:700;text-transform:uppercase;">PREVA KITCHEN</p>
              <p style="margin:0;color:#786E5E;font-size:10px;line-height:1.5;">
                ${BRAND_ADDRESS} &bull; <a href="tel:3132863586" style="color:#C9A96E;text-decoration:none;">${BRAND_PHONE}</a> &bull; <a href="${escapeHtml(siteUrl)}" style="color:#C9A96E;text-decoration:none;">prevakitchen.com</a>
              </p>
              ${footerNote ? `<p style="margin:4px 0 0;color:#8A785E;font-size:9.5px;font-style:italic;">${escapeHtml(footerNote)}</p>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function wrapCustomerConfirmation({ heading, name, referenceId, introText, summaryRows, nextSteps }) {
  const siteUrl = getSiteUrl();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>${escapeHtml(heading)}</title>
  <style>
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #070708; }
    @media only screen and (max-width: 640px) {
      .email-container { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; }
      .content-cell { padding: 18px 18px !important; }
      .header-cell { padding: 18px 18px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#070708;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#070708;width:100%;padding:28px 12px;table-layout:fixed;">
    <tr>
      <td align="center" valign="top">
        <table role="presentation" class="email-container" width="100%" cellpadding="0" cellspacing="0" style="max-width:660px;margin:0 auto;background:#12110F;border-radius:14px;border:1px solid #362918;box-shadow:0 16px 48px rgba(0,0,0,0.85);overflow:hidden;">
          <tr>
            <td height="4" style="background:linear-gradient(90deg, #8A641E 0%, #F5D899 50%, #8A641E 100%);font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td class="header-cell" style="background:linear-gradient(180deg, #1C1710 0%, #13100B 100%);padding:22px 28px;border-bottom:1px solid #2B2113;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left" valign="middle">
                    <span style="color:#F5D899;font-size:16px;font-weight:800;letter-spacing:5px;text-transform:uppercase;">PREVA</span>
                    <span style="color:#8A7B66;font-size:10px;font-weight:700;letter-spacing:2.5px;text-transform:uppercase;margin-left:8px;">KITCHEN &bull; REDFORD</span>
                  </td>
                  <td align="right" valign="middle">
                    <span style="display:inline-block;padding:5px 12px;background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.32);border-radius:999px;color:#F3D58C;font-size:9.5px;font-weight:800;letter-spacing:1px;text-transform:uppercase;">
                      Confirmation
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td class="content-cell" style="padding:24px 28px 22px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:10px;">
                <tr>
                  <td align="left" valign="middle">
                    <h1 style="margin:0;color:#FFFFFF;font-size:20px;font-weight:700;line-height:1.3;">${escapeHtml(heading)}</h1>
                  </td>
                  ${referenceId ? `
                  <td align="right" valign="middle" style="white-space:nowrap;">
                    <span style="display:inline-block;background:#20190F;color:#F5D899;border:1px solid #5C451F;padding:4px 10px;border-radius:4px;font-weight:700;font-family:Consolas,monospace;font-size:11.5px;letter-spacing:0.8px;">#${escapeHtml(referenceId)}</span>
                  </td>` : ''}
                </tr>
              </table>
              <p style="margin:0 0 14px;color:#D5C9B8;font-size:13.5px;line-height:1.6;">
                Hello <b style="color:#FFF8EC;">${escapeHtml(name || 'there')}</b>, ${introText}
              </p>

              ${summaryRows ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#09090A;border:1px solid #231C12;border-radius:8px;overflow:hidden;margin-bottom:14px;">
                <tr>
                  <td style="padding:6px 18px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      ${summaryRows}
                    </table>
                  </td>
                </tr>
              </table>` : ''}

              ${nextSteps ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#17130D;border-left:3px solid #D4AF37;border-radius:6px;border-top:1px solid #231A0F;border-right:1px solid #231A0F;border-bottom:1px solid #231A0F;margin-bottom:10px;">
                <tr>
                  <td style="padding:12px 16px;">
                    <p style="margin:0;color:#E6D3B1;font-size:12px;line-height:1.5;">
                      <b style="color:#F5D899;">Next step:</b> ${nextSteps}
                    </p>
                  </td>
                </tr>
              </table>` : ''}
            </td>
          </tr>
          <tr>
            <td style="background:#0B0907;padding:16px 24px;border-top:1px solid #1C160E;text-align:center;">
              <p style="margin:0 0 4px;color:#DFD5C3;font-size:11px;letter-spacing:2px;font-weight:700;text-transform:uppercase;">PREVA KITCHEN</p>
              <p style="margin:0;color:#786E5E;font-size:10px;line-height:1.5;">
                ${BRAND_ADDRESS} &bull; <a href="tel:3132863586" style="color:#C9A96E;text-decoration:none;">${BRAND_PHONE}</a> &bull; <a href="${escapeHtml(siteUrl)}" style="color:#C9A96E;text-decoration:none;">prevakitchen.com</a>
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/**
 * Core send email helper using Nodemailer SMTP transport.
 */
export async function sendMail({ to, subject, html, text, replyTo, attachments = [] }) {
  if (!isSmtpConfigured()) {
    console.warn('[nodemailer] SMTP credentials (SMTP_USER / SMTP_PASS) not configured. Logging email instead.');
    console.log('[nodemailer:mock-send]', { to, subject, replyTo, attachmentsCount: attachments.length });
    return { ok: true, mocked: true };
  }

  const transporter = getTransporter();
  const from = getFromAddress();

  try {
    const info = await transporter.sendMail({
      from,
      to,
      subject,
      html,
      ...(text ? { text } : {}),
      ...(replyTo ? { replyTo } : {}),
      ...(attachments.length ? { attachments } : {})
    });

    console.log(`[nodemailer] Email sent successfully to ${to} (MessageId: ${info?.messageId})`);
    return { ok: true, messageId: info?.messageId };
  } catch (err) {
    console.error(`[nodemailer] Failed to send email to ${to}:`, err.message);
    throw new Error('Email service encountered a delivery issue. Please try again or contact us by phone.');
  }
}

/* ══════════════════════════════════════════════════════════════════════════
   Public Form Email Handlers
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * 1. Send Reservation Form Submission
 * Routes to RESERVATION_EMAIL (reservations@prevakitchen.com)
 * Sets replyTo to customer's email.
 */
export async function sendReservationEmail(data) {
  const recipient = getReservationRecipient();
  const submitted = data.submittedAt ? new Date(data.submittedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : new Date().toLocaleString('en-US');

  const tableRows =
    row('Customer Name', data.name) +
    row('Phone Number', data.phone) +
    row('Email Address', data.email) +
    row('Party Size', `${data.guests} guests`) +
    row('Date & Time', `${data.date} at ${data.time}`) +
    row('Occasion', data.occasion) +
    row('Special Notes', data.notes) +
    row('Submitted At', submitted, false, true);

  // 1. Admin staff notification: goes ONLY to reservations@prevakitchen.com
  // replyTo is set to customer's email so admin can hit "Reply" to contact customer directly
  const adminTask = sendMail({
    to: recipient,
    replyTo: data.email || undefined,
    subject: `New Reservation Request: ${data.name} (${data.guests} guests · ${data.date} at ${data.time})`,
    html: wrapEmail({
      title: 'Table Reservation Request',
      subtitle: `${data.guests} guests · ${data.date} at ${data.time}`,
      referenceId: data.referenceId,
      badgeText: 'Reservation Request',
      tableRows,
      footerNote: `Reply directly to this email to contact ${data.name} (${data.email})`
    }),
    text: `New Table Reservation Request\n\nName: ${data.name}\nPhone: ${data.phone}\nEmail: ${data.email}\nGuests: ${data.guests}\nDate: ${data.date}\nTime: ${data.time}\nOccasion: ${data.occasion || 'N/A'}\nNotes: ${data.notes || 'None'}\nReference: ${data.referenceId}\nSubmitted: ${submitted}`
  });

  // 2. Customer confirmation: goes ONLY to customer's personal email
  // Skipped if the customer email is an internal admin/staff address so admin NEVER gets customer copy
  let customerTask = null;
  if (data.email && !isStaffEmail(data.email)) {
    customerTask = sendMail({
      to: data.email,
      replyTo: recipient,
      subject: 'Reservation Request Received - PREVA Kitchen',
      html: wrapCustomerConfirmation({
        heading: 'Your table request is with our host.',
        name: data.name,
        referenceId: data.referenceId,
        introText: `thank you for choosing ${BRAND_NAME}. We have received your reservation request for <b>${escapeHtml(data.guests)} guests</b> on <b>${escapeHtml(data.date)} at ${escapeHtml(data.time)}</b>.`,
        summaryRows:
          row('Party Size', `${data.guests} guests`) +
          row('Date & Time', `${data.date} at ${data.time}`) +
          row('Occasion', data.occasion) +
          row('Notes', data.notes, false, true),
        nextSteps: `Our front-of-house host will review seating availability and contact you if anything else is needed. For urgent inquiries, call ${BRAND_PHONE}.`
      })
    }).catch((confErr) => {
      console.warn('[nodemailer] Customer confirmation email skipped or failed:', confErr.message);
      return { ok: false, error: confErr.message };
    });
  }

  // Parallel dispatch for instant delivery
  const [adminResult] = await Promise.all([adminTask, customerTask].filter(Boolean));
  return adminResult;
}

/**
 * 2. Send Contact Form Submission
 * Admin copy routes ONLY to CONTACT_EMAIL (info@prevakitchen.com).
 * Sets replyTo to customer's email so admin can reply directly.
 * Customer copy routes ONLY to customer's personal email.
 */
export async function sendContactEmail(data) {
  const recipient = getContactRecipient();
  const submitted = data.submittedAt ? new Date(data.submittedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : new Date().toLocaleString('en-US');

  const tableRows =
    row('Sender Name', data.name) +
    row('Email Address', data.email) +
    row('Phone Number', data.phone) +
    row('Inquiry Topic', data.subject) +
    row('Message', data.message) +
    row('Submitted At', submitted, false, true);

  // 1. Admin notification to info@prevakitchen.com
  const adminTask = sendMail({
    to: recipient,
    replyTo: data.email || undefined,
    subject: `✉️ Contact Enquiry: ${data.name} — ${data.subject || 'General'}`,
    html: wrapEmail({
      title: 'New Contact Form Enquiry',
      subtitle: data.subject || 'General inquiry',
      referenceId: data.referenceId,
      badgeText: 'Contact Enquiry',
      tableRows,
      footerNote: `Reply directly to this email to contact ${data.name} (${data.email})`
    }),
    text: `New Contact Form Enquiry\n\nName: ${data.name}\nEmail: ${data.email}\nPhone: ${data.phone || 'N/A'}\nSubject: ${data.subject || 'General'}\nMessage: ${data.message}\nReference: ${data.referenceId}\nSubmitted: ${submitted}`
  });

  // 2. Customer confirmation: goes ONLY to sender's personal email (skipped for staff emails)
  let customerTask = null;
  if (data.email && !isStaffEmail(data.email)) {
    customerTask = sendMail({
      to: data.email,
      replyTo: recipient,
      subject: `Message Received - Preva Kitchen (${data.referenceId || 'Confirmation'})`,
      html: wrapCustomerConfirmation({
        heading: 'We have received your message.',
        name: data.name,
        referenceId: data.referenceId,
        introText: `thank you for reaching out to ${BRAND_NAME}. Our team has received your message and will get back to you shortly.`,
        summaryRows:
          row('Subject', data.subject || 'General Inquiry') +
          row('Message', data.message, false, true),
        nextSteps: `We typically reply within 1 business day. For urgent orders or same-day reservations, please call us directly at ${BRAND_PHONE}.`
      })
    }).catch((confErr) => {
      console.warn('[nodemailer] Customer confirmation email skipped or failed:', confErr.message);
      return { ok: false, error: confErr.message };
    });
  }

  // Parallel dispatch for instant delivery
  const [adminResult] = await Promise.all([adminTask, customerTask].filter(Boolean));
  return adminResult;
}

/**
 * 3. Send Career Application Form Submission
 * Admin copy routes ONLY to CAREER_EMAIL (donnaw@prevaclub.com) with resume attachment.
 * Sets replyTo to applicant's email.
 * Applicant confirmation routes ONLY to applicant's personal email.
 */
export async function sendCareerEmail(data) {
  const recipient = getCareerRecipient();
  const candidateName = `${data.firstName || ''} ${data.lastName || ''}`.trim() || data.name || 'Applicant';
  const submitted = data.submittedAt ? new Date(data.submittedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : new Date().toLocaleString('en-US');
  const position = data.position || data.role || 'General Application';

  const attachments = [];
  if (data.resume?.data && data.resume?.name) {
    let buffer = null;
    const raw = String(data.resume.data);
    const base64Index = raw.indexOf(';base64,');
    if (base64Index !== -1) {
      buffer = Buffer.from(raw.slice(base64Index + 8), 'base64');
    } else {
      buffer = Buffer.from(raw, 'base64');
    }

    attachments.push({
      filename: data.resume.name,
      content: buffer,
      contentType: data.resume.type || 'application/pdf'
    });
  }

  const tableRows =
    row('Candidate Name', candidateName) +
    row('Email Address', data.email) +
    row('Phone Number', data.phone) +
    row('Position Applied', position) +
    row('Availability', data.availability) +
    row('Start Date', data.startDate) +
    row('Cover Note', data.message) +
    row('Resume File', data.resume?.name ? `${data.resume.name} (Attached)` : 'None') +
    row('Submitted At', submitted, false, true);

  // 1. Admin HR notification to donnaw@prevaclub.com
  const adminTask = sendMail({
    to: recipient,
    replyTo: data.email || undefined,
    subject: `Career Application: ${candidateName} — ${position}`,
    attachments,
    html: wrapEmail({
      title: 'New Career Application Received',
      subtitle: `Role: ${position} · Candidate: ${candidateName}`,
      referenceId: data.referenceId,
      badgeText: 'Career Application',
      tableRows,
      footerNote: `Reply directly to this email to contact ${candidateName} (${data.email})`
    }),
    text: `New Career Application\n\nCandidate: ${candidateName}\nEmail: ${data.email}\nPhone: ${data.phone}\nPosition: ${position}\nAvailability: ${data.availability || 'N/A'}\nStart Date: ${data.startDate || 'N/A'}\nMessage: ${data.message || 'None'}\nResume: ${data.resume?.name || 'None'}\nReference: ${data.referenceId}\nSubmitted: ${submitted}`
  });

  // 2. Applicant confirmation: goes ONLY to candidate's personal email (skipped for staff emails)
  let candidateTask = null;
  if (data.email && !isStaffEmail(data.email)) {
    candidateTask = sendMail({
      to: data.email,
      replyTo: recipient,
      subject: 'Application Received - PREVA Kitchen',
      html: wrapCustomerConfirmation({
        heading: 'Thank you for your interest in joining PREVA.',
        name: candidateName,
        referenceId: data.referenceId,
        introText: `thank you for applying to ${BRAND_NAME}. We have received your application for the <b>${escapeHtml(position)}</b> opportunity.`,
        summaryRows:
          row('Position', position) +
          row('Availability', data.availability) +
          row('Target Start Date', data.startDate, false, true),
        nextSteps: 'Our hiring team reviews applications and will reach out by phone or email if your qualifications match an active opening. No further action is required at this time.'
      })
    }).catch((confErr) => {
      console.warn('[nodemailer] Candidate confirmation email skipped or failed:', confErr.message);
      return { ok: false, error: confErr.message };
    });
  }

  // Parallel dispatch for instant delivery
  const [adminResult] = await Promise.all([adminTask, candidateTask].filter(Boolean));
  return adminResult;
}
