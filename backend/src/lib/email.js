import { Resend } from 'resend';
import nodemailer from 'nodemailer';
import { col } from './db.js';

/* ══════════════════════════════════════════════════════════════════════════
   Email notifications — Preva Kitchen Staff Alerts + Customer Confirmations
   ──────────────────────────────────────────────────────────────────────────
   Transports:
   1. Nodemailer via Gmail SMTP (Zero DNS setup) when SMTP_USER + SMTP_PASS are set
   2. Resend (https://resend.com) when RESEND_API_KEY is set
   All provider errors are recorded and returned as a false result so a
   notification outage never rolls back a saved submission.
   ══════════════════════════════════════════════════════════════════════════ */

const BRAND_COLOR  = '#c9a96e';   // Preva gold
const BRAND_NAME   = 'Preva Kitchen';
const BRAND_ADDRESS = '13090 Inkster Rd, Redford Township, MI 48239';
const BRAND_PHONE  = '(313) 286-3586';

function getResendKey() {
  return String(process.env.RESEND_API_KEY || '').trim();
}
function getFromAddress() {
  const configured = String(
    process.env.FROM_EMAIL || process.env.RESEND_FROM_EMAIL || process.env.STAFF_EMAIL_FROM || ''
  ).trim();
  if (configured) return configured;
  const smtpUser = String(process.env.SMTP_USER || process.env.GMAIL_USER || '').trim();
  if (smtpUser) return `Preva Kitchen <${smtpUser}>`;
  return 'Preva Kitchen <info@prevakitchen.com>';
}
function getSiteUrl() {
  return String(process.env.STOREFRONT_URL || 'https://prevakitchen.com').trim();
}
/** Accept comma-separated addresses while retaining the legacy settings. */
function parseRecipients(raw) {
  if (!raw) return [];
  return String(raw).split(',').map((address) => address.trim()).filter(Boolean);
}

function getAdminRecipients() {
  return parseRecipients(
    process.env.ADMIN_EMAIL || process.env.ADMIN_EMAILS || process.env.STAFF_ALERT_EMAIL || 'reservations@prevakitchen.com'
  );
}

function getContactRecipients() {
  return parseRecipients(
    process.env.CONTACT_EMAIL || 'info@prevakitchen.com'
  );
}

function getReservationRecipients() {
  return parseRecipients(
    process.env.RESERVATION_EMAIL || process.env.RESERVATION_ADMIN_EMAIL || 'reservations@prevakitchen.com'
  );
}

function getCareerRecipients() {
  return parseRecipients(
    process.env.CAREER_EMAIL || process.env.CAREER_ADMIN_EMAIL || process.env.HR_EMAIL || 'donnaw@prevaclub.com'
  );
}

function isProduction() {
  return String(process.env.NODE_ENV || '').trim() === 'production';
}
/** Non-production override so testing never emails a real customer's inbox. */
function getMailCatchAll() {
  return String(process.env.MAIL_CATCH_ALL || '').trim();
}

/** REF-XXXXXXXX from a Mongo _id — short, unique enough, no schema change needed. */
export function buildReferenceId(prefix, id) {
  return `${prefix}-${String(id).slice(-8).toUpperCase()}`;
}

async function logEmailAttempt({ formType, recipientType, to, subject, status, providerMessageId, error, referenceId }) {
  try {
    const logs = await col('emailLogs');
    await logs.insertOne({
      formType: formType || null,
      recipientType: recipientType || null,
      to: Array.isArray(to) ? to : [to].filter(Boolean),
      subject: subject || null,
      status, // 'sent' | 'failed' | 'skipped'
      providerMessageId: providerMessageId || null,
      error: error || null,
      referenceId: referenceId || null,
      createdAt: new Date()
    });
  } catch (err) {
    // Logging must never be the reason an email path throws.
    console.error('[email] failed to write emailLogs entry:', err.message);
  }
}

/* ── Transports: Nodemailer (Gmail SMTP) & Resend ──────────────────────────
   1. Nodemailer: Zero DNS setup. Send from your Gmail account via App Password.
   2. Resend: API-based delivery (free 3,000 emails/month).                  */

function getSmtpConfig() {
  const user = String(process.env.SMTP_USER || process.env.GMAIL_USER || '').trim();
  const pass = String(process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '').replace(/\s+/g, '').trim();
  const host = String(process.env.SMTP_HOST || 'smtp.gmail.com').trim();
  const port = Number(process.env.SMTP_PORT) || 465;
  const secure = process.env.SMTP_SECURE !== undefined
    ? String(process.env.SMTP_SECURE).toLowerCase() === 'true'
    : port === 465;
  return { user, pass, host, port, secure };
}

let _transporter = null;
let _cachedSmtpKey = null;
function getTransporter() {
  const { user, pass, host, port, secure } = getSmtpConfig();
  const key = `${user}:${pass}:${host}:${port}:${secure}`;
  if (!_transporter || _cachedSmtpKey !== key) {
    _cachedSmtpKey = key;
    _transporter = nodemailer.createTransport({
      host,
      port,
      secure,
      auth: { user, pass }
    });
  }
  return _transporter;
}

function isSmtpConfigured() {
  const { user, pass } = getSmtpConfig();
  return Boolean(user && pass);
}

/** Lazily created so a missing key does not make module import fail. */
let _resend = null;
let _cachedKey = null;
function getResendClient() {
  const key = getResendKey();
  if (!_resend || _cachedKey !== key) {
    _cachedKey = key;
    _resend = new Resend(key);
  }
  return _resend;
}

function configured() {
  return isSmtpConfigured() || Boolean(getResendKey() && getFromAddress());
}

/**
 * Send one email via Nodemailer (Gmail SMTP) or Resend.
 * Returns true on success, false (+ console.error) on failure.
 * `to` may be a single address or an array. In non-production, when
 * MAIL_CATCH_ALL is set, every recipient is replaced so real inboxes stay clean.
 */
