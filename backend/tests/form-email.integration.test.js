import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/preva-email-test';
process.env.EMAIL_DRY_RUN = 'true';
process.env.ADMIN_EMAIL = 'admin@example.com';
process.env.HR_EMAIL = 'hr@example.com';

const { dispatch } = await import('../src/index.js');
const { col } = await import('../src/lib/db.js');

function request(headers = {}) {
  return { headers };
}

test('reservation validates, persists, and renders both notification emails', async () => {
  const reservations = await col('reservation');
  const before = await reservations.countDocuments();
  const payload = {
    name: 'Reservation Test',
    email: 'reservation@example.com',
    phone: '313-555-0101',
    date: '2099-10-20',
    time: '7:00 PM',
    guests: 4,
    notes: 'Window table'
  };

  const response = await dispatch({
    method: 'POST',
    path: '/reservations',
    body: payload,
    ip: 'test-reservation-ip',
    request: request({ referer: 'https://prevakitchen.com/reservations' })
  });

  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.match(response.body.referenceId, /^RES-/);
  assert.equal(await reservations.countDocuments(), before + 1);

  const duplicate = await dispatch({
    method: 'POST',
    path: '/reservations',
    body: payload,
    ip: 'test-reservation-ip',
    request: request()
  });
  assert.equal(duplicate.body.referenceId, response.body.referenceId);
  assert.equal(await reservations.countDocuments(), before + 1);
});

test('reservation rejects a submission without a customer email', async () => {
  const response = await dispatch({
    method: 'POST',
    path: '/reservations',
    body: {
      name: 'Missing Email',
      phone: '313-555-0102',
      date: '2099-10-21',
      time: '8:00 PM',
      guests: 2
    },
    ip: 'test-reservation-invalid-ip',
    request: request()
  });

  assert.equal(response.status, 400);
  assert.match(response.body.message, /email/i);
});

test('career application validates, persists, and renders both notification emails', async () => {
  const applications = await col('careerApplications');
  const before = await applications.countDocuments();
  const payload = {
    firstName: 'Career',
    lastName: 'Test',
    email: 'candidate@example.com',
    phone: '313-555-0103',
    role: 'general-application',
    availability: 'Open availability',
    startDate: '2099-11-01',
    message: 'Test application',
    consent: true,
    resume: {
      name: 'candidate.pdf',
      type: 'application/pdf',
      size: 9,
      data: 'data:application/pdf;base64,JVBERi0xLjQK'
    }
  };

  const response = await dispatch({
    method: 'POST',
    path: '/career-applications',
    body: payload,
    ip: 'test-career-ip',
    request: request({ referer: 'https://prevakitchen.com/careers/apply' })
  });

  assert.equal(response.status, 201);
  assert.equal(response.body.ok, true);
  assert.match(response.body.referenceId, /^APP-/);
  assert.equal(await applications.countDocuments(), before + 1);

  const saved = await applications.findOne({ email: payload.email });
  assert.equal(saved.resume.name, 'candidate.pdf');
  assert.equal(saved.role, 'general-application');
});
