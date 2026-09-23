#!/usr/bin/env node

/**
 * Preva Kitchen email template/configuration verifier.
 *
 * Usage:
 *   npm run verify:email
 *   npm run verify:email -- --send you@example.com
 */

import './env.js';
import nodemailer from 'nodemailer';
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

const smtpHost = String(process.env.SMTP_HOST || 'smtp.gmail.com').trim();
const smtpPort = Number(process.env.SMTP_PORT) || 465;
const smtpUser = String(process.env.SMTP_USER || process.env.GMAIL_USER || '').trim();
const smtpPass = String(process.env.SMTP_PASS || process.env.GMAIL_APP_PASSWORD || '').trim();
const fromEmail = String(process.env.FROM_EMAIL || '').trim();

const reservationEmail = String(process.env.RESERVATION_EMAIL || 'reservations@prevakitchen.com').trim();
const contactEmail = String(process.env.CONTACT_EMAIL || 'info@prevakitchen.com').trim();
const careerEmail = String(process.env.CAREER_EMAIL || 'donnaw@prevaclub.com').trim();

console.log('\nPREVA Kitchen Nodemailer SMTP Configuration Check\n');
console.log(`SMTP Host:              ${smtpHost}`);
console.log(`SMTP Port:              ${smtpPort}`);
console.log(`SMTP User:              ${smtpUser ? `${GREEN}[CONFIGURED]${RESET} ${smtpUser}` : `${YELLOW}[NOT SET] (Set in .env)${RESET}`}`);
console.log(`SMTP Pass:              ${smtpPass ? `${GREEN}[CONFIGURED]${RESET} (hidden)` : `${YELLOW}[NOT SET] (Set in .env)${RESET}`}`);
console.log(`From Address:           ${fromEmail ? `${GREEN}[OK]${RESET} ${fromEmail}` : `${YELLOW}[DEFAULT] Preva Kitchen <reservations@prevakitchen.com>${RESET}`}`);
console.log(`Reservation Recipient:  ${GREEN}${reservationEmail}${RESET}`);
console.log(`Contact Recipient:      ${GREEN}${contactEmail}${RESET}`);
console.log(`Career Recipient:       ${GREEN}${careerEmail}${RESET}`);

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
  resume: { name: 'marcus-cole.pdf', mimeType: 'application/pdf', size: 48213, data: 'data:application/pdf;base64,JVBERi0xLjQK' },
  referenceId: 'APP-TEST0001',
  submittedAt: new Date(),
  pageUrl: 'https://prevakitchen.com/careers/apply'
};

process.env.EMAIL_DRY_RUN = 'true';
const checks = [
  ['reservation admin (→ reservations@prevakitchen.com)', () => notifyReservation(reservation)],
  ['reservation customer (→ customer confirmation)', () => notifyReservationCustomer(reservation)],
  ['career admin (→ donnaw@prevaclub.com)', () => notifyCareerApplication(application)],
  ['career applicant (→ applicant confirmation)', () => notifyCareerApplicationCustomer(application)]
];

let templateFailure = false;
console.log('\nEmail Render Verification:');
for (const [name, render] of checks) {
  try {
    const ok = await render();
    if (!ok) throw new Error('template returned false');
    console.log(`${GREEN}[OK]${RESET} rendered ${name}`);
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
  const recipient = inlineRecipient || process.argv[sendIndex + 1] || reservationEmail;

  if (!smtpUser || !smtpPass) {
    console.error(`\n${RED}[FAIL] A live send requires SMTP_USER and SMTP_PASS in .env.${RESET}`);
    process.exitCode = 1;
  } else {
    console.log(`\n${CYAN}Sending live test email to ${recipient} via Nodemailer (${smtpHost}:${smtpPort})...${RESET}`);
    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: smtpPort,
        secure: smtpPort === 465,
        auth: { user: smtpUser, pass: smtpPass }
      });
      const info = await transporter.sendMail({
        from: fromEmail || `Preva Kitchen <${smtpUser}>`,
        to: recipient,
        subject: 'PREVA Kitchen Nodemailer SMTP Test',
        html: '<p>The PREVA Kitchen Nodemailer SMTP integration is configured and delivering email successfully.</p>'
      });
      console.log(`${GREEN}[OK] Nodemailer message sent! Message ID: ${info?.messageId}${RESET}`);
    } catch (err) {
      console.error(`${RED}[FAIL] Nodemailer SMTP Error: ${err.message}${RESET}`);
      process.exitCode = 1;
    }
  }
} else {
  console.log(`\n${YELLOW}No live email was sent. Add -- --send you@example.com for a live delivery test.${RESET}`);
}

if (templateFailure) process.exitCode = 1;
