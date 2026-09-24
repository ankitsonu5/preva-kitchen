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
  const port = Number(process.env.SMTP_PORT) || 587;
  const secure = process.env.SMTP_SECURE !== undefined
    ? String(process.env.SMTP_SECURE).toLowerCase() === 'true'
    : port === 465;
  const user = String(process.env.SMTP_USER || process.env.GMAIL_USER || 'reservations@prevakitchen.com').trim();
  const pass = String(process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || 'wajwwwlhhuyodvja').replace(/\s+/g, '').trim();

  return { host, port, secure, user, pass };
}

export function isSmtpConfigured() {
  const { user, pass } = getSmtpConfig();
  return Boolean(user && pass);
}

export function getFromAddress() {
  const { user } = getSmtpConfig();
  return `Preva Kitchen <${user || 'reservations@prevakitchen.com'}>`;
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
      connectionTimeout: 6000,
      greetingTimeout: 5000,
      socketTimeout: 10000
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
  return staffAddresses.includes(clean);
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
    formattedValue = `<span style="display:inline-block;background:linear-gradient(135deg,#2E2414 0%,#1A140A 100%);color:#F5D899;border:1px solid #735728;padding:3px 10px;border-radius:6px;font-weight:700;font-family:Consolas,monospace;font-size:12px;letter-spacing:1px;box-shadow:0 2px 6px rgba(0,0,0,0.4);">${display}</span>`;
  } else if (isEmail) {
    formattedValue = `<a href="mailto:${display}" style="color:#E8C57A;text-decoration:none;font-weight:600;border-bottom:1px dotted #E8C57A;">${display}</a>`;
  } else if (isPhone) {
    formattedValue = `<a href="tel:${display}" style="color:#E8C57A;text-decoration:none;font-weight:600;">${display}</a>`;
  } else if (isMessage && !isHtml) {
    formattedValue = `<div style="background:#13100B;border:1px solid #2B2113;border-radius:6px;padding:12px 14px;color:#F5EFE6;font-size:13px;line-height:1.6;">${display}</div>`;
  }

  const borderBottom = isLast ? 'none' : '1px solid #1C1914';

  return `
    <tr>
      <td style="padding:12px 14px 12px 0;color:#948978;font-size:10px;font-weight:700;letter-spacing:1.1px;text-transform:uppercase;white-space:nowrap;vertical-align:top;border-bottom:${borderBottom};width:28%;">${escapeHtml(label)}</td>
      <td style="padding:12px 0;color:#F5EFE6;font-size:13px;font-weight:500;line-height:1.55;vertical-align:top;border-bottom:${borderBottom};">${formattedValue}</td>
    </tr>`;
}

