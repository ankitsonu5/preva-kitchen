import { Resend } from 'resend';

/* ══════════════════════════════════════════════════════════════════════════
   Email notifications — Preva Kitchen Staff Alerts
   ──────────────────────────────────────────────────────────────────────────
   Uses Resend (https://resend.com). Set RESEND_API_KEY in .env to enable.
   All functions fail silently so a missing key never crashes a customer request.
   ══════════════════════════════════════════════════════════════════════════ */

const BRAND_COLOR  = '#c9a96e';   // Preva gold

function getResendKey() {
  return String(process.env.RESEND_API_KEY || '').trim();
}
function getFromAddress() {
  return String(process.env.STAFF_EMAIL_FROM || 'onboarding@resend.dev').trim();
}
function getStaffEmail() {
  return String(process.env.STAFF_ALERT_EMAIL || '').trim();
}

/** Lazily created — avoids crashing at import when the key is missing. */
let _resend = null;
let _cachedKey = null;
function resend() {
  const key = getResendKey();
  if (!_resend || _cachedKey !== key) {
    _cachedKey = key;
    _resend = new Resend(key);
  }
  return _resend;
}

function configured() {
  return Boolean(getResendKey());
}

/** Send one email. Returns true on success, false (+ console.error) on failure. */
async function send({ to, subject, html }) {
  if (!configured()) {
    console.warn('[email] RESEND_API_KEY is not set in .env; skipping email.');
    return false;
  }
  const recipient = to || getStaffEmail();
  if (!recipient) {
    console.warn('[email] No recipient email specified.');
    return false;
  }
  try {
    const { error } = await resend().emails.send({
      from: getFromAddress(),
      to: recipient,
      subject,
      html,
    });
    if (error) {
      console.error('[email] Resend error:', error);
      return false;
    }
    console.log('[email] sent successfully to:', recipient, 'Subject:', subject);
    return true;
  } catch (err) {
    console.error('[email] send failed:', err.message);
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
  if (!value) return '';
  const display = isHtml ? value : escapeHtml(value);
  return `
    <tr>
      <td style="padding:6px 12px 6px 0;color:#888;font-size:13px;white-space:nowrap;vertical-align:top">${escapeHtml(label)}</td>
      <td style="padding:6px 0;color:#e8e0d5;font-size:13px">${display}</td>
    </tr>`;
}

function wrap({ icon, title, subtitle, tableRows, adminLink, adminLabel = 'View in Admin' }) {
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:'Segoe UI',Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0d0d0d;padding:32px 0">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0" style="background:#1a1a1a;border-radius:12px;border:1px solid #2a2a2a;overflow:hidden;max-width:600px">

        <!-- Header -->
        <tr>
          <td style="background:linear-gradient(135deg,#1a1208,#2b1e06);padding:28px 32px;border-bottom:1px solid ${BRAND_COLOR}40">
            <span style="font-size:28px">${icon}</span>
            <h1 style="margin:8px 0 4px;color:#fff;font-size:20px;font-weight:700">${escapeHtml(title)}</h1>
            <p style="margin:0;color:${BRAND_COLOR};font-size:13px">${escapeHtml(subtitle)}</p>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:28px 32px">
            <table cellpadding="0" cellspacing="0" width="100%">${tableRows}</table>
          </td>
        </tr>

        <!-- CTA -->
        ${adminLink ? `
        <tr>
          <td style="padding:0 32px 28px;text-align:center">
            <a href="${adminLink}" style="display:inline-block;background:${BRAND_COLOR};color:#0d0d0d;font-weight:700;font-size:14px;padding:12px 28px;border-radius:8px;text-decoration:none">${adminLabel}</a>
          </td>
        </tr>` : ''}

        <!-- Footer -->
        <tr>
          <td style="background:#111;padding:16px 32px;border-top:1px solid #2a2a2a;text-align:center">
            <p style="margin:0;color:#555;font-size:11px">Preva Kitchen Staff Alert · prevakitchen.com · Do not reply</p>
          </td>
        </tr>

      </table>
    </td></tr>
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
  return send({
    subject: `📅 New Reservation — ${data.name} · ${data.date || 'Date TBD'} · Preva Kitchen`,
    html: wrap({
      icon: '📅',
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
        row('Notes', data.notes),
      adminLink: `${adminUrl}/reservations`,
      adminLabel: 'Open Reservations',
    }),
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
        row('Message', data.message),
      adminLink: `${adminUrl}/contact-enquiries`,
      adminLabel: 'Open Enquiries',
    }),
  });
}

/**
 * New career application received.
 */
export async function notifyCareerApplication(data) {
  const adminUrl = String(process.env.ADMIN_URL || 'https://prevakitchen.com/admin').trim();
  return send({
    subject: `💼 New Application — ${data.firstName} ${data.lastName} for ${data.role} · Preva Kitchen`,
    html: wrap({
      icon: '💼',
      title: 'New Career Application',
      subtitle: `Role: ${data.role}`,
      tableRows:
        row('Name', `${data.firstName} ${data.lastName}`) +
        row('Email', data.email) +
        row('Phone', data.phone) +
        row('Role', data.role) +
        row('Availability', data.availability) +
        row('Start Date', data.startDate) +
        row('Message', data.message) +
        row('Resume', data.resume?.name || 'Attached'),
      adminLink: `${adminUrl}/career-applications`,
      adminLabel: 'View Applications',
    }),
  });
}
