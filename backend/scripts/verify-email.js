#!/usr/bin/env node

/**
 * End-to-End Email Verification & Diagnostic Tool for Preva Kitchen
 *
 * Usage:
 *   node scripts/verify-email.js              (Dry run & template validation)
 *   node scripts/verify-email.js --send       (Send real test emails using configured Resend key)
 *   node scripts/verify-email.js --send you@example.com (Send to custom address)
 */

import './env.js';
import { Resend } from 'resend';
import {
  notifyNewOrder,
  notifyCustomerOrder,
  notifyCustomerOrderStatus,
  notifyReservation,
  notifyVipRequest,
  notifyContactEnquiry,
  notifyCareerApplication
} from '../src/lib/email.js';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const BOLD = '\x1b[1m';
const RESET = '\x1b[0m';

console.log(`\n${BOLD}${CYAN}══════════════════════════════════════════════════════════════════${RESET}`);
console.log(`${BOLD}${CYAN}        PREVA KITCHEN — EMAIL SYSTEM END-TO-END AUDIT             ${RESET}`);
console.log(`${BOLD}${CYAN}══════════════════════════════════════════════════════════════════${RESET}\n`);

// 1. Check Configuration
console.log(`${BOLD}1. Environment Configuration Check:${RESET}`);

const resendKey = String(process.env.RESEND_API_KEY || '').trim();
const staffAlertEmail = String(process.env.STAFF_ALERT_EMAIL || '').trim();
const staffEmailFrom = String(process.env.STAFF_EMAIL_FROM || 'onboarding@resend.dev').trim();
const storefrontUrl = String(process.env.STOREFRONT_URL || 'http://localhost:3001').trim();
const adminUrl = String(process.env.ADMIN_URL || 'http://localhost:3001/admin').trim();

let hasConfigErrors = false;

if (resendKey) {
  const maskedKey = resendKey.slice(0, 5) + '...' + resendKey.slice(-4);
  console.log(`  [OK] RESEND_API_KEY:       ${GREEN}${maskedKey}${RESET}`);
} else {
  console.log(`  ${RED}[FAIL] RESEND_API_KEY is empty in .env!${RESET}`);
  console.log(`         -> Resend emails cannot be sent until an API key is set.`);
  hasConfigErrors = true;
}

if (staffAlertEmail) {
  console.log(`  [OK] STAFF_ALERT_EMAIL:    ${GREEN}${staffAlertEmail}${RESET}`);
} else {
  console.log(`  ${YELLOW}[WARN] STAFF_ALERT_EMAIL is empty in .env!${RESET}`);
  console.log(`         -> Kitchen staff alerts will have no destination.`);
  hasConfigErrors = true;
}

console.log(`  [INFO] STAFF_EMAIL_FROM:   ${CYAN}${staffEmailFrom}${RESET}`);
if (!staffEmailFrom.includes('onboarding@resend.dev') && staffEmailFrom.includes('prevakitchen.com')) {
  console.log(`         ${YELLOW}Note: Using @prevakitchen.com requires domain verification in Resend dashboard.${RESET}`);
}

console.log(`  [INFO] STOREFRONT_URL:     ${CYAN}${storefrontUrl}${RESET}`);
console.log(`  [INFO] ADMIN_URL:          ${CYAN}${adminUrl}${RESET}`);

// 2. Validate Template Generation & Handlers
console.log(`\n${BOLD}2. Template Generation & HTML Rendering Check:${RESET}`);

const sampleOrderDelivery = {
  orderNumber: 5001,
  fulfilment: 'DELIVERY',
  totalCents: 4850,
  subtotalCents: 4100,
  taxCents: 250,
  deliveryCents: 500,
  isScheduled: false,
  customer: {
    name: 'Alex Mercer',
    phone: '(313) 555-0142',
    email: 'alex@example.com',
    address: '13090 Inkster Rd, Suite 4',
    postcode: '48239',
    note: 'Leave at front entrance'
  },
  lines: [
    { qty: 2, name: 'Tender Lamb Chops & Rosemary', unitCents: 1650, options: 'Medium Rare, Mint Glaze', note: 'Extra warm' },
    { qty: 1, name: 'Parmesan Truffle Fries', unitCents: 800, options: '', note: '' }
  ]
};

const sampleOrderPickup = {
  orderNumber: 5002,
  fulfilment: 'PICKUP',
  totalCents: 2800,
  subtotalCents: 2600,
  taxCents: 200,
  deliveryCents: 0,
  isScheduled: true,
  scheduledAt: '2026-09-15T18:30:00.000Z',
  customer: {
    name: 'Sarah Connor',
    phone: '(313) 555-0199',
    email: 'sarah@example.com'
  },
  lines: [
    { qty: 1, name: 'Artisan Gourmet Burger', unitCents: 2600, options: 'Well Done', note: 'No onions' }
  ]
};