async function send({ to, subject, html, text, replyTo, attachments, formType, recipientType, referenceId }) {
  const requested = (Array.isArray(to) ? to : [to]).filter(Boolean);
  const recipients = requested.length ? requested : getAdminRecipients();

  // Dry-run mode: log the render without touching any mail provider.
  if (String(process.env.EMAIL_DRY_RUN || '').toLowerCase() === 'true') {
    console.log('[email:dry-run] rendered:', subject, { formType, recipientType });
    return true;
  }

  if (!recipients.length) {
    console.warn('[email] No recipient email specified.', { formType, recipientType });
    await logEmailAttempt({ formType, recipientType, to: requested, subject, status: 'skipped', error: 'no recipient', referenceId });
    return false;
  }

  if (!configured()) {
    console.warn('[email] Neither SMTP (Gmail) nor RESEND_API_KEY / FROM_EMAIL configured; skipping email.', { formType, recipientType });
    await logEmailAttempt({ formType, recipientType, to: recipients, subject, status: 'skipped', error: 'SMTP/RESEND not configured', referenceId });
    return false;
  }

  const catchAll = getMailCatchAll();
  const useCatchAll = !isProduction() && catchAll;
  const finalRecipients = useCatchAll ? [catchAll] : recipients;
  if (useCatchAll) {
    console.log('[email] dev mode: redirecting', recipients.join(', '), '->', catchAll);
  }

  try {
    if (isSmtpConfigured()) {
      const info = await getTransporter().sendMail({
        from: getFromAddress(),
        to: finalRecipients.join(', '),
        subject,
        html,
        ...(text ? { text } : {}),
        ...(replyTo ? { replyTo } : {}),
        ...(attachments && attachments.length ? { attachments } : {})
      });

      console.log('[email] sent via Gmail SMTP to:', finalRecipients.join(', '), 'Subject:', subject, 'messageId:', info?.messageId);
      await logEmailAttempt({ formType, recipientType, to: finalRecipients, subject, status: 'sent', providerMessageId: info?.messageId, referenceId });
      return true;
    }

    const { data, error } = await getResendClient().emails.send({
      from: getFromAddress(),
      to: finalRecipients,
      subject,
      html,
      ...(text ? { text } : {}),
      ...(replyTo ? { replyTo } : {}),
      ...(attachments && attachments.length ? { attachments } : {})
    });

    if (error) {
      const message = error.message || JSON.stringify(error);
      console.error('[email] Resend rejected send:', message, { formType, recipientType });
      await logEmailAttempt({ formType, recipientType, to: finalRecipients, subject, status: 'failed', error: message, referenceId });
      return false;
    }

    console.log('[email] sent via Resend to:', finalRecipients.join(', '), 'Subject:', subject, 'id:', data?.id);
    await logEmailAttempt({ formType, recipientType, to: finalRecipients, subject, status: 'sent', providerMessageId: data?.id, referenceId });
    return true;
  } catch (err) {
    console.error('[email] send failed:', err.message, { formType, recipientType });
    await logEmailAttempt({ formType, recipientType, to: finalRecipients, subject, status: 'failed', error: err.message, referenceId });
    return false;
  }
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

/* ── Shared HTML helpers ──────────────────────────────────────────────── */

function row(label, value, isHtml = false) {
  if (value === null || value === undefined || String(value).trim() === '') return '';
  const display = isHtml ? value : escapeHtml(value);
  const isReference = /reference/i.test(label);
  const isEmail = /email/i.test(label) && !isHtml;
  const isPhone = /phone/i.test(label) && !isHtml;

  let formattedValue = display;
  if (isReference) {
    formattedValue = `<span style="display:inline-block;background:linear-gradient(135deg,#2E2414 0%,#1A140A 100%);color:#F5D899;border:1px solid #735728;padding:3px 10px;border-radius:6px;font-weight:700;font-family:Consolas,monospace;font-size:12px;letter-spacing:1px;box-shadow:0 2px 6px rgba(0,0,0,0.4);">${display}</span>`;
  } else if (isEmail) {
    formattedValue = `<a href="mailto:${display}" style="color:#E8C57A;text-decoration:none;font-weight:600;border-bottom:1px dotted #E8C57A;">${display}</a>`;
  } else if (isPhone) {
    formattedValue = `<a href="tel:${display}" style="color:#E8C57A;text-decoration:none;font-weight:600;">${display}</a>`;
  }

  return `
    <tr>
      <td class="label-col" style="padding:10px 14px 10px 0;color:#948978;font-size:10px;font-weight:700;letter-spacing:1.1px;text-transform:uppercase;white-space:nowrap;vertical-align:top;border-bottom:1px solid #1C1914;width:28%;">${escapeHtml(label)}</td>
      <td style="padding:10px 0;color:#F5EFE6;font-size:13px;font-weight:500;line-height:1.55;vertical-align:top;border-bottom:1px solid #1C1914;">${formattedValue}</td>
    </tr>`;
}

function textDetails(entries) {
  return entries
    .filter(([, value]) => value !== null && value !== undefined && String(value).trim())
    .map(([label, value]) => `${label}: ${String(value).trim()}`)
    .join('\n');
}

function wrap({ icon, title, subtitle, tableRows, adminLink, adminLabel = 'View in Admin' }) {
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
      .email-container { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; border-left: none !important; border-right: none !important; }
      .content-cell { padding: 26px 20px !important; }
      .header-cell { padding: 28px 20px 22px !important; }
      .label-col { width: 34% !important; font-size: 10px !important; padding-right: 8px !important; }
      .cta-btn { display: block !important; width: 100% !important; box-sizing: border-box !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#070708;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(title)} — ${escapeHtml(subtitle || '')}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#070708;width:100%;padding:40px 14px;table-layout:fixed;">
    <tr>
      <td align="center" valign="top">
        <!-- Main Card -->
        <table role="presentation" class="email-container" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#131210;border-radius:20px;border:1px solid #382D1B;box-shadow:0 24px 60px rgba(0,0,0,0.8),0 0 1px rgba(212,175,55,0.4);overflow:hidden;">
          <!-- Top Accent Gold Line -->
          <tr>
            <td height="3" style="background:linear-gradient(90deg, #8A641E 0%, #F5D899 50%, #8A641E 100%);font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <!-- Luxury Header -->
          <tr>
            <td class="header-cell" style="background:linear-gradient(180deg, #1C1710 0%, #13110E 100%);padding:28px 36px 22px;border-bottom:1px solid #382D1B;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 12px;">
                <tr>
                  <td align="center" style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg, #2D2313 0%, #1A1408 100%);border:1px solid #6E5325;text-align:center;line-height:38px;box-shadow:0 4px 14px rgba(0,0,0,0.5);">
                    <span style="font-family:'Cinzel',Georgia,serif;font-size:19px;font-weight:700;color:#F5D899;letter-spacing:1px;">P</span>
                  </td>
                </tr>
              </table>
              <div style="margin:0 0 5px;color:#F5D899;font-family:'Cinzel',Georgia,serif;font-size:20px;font-weight:700;letter-spacing:6px;text-transform:uppercase;text-shadow:0 2px 10px rgba(245,216,153,0.2);">PREVA</div>
              <div style="margin:0 auto;color:#9E8E75;font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Kitchen &bull; Redford Township</div>
              <div style="width:56px;height:1px;background:linear-gradient(90deg, transparent, #D4AF37 50%, transparent);margin:12px auto 0;"></div>
            </td>
          </tr>
          <!-- Main Content -->
          <tr>
            <td class="content-cell" style="padding:28px 38px 26px;">
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td>
                    <!-- Pill Badge -->
                    <div style="margin:0 0 12px;">
                      <span style="display:inline-block;padding:4px 12px;background:rgba(212,175,55,0.12);border:1px solid rgba(212,175,55,0.32);border-radius:999px;color:#F3D58C;font-size:9px;font-weight:800;letter-spacing:1.5px;text-transform:uppercase;">
                        ${icon ? `<span style="margin-right:6px;">${icon}</span>` : ''}New Website Submission
                      </span>
                    </div>
                    <h1 style="margin:0 0 6px;color:#FFFFFF;font-family:'Cinzel',Georgia,serif;font-size:19px;font-weight:600;line-height:1.25;letter-spacing:0.2px;">${escapeHtml(title)}</h1>
                    <p style="margin:0 0 20px;color:#B3A795;font-size:13px;line-height:1.55;">${escapeHtml(subtitle)}</p>

                    <!-- Details Table Container -->
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
              </table>
            </td>
          </tr>
          <!-- Action Button -->
          ${adminLink ? `
          <tr>
            <td style="padding:0 38px 28px;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td align="center">
                    <a href="${adminLink}" class="cta-btn" style="display:inline-block;background:linear-gradient(135deg, #F5D899 0%, #D4AF37 50%, #A87F22 100%);color:#0D0A06;font-family:'Plus Jakarta Sans',Arial,sans-serif;font-weight:800;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;padding:13px 34px;border-radius:999px;text-decoration:none;box-shadow:0 8px 24px rgba(212,175,55,0.3);">${escapeHtml(adminLabel)} &rarr;</a>
                  </td>
                </tr>
              </table>
            </td>
          </tr>` : ''}
          <!-- Footer -->
          <tr>
            <td style="background:#0C0B09;padding:20px 34px;border-top:1px solid #241D12;text-align:center;">
              <p style="margin:0 0 4px;color:#E5DAC6;font-family:'Cinzel',Georgia,serif;font-size:12px;letter-spacing:2.5px;font-weight:600;">PREVA KITCHEN</p>
              <p style="margin:0 0 8px;color:#786E5E;font-size:10px;line-height:1.6;">
                ${BRAND_ADDRESS}<br>
                <a href="tel:3132863586" style="color:#C9A96E;text-decoration:none;">${BRAND_PHONE}</a> &bull;
                <a href="${escapeHtml(siteUrl)}" style="color:#C9A96E;text-decoration:none;">${escapeHtml(siteUrl.replace(/^https?:\/\//, ''))}</a>
              </p>
              <p style="margin:0;color:#544D42;font-size:9px;line-height:1.5;">PREVA Kitchen Notification &bull; Reply directly to contact the guest or applicant</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/* ══════════════════════════════════════════════════════════════════════════
   Public notification functions
   ══════════════════════════════════════════════════════════════════════════ */

/**
 * New order confirmed by Stripe or test mode (Staff alert).
 */
export async function notifyNewOrder(order) {
  const adminUrl = String(process.env.ADMIN_URL || 'https://prevakitchen.com/admin').trim();
  const total = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
    .format((Number(order.totalCents) || 0) / 100);
  const lines = (order.lines || [])
    .map(l => `${l.qty}× ${escapeHtml(l.name)}${l.options ? ` (${escapeHtml(l.options)})` : ''}`)
    .join('<br>');

  const timingInfo = order.isScheduled && order.scheduledAt
    ? `📅 Scheduled for: ${new Date(order.scheduledAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}`
    : `⚡ ASAP (~${order.fulfilment === 'DELIVERY' ? '45' : '25'} min)`;

  return send({
    subject: `🍽️ New Order #${order.orderNumber} — ${total} · Preva Kitchen`,
    html: wrap({
      icon: '🍽️',
      title: `New Order #${order.orderNumber}`,
      subtitle: `${order.fulfilment === 'DELIVERY' ? 'Delivery' : 'Pickup'} · ${total}`,
      tableRows:
        row('Customer', order.customer?.name) +
        row('Phone', order.customer?.phone) +
        row('Email', order.customer?.email) +
        row('Type', order.fulfilment) +
        row('Timing', timingInfo) +
        (order.fulfilment === 'DELIVERY' ? row('Address', order.customer?.address) : '') +
        row('Items', lines, true) +
        row('Total', total) +
        row('Note', order.customer?.note),
      adminLink: `${adminUrl}/orders`,
      adminLabel: 'Open Orders Dashboard',
    }),
  });
}

/**
 * Customer Order Confirmation & Receipt Email.
 */
export async function notifyCustomerOrder(order) {
  if (!order.customer?.email) return false;
  const siteUrl = String(process.env.STOREFRONT_URL || 'https://prevakitchen.com').trim();
  const trackUrl = `${siteUrl}/order/${order.orderNumber}`;
  const total = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
    .format((Number(order.totalCents) || 0) / 100);
  const subtotal = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
    .format((Number(order.subtotalCents) || 0) / 100);
  const tax = new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' })
    .format((Number(order.taxCents) || 0) / 100);
  const delivery = order.deliveryCents
    ? new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(order.deliveryCents / 100)
    : 'Free';

  const itemsHtml = (order.lines || []).map(line => `
    <tr>
      <td style="padding:10px 0;border-bottom:1px solid #282828;color:#eee;font-size:14px">
        <b>${line.qty}×</b> ${escapeHtml(line.name)}
        ${line.options ? `<br><span style="font-size:12px;color:#888">${escapeHtml(line.options)}</span>` : ''}
        ${line.note ? `<br><span style="font-size:12px;color:#C9A84C">Note: ${escapeHtml(line.note)}</span>` : ''}
      </td>
      <td style="padding:10px 0;border-bottom:1px solid #282828;color:#C9A84C;font-size:14px;text-align:right;vertical-align:top;font-weight:600">
        ${new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format((line.unitCents * line.qty) / 100)}
      </td>
    </tr>
  `).join('');

  let timingText = '';
  if (order.fulfilment === 'PICKUP') {
    timingText = order.isScheduled && order.scheduledAt
      ? `📅 Scheduled Pickup: <b>${new Date(order.scheduledAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' })}</b>`
      : '⚡ Ready for pickup in approximately <b>25 minutes</b>';
  } else {
    timingText = '⚡ Estimated arrival in approximately <b>45 minutes</b>';
  }

  const fulfillmentDetails = order.fulfilment === 'DELIVERY'
    ? `<tr><td style="padding:4px 0;color:#888;font-size:13px">Delivery Address:</td><td style="padding:4px 0;color:#eee;font-size:13px;text-align:right">${escapeHtml(order.customer?.address)}${order.customer?.postcode ? `, ${escapeHtml(order.customer.postcode)}` : ''}</td></tr>`
    : `<tr><td style="padding:4px 0;color:#888;font-size:13px">Pickup Location:</td><td style="padding:4px 0;color:#eee;font-size:13px;text-align:right">Preva Kitchen Counter (13090 Inkster Rd)</td></tr>`;

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:'Segoe UI',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#161616;border-radius:16px;border:1px solid rgba(201,168,76,0.3);overflow:hidden;max-width:580px;box-shadow:0 12px 36px rgba(0,0,0,0.7)">
        <tr>
          <td style="background:linear-gradient(135deg,#1f1609 0%,#2d1f08 100%);padding:32px;border-bottom:1px solid rgba(201,168,76,0.3);text-align:center">
            <span style="font-size:36px">🍽️</span>
            <h1 style="margin:12px 0 6px;color:#fff;font-size:24px;font-weight:700;letter-spacing:0.5px">Order Confirmed!</h1>
            <p style="margin:0;color:#C9A84C;font-size:15px;font-weight:600">Order #${order.orderNumber}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px">
            <p style="margin:0 0 18px;color:#ddd;font-size:15px;line-height:1.5">
              Hi <b>${escapeHtml(order.customer?.name || 'there')}</b>, thank you for your order! We've received your order and payment.
            </p>
            <div style="background:rgba(201,168,76,0.08);border:1px solid rgba(201,168,76,0.25);border-radius:12px;padding:16px;margin-bottom:24px">
              <b style="display:block;color:#fff;font-size:14px;margin-bottom:4px">
                ${order.fulfilment === 'DELIVERY' ? '🚗 Doorstep Delivery' : '🏃 Counter Pickup'}
              </b>
              <span style="color:#ddd;font-size:13px;line-height:1.5;display:block">
                ${timingText}
              </span>
            </div>
            <h3 style="margin:0 0 12px;color:#C9A84C;font-size:14px;text-transform:uppercase;letter-spacing:1px">Your Items</h3>
            <table width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:20px">
              ${itemsHtml}
            </table>
            <table width="100%" cellpadding="0" cellspacing="0" style="border-top:1px solid #282828;padding-top:12px;margin-bottom:24px">
              <tr><td style="padding:4px 0;color:#888;font-size:13px">Subtotal:</td><td style="padding:4px 0;color:#eee;font-size:13px;text-align:right">${subtotal}</td></tr>
              ${order.fulfilment === 'DELIVERY' ? `<tr><td style="padding:4px 0;color:#888;font-size:13px">Delivery Fee:</td><td style="padding:4px 0;color:#eee;font-size:13px;text-align:right">${delivery}</td></tr>` : ''}
              <tr><td style="padding:4px 0;color:#888;font-size:13px">Tax:</td><td style="padding:4px 0;color:#eee;font-size:13px;text-align:right">${tax}</td></tr>
              ${fulfillmentDetails}
              <tr><td style="padding:10px 0 0;color:#fff;font-size:16px;font-weight:700">Total Paid:</td><td style="padding:10px 0 0;color:#C9A84C;font-size:18px;font-weight:800;text-align:right">${total}</td></tr>
            </table>
            <div style="text-align:center;margin-top:28px">
              <a href="${trackUrl}" style="display:inline-block;background:linear-gradient(135deg,#F0D080 0%,#C9A84C 100%);color:#000;font-weight:800;font-size:14.5px;padding:14px 36px;border-radius:12px;text-decoration:none;letter-spacing:0.5px;box-shadow:0 6px 20px rgba(201,168,76,0.35)">
                TRACK ORDER LIVE →
              </a>
              <p style="margin:12px 0 0;color:#888;font-size:12px">
                Track live preparation &amp; dispatch updates in real time
              </p>
            </div>
          </td>
        </tr>
        <tr>
          <td style="background:#111;padding:20px 32px;border-top:1px solid #282828;text-align:center">
            <b style="color:#eee;font-size:13px">Preva Kitchen</b>
            <p style="margin:4px 0 0;color:#666;font-size:11.5px">13090 Inkster Rd, Redford Township, MI 48239 · (313) 541-7000</p>
            <p style="margin:4px 0 0;color:#555;font-size:11px">If you have any questions, reply to this email or call us directly.</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return send({
    to: order.customer.email,
    subject: `✅ Order Confirmed #${order.orderNumber} — Preva Kitchen`,
    html,
  });
}

/**
 * Customer Order Status Update Email (e.g. Ready for Pickup, Out for Delivery, Delivered).
 */
export async function notifyCustomerOrderStatus(order, newStatus) {
  if (!order.customer?.email) return false;
  const siteUrl = String(process.env.STOREFRONT_URL || 'https://prevakitchen.com').trim();
  const trackUrl = `${siteUrl}/order/${order.orderNumber}`;

  let subject = '';
  let heading = '';
  let message = '';
  let icon = '';

  if (newStatus === 'READY' && order.fulfilment === 'PICKUP') {
    icon = '🏃';
    subject = `🏃 Your Preva Kitchen Order #${order.orderNumber} is Ready for Pickup!`;
    heading = 'Your Order is Ready!';
    message = 'Your food has been freshly prepared and packed. Please collect it at the Preva Kitchen counter.';
  } else if (newStatus === 'ON_THE_WAY' && order.fulfilment === 'DELIVERY') {
    icon = '🚗';
    subject = `🚗 Your Preva Kitchen Order #${order.orderNumber} is On the Way!`;
    heading = 'Out for Delivery!';
    message = `Our delivery driver has picked up your food and is heading to ${escapeHtml(order.customer?.address || 'your address')}.`;
  } else if (order.fulfilment === 'DELIVERY' && newStatus === 'DELIVERED') {
    icon = '✨';
    subject = `✨ Enjoy your meal! Order #${order.orderNumber} Delivered`;
    heading = 'Order Delivered!';
    message = 'Your order has been delivered. Thank you for ordering with Preva Kitchen. We hope you enjoy your meal!';
  } else if (order.fulfilment === 'PICKUP' && newStatus === 'COMPLETED') {
    icon = '✨';
    subject = `✨ Enjoy your meal! Order #${order.orderNumber} Completed`;
    heading = 'Order Completed!';
    message = 'Thank you for ordering with Preva Kitchen. We hope you enjoy your meal!';
  } else if (newStatus === 'CANCELLED') {
    icon = 'X';
    subject = `Order #${order.orderNumber} Cancelled - Preva Kitchen`;
    heading = 'Order Cancelled';
    message = order.cancellationReason
      ? `Your order was cancelled: ${escapeHtml(order.cancellationReason)}`
      : 'Your order has been cancelled. Please contact Preva Kitchen if you need assistance.';
  } else {
    return false;
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:'Segoe UI',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:32px 16px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="background:#161616;border-radius:16px;border:1px solid rgba(201,168,76,0.3);overflow:hidden;max-width:540px">
        <tr>
          <td style="background:linear-gradient(135deg,#1f1609 0%,#2d1f08 100%);padding:28px 32px;border-bottom:1px solid rgba(201,168,76,0.3);text-align:center">
            <span style="font-size:36px">${icon}</span>
            <h1 style="margin:10px 0 4px;color:#fff;font-size:22px;font-weight:700">${heading}</h1>
            <p style="margin:0;color:#C9A84C;font-size:14px;font-weight:600">Order #${order.orderNumber}</p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 32px;text-align:center">
            <p style="margin:0 0 20px;color:#ddd;font-size:15px;line-height:1.6">${message}</p>
            <a href="${trackUrl}" style="display:inline-block;background:linear-gradient(135deg,#F0D080 0%,#C9A84C 100%);color:#000;font-weight:800;font-size:14px;padding:12px 32px;border-radius:10px;text-decoration:none">
              VIEW ORDER DETAILS →
            </a>
          </td>
        </tr>
        <tr>
          <td style="background:#111;padding:16px 32px;border-top:1px solid #282828;text-align:center">
            <p style="margin:0;color:#666;font-size:11.5px">Preva Kitchen · 13090 Inkster Rd, Redford Township, MI 48239</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  return send({
    to: order.customer.email,
    subject,
    html,
  });
}

/**
 * New table reservation submitted.
 */
export async function notifyReservation(data) {
  const adminUrl = String(process.env.ADMIN_URL || 'https://prevakitchen.com/admin').trim();
  const submitted = data.submittedAt ? new Date(data.submittedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '';
  return send({
    to: getReservationRecipients(),
    replyTo: data.email || undefined,
    subject: 'New Reservation Received - PREVA Kitchen',
    html: wrap({
      icon: 'R',
      title: 'New Reservation Request',
      subtitle: `${data.guests || '?'} guests · ${data.date || 'Date TBD'} at ${data.time || 'Time TBD'}`,
      tableRows:
        row('Name', data.name) +
        row('Phone', data.phone) +
        row('Email', data.email) +
        row('Guests', data.guests) +
        row('Date', data.date) +
        row('Time', data.time) +
        row('Occasion', data.occasion) +
        row('Notes', data.notes) +
        row('Reference', data.referenceId) +
        row('Submitted', submitted) +
        row('Page', data.pageUrl),
      adminLink: `${adminUrl}/reservations`,
      adminLabel: 'Open Reservations',
    }),
    text: `New Reservation Request\n\n${textDetails([
      ['Customer', data.name],
      ['Email', data.email],
      ['Phone', data.phone],
      ['Date', data.date],
      ['Time', data.time],
      ['Guests', data.guests],
      ['Occasion', data.occasion],
      ['Notes', data.notes],
      ['Reference', data.referenceId],
      ['Submitted', submitted]
    ])}\n\nOpen reservations: ${adminUrl}/reservations`,
    formType: 'RESERVATION',
    recipientType: 'admin',
    referenceId: data.referenceId
  });
}

/**
 * New VIP table / bottle-service request.
 */
export async function notifyVipRequest(data) {
  const adminUrl = String(process.env.ADMIN_URL || 'https://prevakitchen.com/admin').trim();
  return send({
    subject: `⭐ VIP Request — ${data.name} · ${data.date || 'Date TBD'} · Preva Kitchen`,
    html: wrap({
      icon: '⭐',
      title: 'New VIP Request',
      subtitle: `${data.guests || '?'} guests · ${data.date || 'Date TBD'}`,
      tableRows:
        row('Name', data.name) +
        row('Phone', data.phone) +
        row('Email', data.email) +
        row('Guests', data.guests) +
        row('Date', data.date) +
        row('Occasion', data.occasion) +
        row('Notes', data.notes),
      adminLink: `${adminUrl}/vip-requests`,
      adminLabel: 'Open VIP Requests',
    }),
  });
}

/**
 * New contact form enquiry.
 */
export async function notifyContactEnquiry(data) {
  const adminUrl = String(process.env.ADMIN_URL || 'https://prevakitchen.com/admin').trim();
  return send({
    to: getContactRecipients(),
    replyTo: data.email || undefined,
    subject: `✉️ Contact Enquiry — ${data.name} · Preva Kitchen`,
    html: wrap({
      icon: '✉️',
      title: 'New Contact Enquiry',
      subtitle: data.subject || 'General enquiry',
      tableRows:
        row('Name', data.name) +
        row('Email', data.email) +
        row('Phone', data.phone) +
        row('Subject', data.subject) +
        row('Message', data.message) +
        row('Reference', data.referenceId) +
        row('Submitted', data.submittedAt ? new Date(data.submittedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '') +
        row('Page', data.pageUrl),
      adminLink: `${adminUrl}/contact-enquiries`,
      adminLabel: 'Open Enquiries',
    }),
    formType: 'CONTACT',
    recipientType: 'admin',
    referenceId: data.referenceId
  });
}

/**
 * New career application received.
 */
export async function notifyCareerApplication(data) {
  const adminUrl = String(process.env.ADMIN_URL || 'https://prevakitchen.com/admin').trim();
  const submitted = data.submittedAt ? new Date(data.submittedAt).toLocaleString('en-US', { dateStyle: 'medium', timeStyle: 'short' }) : '';
  return send({
    to: getCareerRecipients(),
    replyTo: data.email || undefined,
    attachments: (() => {
      if (!data.resume?.data) return undefined;
      const raw = String(data.resume.data);
      const base64Index = raw.indexOf(';base64,');
      const buffer = base64Index !== -1
        ? Buffer.from(raw.slice(base64Index + 8), 'base64')
        : (Buffer.isBuffer(data.resume.data) ? data.resume.data : Buffer.from(raw, 'base64'));
      return [{
        filename: data.resume.name || 'resume.pdf',
        content: buffer,
        contentType: data.resume.mimeType || data.resume.type || 'application/pdf'
      }];
    })(),
    subject: 'New Career Application Received - PREVA Kitchen',
    html: wrap({
      icon: 'C',
      title: 'New Career Application',
      subtitle: `Position: ${data.position || data.role}`,
      tableRows:
        row('Name', `${data.firstName} ${data.lastName}`) +
        row('Email', data.email) +
        row('Phone', data.phone) +
        row('Position', data.position || data.role) +
        row('Availability', data.availability) +
        row('Start Date', data.startDate) +
        row('Message', data.message) +
        row('Resume', data.resume?.name || 'Not provided') +
        row('Resume Type', data.resume?.mimeType) +
        row('Resume Size', data.resume?.size ? `${Math.ceil(data.resume.size / 1024)} KB` : '') +
        row('Reference', data.referenceId) +
        row('Submitted', submitted) +
        row('Page', data.pageUrl),
      adminLink: `${adminUrl}/career-applications`,
      adminLabel: 'View Applications',
    }),
    text: `New Career Application\n\n${textDetails([
      ['Candidate', `${data.firstName || ''} ${data.lastName || ''}`.trim()],
      ['Email', data.email],
      ['Phone', data.phone],
      ['Position', data.position || data.role],
      ['Availability', data.availability],
      ['Start Date', data.startDate],
      ['Message', data.message],
      ['Resume', data.resume?.name || 'Not provided'],
      ['Reference', data.referenceId],
      ['Submitted', submitted]
    ])}\n\nView applications: ${adminUrl}/career-applications`,
    formType: 'CAREER_APPLICATION',
    recipientType: 'admin',
    referenceId: data.referenceId
  });
}

/* ══════════════════════════════════════════════════════════════════════════
   Customer confirmation emails — Reservation, Contact, Career Application
   ──────────────────────────────────────────────────────────────────────────
   Branded acknowledgement sent to the address the visitor typed in. Shares
   one template so all three read as the same company, not three off-brand
   one-offs.
   ══════════════════════════════════════════════════════════════════════════ */

function customerConfirmationHtml({ eyebrow, heading, name, referenceId, introLine, summaryRows, nextSteps, ctaLabel, ctaHref }) {
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
      .email-container { width: 100% !important; max-width: 100% !important; border-radius: 0 !important; border-left: none !important; border-right: none !important; }
      .content-cell { padding: 26px 20px !important; }
      .header-cell { padding: 28px 20px 22px !important; }
      .label-col { width: 34% !important; font-size: 10px !important; padding-right: 8px !important; }
      .cta-btn { display: block !important; width: 100% !important; box-sizing: border-box !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#070708;font-family:'Plus Jakarta Sans',-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
  <div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent">${escapeHtml(heading)} · Reference ${escapeHtml(referenceId || '')}</div>
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:#070708;width:100%;padding:40px 14px;table-layout:fixed;">
    <tr>
      <td align="center" valign="top">
        <!-- Main Card -->
        <table role="presentation" class="email-container" width="100%" cellpadding="0" cellspacing="0" style="max-width:640px;margin:0 auto;background:#131210;border-radius:20px;border:1px solid #382D1B;box-shadow:0 24px 60px rgba(0,0,0,0.8),0 0 1px rgba(212,175,55,0.4);overflow:hidden;">
          <!-- Top Accent Gold Line -->
          <tr>
            <td height="3" style="background:linear-gradient(90deg, #8A641E 0%, #F5D899 50%, #8A641E 100%);font-size:0;line-height:0;">&nbsp;</td>
          </tr>
          <!-- Luxury Header -->
          <tr>
            <td class="header-cell" style="background:linear-gradient(180deg, #1C1710 0%, #13110E 100%);padding:28px 36px 22px;border-bottom:1px solid #382D1B;text-align:center;">
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto 12px;">
                <tr>
                  <td align="center" style="width:38px;height:38px;border-radius:10px;background:linear-gradient(135deg, #2D2313 0%, #1A1408 100%);border:1px solid #6E5325;text-align:center;line-height:38px;box-shadow:0 4px 14px rgba(0,0,0,0.5);">
                    <span style="font-family:'Cinzel',Georgia,serif;font-size:19px;font-weight:700;color:#F5D899;letter-spacing:1px;">P</span>
                  </td>
                </tr>
              </table>
              <div style="margin:0 0 5px;color:#F5D899;font-family:'Cinzel',Georgia,serif;font-size:20px;font-weight:700;letter-spacing:6px;text-transform:uppercase;text-shadow:0 2px 10px rgba(245,216,153,0.2);">PREVA</div>
              <div style="margin:0 auto;color:#9E8E75;font-size:9px;font-weight:700;letter-spacing:3px;text-transform:uppercase;">Kitchen &bull; Redford Township</div>
              <div style="width:56px;height:1px;background:linear-gradient(90deg, transparent, #D4AF37 50%, transparent);margin:12px auto 0;"></div>
            </td>
          </tr>
          <!-- Content Body -->
          <tr>
            <td class="content-cell" style="padding:28px 38px 26px;">
              <p style="margin:0 0 8px;color:#C9A96E;font-size:9px;font-weight:800;letter-spacing:2px;text-transform:uppercase;">${escapeHtml(eyebrow || 'PREVA Concierge')}</p>
              <h1 style="margin:0 0 12px;color:#FFFFFF;font-family:'Cinzel',Georgia,serif;font-size:19px;font-weight:600;line-height:1.25;letter-spacing:0.2px;">${escapeHtml(heading)}</h1>
              ${referenceId ? `<div style="margin:0 0 18px;"><span style="display:inline-block;background:linear-gradient(135deg,#2E2414 0%,#1A140A 100%);color:#F5D899;border:1px solid #735728;padding:4px 12px;border-radius:6px;font-weight:700;font-family:Consolas,monospace;font-size:11px;letter-spacing:1px;">REFERENCE #${escapeHtml(referenceId)}</span></div>` : ''}
              <p style="margin:0 0 20px;color:#DDD4C7;font-size:13px;line-height:1.65;">
                Hello <b style="color:#FFF8EC;">${escapeHtml(name || 'there')}</b>,<br><br>${introLine}
              </p>
              <!-- Details Box -->
              <p style="margin:0 0 8px;color:#A8987E;font-size:10px;font-weight:800;letter-spacing:1.6px;text-transform:uppercase;">Summary of Request</p>
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#09090B;border:1px solid #282218;border-radius:14px;margin-bottom:24px;overflow:hidden;">
                <tr>
                  <td style="padding:8px 20px;">
                    <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
                      ${summaryRows}
                    </table>
                  </td>
                </tr>
              </table>
              <!-- What happens next Callout -->
              <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg, #1A150D 0%, #120F09 100%);border-left:3px solid #D4AF37;border-radius:10px;border-top:1px solid #2C2213;border-right:1px solid #2C2213;border-bottom:1px solid #2C2213;margin-bottom:22px;">
                <tr>
                  <td style="padding:14px 18px;">
                    <p style="margin:0 0 5px;color:#F5D899;font-size:12px;font-weight:700;letter-spacing:0.4px;">✨ What happens next</p>
                    <p style="margin:0;color:#C4BBAE;font-size:12px;line-height:1.6;">${nextSteps}</p>
                  </td>
                </tr>
              </table>
              ${ctaLabel ? `
              <table role="presentation" cellpadding="0" cellspacing="0" style="margin:0 auto;">
                <tr>
                  <td align="center">
                    <a href="${safeCtaHref}" class="cta-btn" style="display:inline-block;background:linear-gradient(135deg, #F5D899 0%, #D4AF37 50%, #A87F22 100%);color:#0D0A06;font-family:'Plus Jakarta Sans',Arial,sans-serif;font-weight:800;font-size:11px;letter-spacing:1.4px;text-transform:uppercase;padding:13px 34px;border-radius:999px;text-decoration:none;box-shadow:0 8px 24px rgba(212,175,55,0.3);">${escapeHtml(ctaLabel)} &rarr;</a>
                  </td>
                </tr>
              </table>` : ''}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="background:#0C0B09;padding:20px 34px;border-top:1px solid #241D12;text-align:center;">
              <p style="margin:0 0 4px;color:#E5DAC6;font-family:'Cinzel',Georgia,serif;font-size:12px;letter-spacing:2.5px;font-weight:600;">${BRAND_NAME}</p>
              <p style="margin:0 0 8px;color:#786E5E;font-size:10px;line-height:1.6;">
                ${BRAND_ADDRESS}<br>
                <a href="tel:3132863586" style="color:#C9A96E;text-decoration:none;">${BRAND_PHONE}</a> &bull;
                <a href="${escapeHtml(siteUrl)}" style="color:#C9A96E;text-decoration:none;">${escapeHtml(siteUrl.replace(/^https?:\/\//, ''))}</a>
              </p>
              <p style="margin:0;color:#544D42;font-size:9px;line-height:1.5;">Fine Dining & Hospitality &bull; Redford Township, MI</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

/** Customer confirmation for a table reservation request. */
export async function notifyReservationCustomer(data) {
  if (!data.email) return false;
  const replyTo = getReservationRecipients()[0];
  return send({
    to: data.email,
    replyTo,
    subject: 'Reservation Request Received - PREVA Kitchen',
    html: customerConfirmationHtml({
      eyebrow: 'Reservation concierge',
      heading: 'Your request is with our host.',
      name: data.name,
      referenceId: data.referenceId,
      introLine: `Thank you for your reservation request at ${BRAND_NAME}. We've received your details. The PREVA team will contact you if any additional information or confirmation is required.`,
      summaryRows:
        row('Guests', data.guests) +
        row('Date', data.date) +
        row('Time', data.time) +
        row('Occasion', data.occasion) +
        row('Notes', data.notes),
      nextSteps: `Our host reviews new requests throughout service and will contact you if confirmation or any additional information is required. If your date is urgent, call us directly at ${BRAND_PHONE}.`,
      ctaLabel: 'Visit PREVA Kitchen',
      ctaHref: `${getSiteUrl()}/reservations`
    }),
    text: `Hello ${data.name || 'there'},\n\nThank you for your reservation request at PREVA Kitchen. We have received your details, and our team will contact you if confirmation or additional information is required.\n\n${textDetails([
      ['Reference', data.referenceId],
      ['Date', data.date],
      ['Time', data.time],
      ['Guests', data.guests],
      ['Occasion', data.occasion],
      ['Notes', data.notes]
    ])}\n\nQuestions? Call ${BRAND_PHONE}.\n${getSiteUrl()}/reservations`,
    formType: 'RESERVATION',
    recipientType: 'customer',
    referenceId: data.referenceId
  });
}

/** Customer confirmation for a contact/enquiry form submission. */
export async function notifyContactCustomer(data) {
  if (!data.email) return false;
  return send({
    to: data.email,
    subject: `✅ We've Got Your Message — ${data.referenceId} · Preva Kitchen`,
    html: customerConfirmationHtml({
      icon: '✉️',
      heading: 'Message Received!',
      name: data.name,
      referenceId: data.referenceId,
      introLine: `thanks for reaching out to ${BRAND_NAME}. We've received your message and someone from our team will get back to you soon.`,
      summaryRows:
        row('Subject', data.subject || 'General enquiry') +
        row('Message', data.message, false),
      nextSteps: `We typically reply within 1 business day. For anything urgent, call us at ${BRAND_PHONE}.`
    }),
    formType: 'CONTACT',
    recipientType: 'customer',
    referenceId: data.referenceId
  });
}

/** Customer confirmation for a career application submission. */
export async function notifyCareerApplicationCustomer(data) {
  if (!data.email) return false;
  const candidateName = `${data.firstName || ''} ${data.lastName || ''}`.trim();
  const position = data.position || data.role || '';
  const replyTo = getCareerRecipients()[0];
  return send({
    to: data.email,
    replyTo,
    subject: 'Application Received - PREVA Kitchen',
    html: customerConfirmationHtml({
      eyebrow: 'Careers at PREVA',
      heading: 'Thank you for bringing your talent to us.',
      name: candidateName,
      referenceId: data.referenceId,
      introLine: `Thank you for applying to ${BRAND_NAME}. We've received your application for the <b style="color:${BRAND_COLOR}">${escapeHtml(position)}</b> position.`,
      summaryRows:
        row('Position', position) +
        row('Availability', data.availability) +
        row('Start Date', data.startDate),
      nextSteps: `Our hiring team will review your application and reach out by phone or email if your experience matches a current opportunity. No additional action is required right now.`,
      ctaLabel: 'Explore PREVA Careers',
      ctaHref: `${getSiteUrl()}/careers`
    }),
    text: `Hello ${candidateName || 'there'},\n\nThank you for applying to PREVA Kitchen. We have received your application for the ${position} position.\n\n${textDetails([
      ['Reference', data.referenceId],
      ['Position', position],
      ['Availability', data.availability],
      ['Available Start Date', data.startDate]
    ])}\n\nOur hiring team will contact you by phone or email if your experience matches a current opportunity.\n${getSiteUrl()}/careers`,
    formType: 'CAREER_APPLICATION',
    recipientType: 'customer',
    referenceId: data.referenceId
  });
}

// Explicit form-oriented names for new code; legacy notify* exports remain
// available because order/public routes already use that naming convention.
export const sendReservationCustomerEmail = notifyReservationCustomer;
export const sendReservationAdminEmail = notifyReservation;
export const sendCareerApplicantEmail = notifyCareerApplicationCustomer;
export const sendCareerAdminEmail = notifyCareerApplication;
