#!/usr/bin/env node

/**
 * Preva Kitchen email template/configuration verifier.
 *
 * Usage:
 *   npm run verify:email
 *   npm run verify:email -- --send you@example.com
 */

import './env.js';
import { Resend } from 'resend';
import {
  notifyReservation,
  notifyReservationCustomer,
  notifyCareerApplication,
  notifyCareerApplicationCustomer
} from '../src/lib/email.js';

const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const YELLOW = '\x1b[33m';
const CYAN = '\x1b[36m';
const RESET = '\x1b[0m';

const resendKey = String(process.env.RESEND_API_KEY || '').trim();
const fromEmail = String(process.env.FROM_EMAIL || process.env.STAFF_EMAIL_FROM || '').trim();
const adminEmail = String(
  process.env.ADMIN_EMAIL || process.env.ADMIN_EMAILS || process.env.STAFF_ALERT_EMAIL || ''
).trim();
const reservationAdmin = String(process.env.RESERVATION_ADMIN_EMAIL || adminEmail).trim();
const careerAdmin = String(process.env.CAREER_ADMIN_EMAIL || process.env.HR_EMAIL || adminEmail).trim();

console.log('\nPREVA Kitchen email verification\n');
console.log(`${resendKey ? `${GREEN}[OK]` : `${RED}[MISSING]`} RESEND_API_KEY${RESET}`);
console.log(`${fromEmail ? `${GREEN}[OK]` : `${RED}[MISSING]`} FROM_EMAIL${RESET}${fromEmail ? `: ${fromEmail}` : ''}`);
console.log(`${reservationAdmin ? `${GREEN}[OK]` : `${RED}[MISSING]`} reservation admin recipient${RESET}${reservationAdmin ? `: ${reservationAdmin}` : ''}`);
console.log(`${careerAdmin ? `${GREEN}[OK]` : `${RED}[MISSING]`} career/HR recipient${RESET}${careerAdmin ? `: ${careerAdmin}` : ''}`);

const reservation = {
  name: 'Maria Rossi',
  phone: '3135550111',
  email: 'maria@example.com',
  guests: 4,
  date: '2026-10-20',
  time: '7:00 PM',
  occasion: 'Anniversary',
  notes: 'Quiet table',
  referenceId: 'RES-TEST0001',
  submittedAt: new Date(),
  pageUrl: 'https://prevakitchen.com/reservations'
};

const application = {
  firstName: 'Marcus',
  lastName: 'Cole',
  email: 'marcus@example.com',
  phone: '3135550444',
  role: 'line-cook',
  position: 'Line Cook',
  availability: 'Open availability',
  startDate: '2026-10-01',
  message: 'Five years of kitchen experience.',
  resume: { name: 'marcus-cole.pdf', mimeType: 'application/pdf', size: 48213 },
  referenceId: 'APP-TEST0001',
  submittedAt: new Date(),
  pageUrl: 'https://prevakitchen.com/careers/apply'
};

// This flag is read at send time. It validates the complete render path while
// guaranteeing that the template audit itself cannot contact real recipients.
process.env.EMAIL_DRY_RUN = 'true';
const checks = [
  ['reservation admin', () => notifyReservation(reservation)],
  ['reservation customer', () => notifyReservationCustomer(reservation)],
  ['career admin', () => notifyCareerApplication(application)],
  ['career applicant', () => notifyCareerApplicationCustomer(application)]
];

let templateFailure = false;
for (const [name, render] of checks) {
  try {
    const ok = await render();
    if (!ok) throw new Error('template returned false');
    console.log(`${GREEN}[OK]${RESET} rendered ${name} email`);
  } catch (error) {
    templateFailure = true;
    console.error(`${RED}[FAIL]${RESET} ${name}: ${error.message}`);
  }
}

const sendIndex = process.argv.findIndex((argument) => argument === '--send' || argument.startsWith('--send='));
if (sendIndex !== -1) {
  const inlineRecipient = process.argv[sendIndex].startsWith('--send=')
    ? process.argv[sendIndex].slice('--send='.length)
    : '';
  const recipient = inlineRecipient || process.argv[sendIndex + 1] || reservationAdmin || adminEmail;

  if (!resendKey || !fromEmail || !recipient) {
    console.error(`${RED}[FAIL] A live send requires RESEND_API_KEY, FROM_EMAIL, and a recipient.${RESET}`);
    process.exitCode = 1;
  } else {
    console.log(`\n${CYAN}Sending live verification email to ${recipient}...${RESET}`);
    const client = new Resend(resendKey);
    const { data, error } = await client.emails.send({
      from: fromEmail,
      to: [recipient],
      subject: 'PREVA Kitchen email integration test',
      html: '<p>The PREVA Kitchen Resend integration is configured and delivering email.</p>'
    });
    if (error) {
      console.error(`${RED}[FAIL] Resend: ${error.message || JSON.stringify(error)}${RESET}`);
      process.exitCode = 1;
    } else {
      console.log(`${GREEN}[OK] Resend message id: ${data?.id}${RESET}`);
    }
  }
} else {
  console.log(`\n${YELLOW}No email was sent. Add -- --send you@example.com for a live delivery test.${RESET}`);
}

if (templateFailure) process.exitCode = 1;