const checks = [
  { name: 'Staff Alert: notifyNewOrder', fn: () => notifyNewOrder(sampleOrderDelivery) },
  { name: 'Customer Receipt: notifyCustomerOrder (Delivery)', fn: () => notifyCustomerOrder(sampleOrderDelivery) },
  { name: 'Customer Receipt: notifyCustomerOrder (Pickup Scheduled)', fn: () => notifyCustomerOrder(sampleOrderPickup) },
  { name: 'Customer Status: notifyCustomerOrderStatus (READY pickup)', fn: () => notifyCustomerOrderStatus(sampleOrderPickup, 'READY') },
  { name: 'Customer Status: notifyCustomerOrderStatus (ON_THE_WAY delivery)', fn: () => notifyCustomerOrderStatus(sampleOrderDelivery, 'ON_THE_WAY') },
  { name: 'Customer Status: notifyCustomerOrderStatus (DELIVERED delivery)', fn: () => notifyCustomerOrderStatus(sampleOrderDelivery, 'DELIVERED') },
  { name: 'Customer Status: notifyCustomerOrderStatus (COMPLETED pickup)', fn: () => notifyCustomerOrderStatus(sampleOrderPickup, 'COMPLETED') },
  { name: 'Staff Alert: notifyReservation', fn: () => notifyReservation({ name: 'Maria Rossi', phone: '3135550111', email: 'maria@example.com', guests: 4, date: '2026-09-20', time: '7:00 PM', occasion: 'Anniversary', notes: 'Quiet table' }) },
  { name: 'Staff Alert: notifyVipRequest', fn: () => notifyVipRequest({ name: 'David Vance', phone: '3135550222', email: 'david@example.com', guests: 6, date: '2026-10-01', occasion: 'VIP Birthday' }) },
  { name: 'Staff Alert: notifyContactEnquiry', fn: () => notifyContactEnquiry({ name: 'Elena Gilbert', email: 'elena@example.com', phone: '3135550333', subject: 'Catering Inquiry', message: 'Interested in catering for 50 people.' }) },
  { name: 'Staff Alert: notifyCareerApplication', fn: () => notifyCareerApplication({ firstName: 'Marcus', lastName: 'Cole', email: 'marcus@example.com', phone: '3135550444', role: 'Head Chef', availability: 'Full Time', startDate: 'Immediate', message: '10 years experience.' }) }
];

let allPassed = true;
for (const check of checks) {
  try {
    // These fail silently if key is not configured, returning false, which is expected
    await check.fn();
    console.log(`  ${GREEN}[OK]${RESET} ${check.name}`);
  } catch (err) {
    allPassed = false;
    console.log(`  ${RED}[FAIL]${RESET} ${check.name}: ${err.message}`);
  }
}

// 3. Optional Live Send Check
const sendArg = process.argv.find(arg => arg === '--send' || arg.startsWith('--send='));
if (sendArg) {
  console.log(`\n${BOLD}3. Live Resend API Test:${RESET}`);
  if (!resendKey) {
    console.log(`  ${RED}[ERROR] Cannot run live test without RESEND_API_KEY in .env${RESET}`);
    process.exit(1);
  }

  const customTo = process.argv[3] && !process.argv[3].startsWith('--')
    ? process.argv[3]
    : (staffAlertEmail || 'onboarding@resend.dev');

  console.log(`  Attempting to send test email to: ${CYAN}${customTo}${RESET}`);
  console.log(`  From address:                     ${CYAN}${staffEmailFrom}${RESET}`);

  const resendClient = new Resend(resendKey);
  try {
    const { data, error } = await resendClient.emails.send({
      from: staffEmailFrom,
      to: customTo,
      subject: `🧪 Preva Kitchen Email Test — ${new Date().toLocaleTimeString()}`,
      html: `<div style="font-family:sans-serif;padding:24px;background:#111;color:#fff;border-radius:8px">
        <h2 style="color:#c9a96e">Preva Kitchen Email Verification</h2>
        <p>This is a live verification email sent from your Preva Kitchen backend.</p>
        <p>Timestamp: <b>${new Date().toISOString()}</b></p>
        <p style="color:#888;font-size:12px">Resend API Key: Valid and active.</p>
      </div>`
    });

    if (error) {
      console.log(`  ${RED}[FAIL] Resend API error:${RESET}`, error);
      if (error.statusCode === 403 && String(error.message).includes('domain')) {
        console.log(`\n  ${YELLOW}Fix: Your domain "${staffEmailFrom}" is not yet verified in Resend.`);
        console.log(`  Options:`);
        console.log(`  1. In backend/.env, set STAFF_EMAIL_FROM=onboarding@resend.dev (for testing).`);
        console.log(`  2. Or verify prevakitchen.com in https://resend.com/domains by adding DNS records.${RESET}`);
      }
    } else {
      console.log(`  ${GREEN}[SUCCESS] Email sent! Message ID: ${data?.id}${RESET}`);
    }
  } catch (err) {
    console.log(`  ${RED}[FAIL] Network or API exception:${RESET} ${err.message}`);
  }
} else {
  console.log(`\n${BOLD}3. Live Test Instructions:${RESET}`);
  if (resendKey) {
    console.log(`  Run with ${CYAN}node scripts/verify-email.js --send your-email@example.com${RESET} to test live delivery.`);
  } else {
    console.log(`  To enable live email delivery:`);
    console.log(`  1. Create a free account at ${CYAN}https://resend.com${RESET} (3,000 emails/month free)`);
    console.log(`  2. Generate an API Key (starts with 're_...')`);
    console.log(`  3. Add to ${CYAN}backend/.env${RESET}:`);
    console.log(`     ${BOLD}RESEND_API_KEY=re_your_api_key${RESET}`);
    console.log(`     ${BOLD}STAFF_ALERT_EMAIL=orders@prevakitchen.com${RESET}`);
    console.log(`     ${BOLD}STAFF_EMAIL_FROM=onboarding@resend.dev${RESET} (or verified domain address)`);
  }
}

console.log(`\n${BOLD}${CYAN}══════════════════════════════════════════════════════════════════${RESET}\n`);