function wrapEmail({ title, subtitle, referenceId, badgeText = 'Website Notification', tableRows, footerNote = 'Reply directly to contact the submitter', adminLink, adminLabel = 'View Details' }) {
  const siteUrl = getSiteUrl();
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeHtml(title)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
    body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #070708; }
    @media only screen and (max-width: 640px) {
      .email-container { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; }
      .content-cell { padding: 22px 18px !important; }
      .header-cell { padding: 22px 18px !important; }
      .cta-btn { display: block !important; width: 100% !important; box-sizing: border-box !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#070708;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(title)} — ${escapeHtml(subtitle || '')}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#070708;width:100%;padding:32px 12px;table-layout:fixed;">
    <tr>
      <td align="center" valign="top">
        <table role="presentation" class="email-container" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#131210;border-radius:18px;border:1px solid #382D1B;box-shadow:0 24px 60px rgba(0,0,0,0.85),0 0 1px rgba(212,175,55,0.3);overflow:hidden;">
          <tr>
            <td height="4" style="background:linear-gradient(90deg, #8A641E 0%, #F5D899 50%, #8A641E 100%);font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td class="header-cell" style="background:linear-gradient(180deg, #1C1710 0%, #13110E 100%);padding:26px 32px 20px;border-bottom:1px solid #382D1B;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 10px;">
                <tr>
                  <td align="center" style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg, #2D2313 0%, #1A1408 100%);border:1px solid #6E5325;text-align:center;line-height:38px;box-shadow:0 4px 14px rgba(0,0,0,0.5);">
                    <span style="font-family:'Cinzel',Georgia,serif;font-size:19px;font-weight:700;color:#F5D899;letter-spacing:1px;">P</span>
                  </td>
                </tr>
              </table>
              <div style="margin:0 0 4px;color:#F5D899;font-family:'Cinzel',Georgia,serif;font-size:20px;font-weight:700;letter-spacing:6px;text-transform:uppercase;text-shadow:0 2px 10px rgba(245,216,153,0.2);">PREVA</div>
              <div style="margin:0 auto;color:#9E8E75;font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Kitchen &bull; Redford Township</div>
              <div style="width:56px;height:1px;background:linear-gradient(90deg, transparent, #D4AF37 50%, transparent);margin:10px auto 0;"></div>
            </td>
          </tr>
          <tr>
            <td class="content-cell" style="padding:26px 34px 22px;">
              <div style="margin:0 0 12px;">
                <span style="display:inline-block;padding:4px 12px;background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.32);border-radius:999px;color:#F3D58C;font-size:9px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;">
                  ${escapeHtml(badgeText)}
                </span>
              </div>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:8px;">
                <tr>
                  <td align="left" valign="middle">
                    <h1 style="margin:0;color:#FFFFFF;font-family:'Cinzel',Georgia,serif;font-size:19px;font-weight:600;line-height:1.25;letter-spacing:0.2px;">${escapeHtml(title)}</h1>
                  </td>
                  ${referenceId ? `
                  <td align="right" valign="middle" style="white-space:nowrap;">
                    <span style="display:inline-block;background:linear-gradient(135deg,#2E2414 0%,#1A140A 100%);color:#F5D899;border:1px solid #735728;padding:4px 12px;border-radius:6px;font-weight:700;font-family:Consolas,monospace;font-size:11px;letter-spacing:1px;">#${escapeHtml(referenceId)}</span>
                  </td>` : ''}
                </tr>
              </table>
              ${subtitle ? `<p style="margin:0 0 18px;color:#B3A795;font-size:13px;line-height:1.55;">${escapeHtml(subtitle)}</p>` : ''}

              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#09090B;border:1px solid #282218;border-radius:14px;overflow:hidden;box-shadow:inset 0 1px 0 rgba(255,255,255,0.03);">
                <tr>
                  <td style="padding:8px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      ${tableRows}
                    </table>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          ${adminLink ? `
          <tr>
            <td style="padding:0 34px 24px;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td align="center">
                    <a href="${adminLink}" class="cta-btn" style="display:inline-block;background:linear-gradient(135deg, #F5D899 0%, #D4AF37 50%, #A87F22 100%);color:#0D0A06;font-family:'Plus Jakarta Sans',Arial,sans-serif;font-weight:800;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;padding:12px 32px;border-radius:999px;text-decoration:none;box-shadow:0 8px 24px rgba(212,175,55,0.3);">${escapeHtml(adminLabel)} &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : ''}
          <tr>
            <td style="background:#0C0B09;padding:18px 28px;border-top:1px solid #241D12;text-align:center;">
              <p style="margin:0 0 4px;color:#E5DAC6;font-family:'Cinzel',Georgia,serif;font-size:12px;letter-spacing:2.5px;font-weight:600;">PREVA KITCHEN</p>
              <p style="margin:0 0 6px;color:#786E5E;font-size:10px;line-height:1.6;">
                ${BRAND_ADDRESS}<br>
                <a href="tel:3132863586" style="color:#C9A96E;text-decoration:none;">${BRAND_PHONE}</a> &bull;
                <a href="${escapeHtml(siteUrl)}" style="color:#C9A96E;text-decoration:none;">prevakitchen.com</a>
              </p>
              ${footerNote ? `<p style="margin:4px 0 0;color:#544D42;font-size:9.5px;font-style:italic;">${escapeHtml(footerNote)}</p>` : ''}
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

function wrapCustomerConfirmation({ eyebrow = 'PREVA Concierge', heading, name, referenceId, introText, summaryRows, nextSteps, ctaLabel = 'Visit PREVA Kitchen', ctaHref }) {
  const siteUrl = getSiteUrl();
  const safeCtaHref = escapeHtml(ctaHref || siteUrl);
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="x-apple-disable-message-reformatting">
  <title>${escapeHtml(heading)}</title>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@500;600;700;800&family=Plus+Jakarta+Sans:wght@400;500;600;700&display=swap');
    body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    body { margin: 0 !important; padding: 0 !important; width: 100% !important; background-color: #070708; }
    @media only screen and (max-width: 640px) {
      .email-container { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; }
      .content-cell { padding: 22px 18px !important; }
      .header-cell { padding: 22px 18px !important; }
      .cta-btn { display: block !important; width: 100% !important; box-sizing: border-box !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#070708;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(heading)} · Reference #${escapeHtml(referenceId || '')}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#070708;width:100%;padding:32px 12px;table-layout:fixed;">
    <tr>
      <td align="center" valign="top">
        <table role="presentation" class="email-container" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#131210;border-radius:18px;border:1px solid #382D1B;box-shadow:0 24px 60px rgba(0,0,0,0.85),0 0 1px rgba(212,175,55,0.4);overflow:hidden;">
          <tr>
            <td height="4" style="background:linear-gradient(90deg, #8A641E 0%, #F5D899 50%, #8A641E 100%);font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <tr>
            <td class="header-cell" style="background:linear-gradient(180deg, #1C1710 0%, #13110E 100%);padding:26px 32px 20px;border-bottom:1px solid #382D1B;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 10px;">
                <tr>
                  <td align="center" style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg, #2D2313 0%, #1A1408 100%);border:1px solid #6E5325;text-align:center;line-height:38px;box-shadow:0 4px 14px rgba(0,0,0,0.5);">
                    <span style="font-family:'Cinzel',Georgia,serif;font-size:19px;font-weight:700;color:#F5D899;letter-spacing:1px;">P</span>
                  </td>
                </tr>
              </table>
              <div style="margin:0 0 4px;color:#F5D899;font-family:'Cinzel',Georgia,serif;font-size:20px;font-weight:700;letter-spacing:6px;text-transform:uppercase;text-shadow:0 2px 10px rgba(245,216,153,0.2);">PREVA</div>
              <div style="margin:0 auto;color:#9E8E75;font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Kitchen &bull; Redford Township</div>
              <div style="width:56px;height:1px;background:linear-gradient(90deg, transparent, #D4AF37 50%, transparent);margin:10px auto 0;"></div>
            </td>
          </tr>
          <tr>
            <td class="content-cell" style="padding:26px 34px 22px;">
              <p style="margin:0 0 8px;color:#C9A96E;font-size:9px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">${escapeHtml(eyebrow)}</p>
              <h1 style="margin:0 0 10px;color:#FFFFFF;font-family:'Cinzel',Georgia,serif;font-size:19px;font-weight:600;line-height:1.25;letter-spacing:0.2px;">${escapeHtml(heading)}</h1>
              ${referenceId ? `
              <div style="margin:0 0 16px;">
                <span style="display:inline-block;background:linear-gradient(135deg,#2E2414 0%,#1A140A 100%);color:#F5D899;border:1px solid #735728;padding:4px 12px;border-radius:6px;font-weight:700;font-family:Consolas,monospace;font-size:11px;letter-spacing:1px;">REFERENCE #${escapeHtml(referenceId)}</span>
              </div>` : ''}

              <p style="margin:0 0 18px;color:#DDD4C7;font-size:13.5px;line-height:1.65;">
                Hello <b style="color:#FFF8EC;">${escapeHtml(name || 'there')}</b>,<br><br>${introText}
              </p>

              ${summaryRows ? `
              <p style="margin:0 0 8px;color:#A8987E;font-size:10px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;">Summary of Request</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#09090B;border:1px solid #282218;border-radius:14px;margin-bottom:20px;overflow:hidden;">
                <tr>
                  <td style="padding:8px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      ${summaryRows}
                    </table>
                  </td>
                </tr>
              </table>` : ''}

              ${nextSteps ? `
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg, #1A150D 0%, #120F09 100%);border-left:3px solid #D4AF37;border-radius:10px;border-top:1px solid #2C2213;border-right:1px solid #2C2213;border-bottom:1px solid #2C2213;margin-bottom:20px;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0 0 4px;color:#F5D899;font-size:12px;font-weight:700;letter-spacing:0.4px;">✨ What happens next</p>
                    <p style="margin:0;color:#C4BBAE;font-size:12px;line-height:1.6;">${nextSteps}</p>
                  </td>
                </tr>
              </table>` : ''}

              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 10px;">
                <tr>
                  <td align="center">
                    <a href="${safeCtaHref}" class="cta-btn" style="display:inline-block;background:linear-gradient(135deg, #F5D899 0%, #D4AF37 50%, #A87F22 100%);color:#0D0A06;font-family:'Plus Jakarta Sans',Arial,sans-serif;font-weight:800;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;padding:12px 34px;border-radius:999px;text-decoration:none;box-shadow:0 8px 24px rgba(212,175,55,0.3);">${escapeHtml(ctaLabel)} &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background:#0C0B09;padding:18px 28px;border-top:1px solid #241D12;text-align:center;">
              <p style="margin:0 0 4px;color:#E5DAC6;font-family:'Cinzel',Georgia,serif;font-size:12px;letter-spacing:2.5px;font-weight:600;">PREVA KITCHEN</p>
              <p style="margin:0 0 6px;color:#786E5E;font-size:10px;line-height:1.6;">
                ${BRAND_ADDRESS}<br>
                <a href="tel:3132863586" style="color:#C9A96E;text-decoration:none;">${BRAND_PHONE}</a> &bull;
                <a href="${escapeHtml(siteUrl)}" style="color:#C9A96E;text-decoration:none;">prevakitchen.com</a>
              </p>
              <p style="margin:0;color:#544D42;font-size:9px;line-height:1.5;">Fine Dining &bull; Redford Township, MI</p>
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
 * Enforces pure HTML rendering priority so email clients (like Gmail)
 * always render the stunning luxury Black & Gold UI without fallback to plain text.
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
    const mailOptions = {
      from,
      to,
      subject,
      html,
      headers: {
        'X-Priority': '1 (Highest)',
        'X-MSMail-Priority': 'High',
        'Importance': 'High'
      },
      ...(replyTo ? { replyTo } : {}),
      ...(attachments.length ? { attachments } : {})
    };

    // Note: When html is provided, we intentionally DO NOT send plain text fallback
    // so Gmail/Apple Mail/Outlook never display raw text instead of the luxury Black & Gold UI.
    if (!html && text) {
      mailOptions.text = text;
    }

    const info = await transporter.sendMail(mailOptions);
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

  // 1. Admin staff notification: goes to reservations@prevakitchen.com
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
  }).catch((err) => {
    console.error('[nodemailer] Admin reservation email delivery failed:', err.message);
    return { ok: false, error: err.message };
  });

  // 2. Customer confirmation: goes directly to customer's personal email
  let customerTask = null;
  if (data.email) {
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
      }),
      text: `Hello ${data.name},\n\nThank you for choosing Preva Kitchen! We have received your reservation request for ${data.guests} guests on ${data.date} at ${data.time}.\n\nReference: #${data.referenceId}\nParty Size: ${data.guests} guests\nDate & Time: ${data.date} at ${data.time}\nOccasion: ${data.occasion || 'N/A'}\nSpecial Notes: ${data.notes || 'None'}\n\nOur front-of-house host will review seating availability and contact you if anything else is needed. For urgent inquiries, call ${BRAND_PHONE}.\n\nPreva Kitchen\n${BRAND_ADDRESS}\nPhone: ${BRAND_PHONE}\n${getSiteUrl()}`
    }).catch((confErr) => {
      console.warn('[nodemailer] Customer confirmation email skipped or failed:', confErr.message);
      return { ok: false, error: confErr.message };
    });
  }

  // Parallel dispatch for instant delivery
  const results = await Promise.allSettled([adminTask, customerTask].filter(Boolean));
  return results[0]?.status === 'fulfilled' ? results[0].value : { ok: true };
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
  }).catch((err) => {
    console.error('[nodemailer] Admin contact email delivery failed:', err.message);
    return { ok: false, error: err.message };
  });

  // 2. Customer confirmation: goes to sender's personal email
  let customerTask = null;
  if (data.email) {
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
      }),
      text: `Hello ${data.name},\n\nThank you for reaching out to Preva Kitchen! Our team has received your message regarding "${data.subject || 'General Inquiry'}".\n\nReference: #${data.referenceId}\nMessage: ${data.message}\n\nWe typically reply within 1 business day. For urgent orders or same-day reservations, please call us directly at ${BRAND_PHONE}.\n\nPreva Kitchen\n${BRAND_ADDRESS}\nPhone: ${BRAND_PHONE}\n${getSiteUrl()}`
    }).catch((confErr) => {
      console.warn('[nodemailer] Customer confirmation email skipped or failed:', confErr.message);
      return { ok: false, error: confErr.message };
    });
  }

  // Parallel dispatch for instant delivery
  const results = await Promise.allSettled([adminTask, customerTask].filter(Boolean));
  return results[0]?.status === 'fulfilled' ? results[0].value : { ok: true };
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
  }).catch((err) => {
    console.error('[nodemailer] Admin career email delivery failed:', err.message);
    return { ok: false, error: err.message };
  });

  // 2. Applicant confirmation: goes to candidate's personal email
  let candidateTask = null;
  if (data.email) {
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
      }),
      text: `Hello ${candidateName},\n\nThank you for applying to Preva Kitchen! We have received your application for the ${position} position.\n\nReference: #${data.referenceId}\nAvailability: ${data.availability || 'N/A'}\nTarget Start Date: ${data.startDate || 'N/A'}\n\nOur hiring team reviews applications and will reach out by phone or email if your qualifications match an active opening.\n\nPreva Kitchen\n${BRAND_ADDRESS}\nPhone: ${BRAND_PHONE}\n${getSiteUrl()}`
    }).catch((confErr) => {
      console.warn('[nodemailer] Candidate confirmation email skipped or failed:', confErr.message);
      return { ok: false, error: confErr.message };
    });
  }

  // Parallel dispatch for instant delivery
  const results = await Promise.allSettled([adminTask, candidateTask].filter(Boolean));
  return results[0]?.status === 'fulfilled' ? results[0].value : { ok: true };
}
