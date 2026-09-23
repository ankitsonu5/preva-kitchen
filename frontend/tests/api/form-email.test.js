import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock server-only so Vitest in Node can import route handlers
vi.mock('server-only', () => ({}));

// Mock nodemailer
const mockSendMail = vi.fn().mockResolvedValue({ messageId: '<test-message-id@prevakitchen.com>' });
const mockCreateTransport = vi.fn().mockReturnValue({ sendMail: mockSendMail });

vi.mock('nodemailer', () => ({
  default: {
    createTransport: mockCreateTransport
  }
}));

describe('Nodemailer SMTP Form Email Routes', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.SMTP_HOST = 'smtp.gmail.com';
    process.env.SMTP_PORT = '465';
    process.env.SMTP_SECURE = 'true';
    process.env.SMTP_USER = 'test@gmail.com';
    process.env.SMTP_PASS = 'secret123';
    process.env.FROM_EMAIL = 'Preva Kitchen <reservations@prevakitchen.com>';
    process.env.RESERVATION_EMAIL = 'reservations@prevakitchen.com';
    process.env.CONTACT_EMAIL = 'info@prevakitchen.com';
    process.env.CAREER_EMAIL = 'donnaw@prevaclub.com';
  });

  describe('Reservation Route (POST /api/reservations)', () => {
    it('successfully processes valid reservation and sends email to reservations@prevakitchen.com with customer replyTo', async () => {
      const { POST } = await import('@/app/api/reservations/route');

      const req = new Request('http://localhost:3000/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Jane Doe',
          email: 'jane@example.com',
          phone: '(313) 555-0199',
          date: '2026-10-15',
          time: '7:30 PM',
          guests: 4,
          occasion: 'Birthday',
          notes: 'Window booth preferred'
        })
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.referenceId).toMatch(/^RES-[A-Z0-9]{8}$/);

      // Verify email was sent via nodemailer
      expect(mockSendMail).toHaveBeenCalled();
      const mailCall = mockSendMail.mock.calls[0][0];
      expect(mailCall.to).toBe('reservations@prevakitchen.com');
      expect(mailCall.replyTo).toBe('jane@example.com');
      expect(mailCall.subject).toContain('Jane Doe');
      expect(mailCall.subject).toContain('4 guests');
      expect(mailCall.html).toContain('Jane Doe');
      expect(mailCall.html).toContain('Window booth preferred');
    });

    it('rejects reservation missing required fields', async () => {
      const { POST } = await import('@/app/api/reservations/route');

      const req = new Request('http://localhost:3000/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: '',
          email: 'invalid-email',
          phone: '',
          date: '',
          time: ''
        })
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(400);
      expect(data.message).toBeDefined();
    });

    it('safely traps bot if honeypot is populated without sending email', async () => {
      const { POST } = await import('@/app/api/reservations/route');

      const req = new Request('http://localhost:3000/api/reservations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Spam Bot',
          email: 'bot@spam.com',
          phone: '1234567890',
          date: '2026-10-15',
          time: '7:30 PM',
          hp_field: 'I am a bot'
        })
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(mockSendMail).not.toHaveBeenCalled();
    });
  });

  describe('Contact Route (POST /api/contact)', () => {
    it('successfully processes valid contact submission and routes to info@prevakitchen.com with submitter replyTo', async () => {
      const { POST } = await import('@/app/api/contact/route');

      const req = new Request('http://localhost:3000/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Robert',
          lastName: 'Smith',
          email: 'robert@example.com',
          phone: '(313) 555-0188',
          subject: 'Private Dining Inquiry',
          message: 'Interested in hosting a corporate dinner for 20 people.'
        })
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(200);
      expect(data.ok).toBe(true);
      expect(data.referenceId).toMatch(/^CON-[A-Z0-9]{8}$/);

      expect(mockSendMail).toHaveBeenCalled();
      const mailCall = mockSendMail.mock.calls[0][0];
      expect(mailCall.to).toBe('info@prevakitchen.com');
      expect(mailCall.replyTo).toBe('robert@example.com');
      expect(mailCall.subject).toContain('Robert Smith');
      expect(mailCall.html).toContain('corporate dinner for 20 people');
    });

    it('rejects contact submission missing message or invalid email', async () => {
      const { POST } = await import('@/app/api/contact/route');

      const req = new Request('http://localhost:3000/api/contact', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'Robert',
          email: 'not-an-email',
          message: ''
        })
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });

  describe('Career Application Route (POST /api/career-applications)', () => {
    it('successfully processes career application with resume attachment and routes to donnaw@prevaclub.com with applicant replyTo', async () => {
      const { POST } = await import('@/app/api/career-applications/route');

      const samplePdfBase64 = 'data:application/pdf;base64,JVBERi0xLjQKJcTl8uXrp/Og0MTGCjEgMCBvYmoKPDwKL1R5cGUgL0NhdGFsb2cK';
      const req = new Request('http://localhost:3000/api/career-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Marcus',
          lastName: 'Cole',
          email: 'marcus@example.com',
          phone: '(313) 555-0444',
          role: 'line-cook',
          availability: 'Open availability',
          startDate: '2026-11-01',
          message: '5 years of kitchen experience in fast-paced upscale dining.',
          consent: true,
          resume: {
            name: 'marcus-resume.pdf',
            type: 'application/pdf',
            size: 24500,
            data: samplePdfBase64
          }
        })
      });

      const res = await POST(req);
      const data = await res.json();

      expect(res.status).toBe(201);
      expect(data.ok).toBe(true);
      expect(data.referenceId).toMatch(/^APP-[A-Z0-9]{8}$/);

      expect(mockSendMail).toHaveBeenCalled();
      const mailCall = mockSendMail.mock.calls[0][0];
      expect(mailCall.to).toBe('donnaw@prevaclub.com');
      expect(mailCall.replyTo).toBe('marcus@example.com');
      expect(mailCall.subject).toContain('Marcus Cole');
      expect(mailCall.subject).toContain('Line Cook');
      expect(mailCall.attachments).toHaveLength(1);
      expect(mailCall.attachments[0].filename).toBe('marcus-resume.pdf');
      expect(mailCall.attachments[0].contentType).toBe('application/pdf');
      expect(Buffer.isBuffer(mailCall.attachments[0].content)).toBe(true);
    });

    it('rejects career application if resume is missing', async () => {
      const { POST } = await import('@/app/api/career-applications/route');

      const req = new Request('http://localhost:3000/api/career-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Marcus',
          lastName: 'Cole',
          email: 'marcus@example.com',
          phone: '(313) 555-0444',
          role: 'line-cook',
          availability: 'Open availability',
          consent: true,
          resume: null
        })
      });

      const res = await POST(req);
      const data = await res.json();
      expect(res.status).toBe(400);
      expect(data.message).toMatch(/résumé/i);
    });

    it('rejects career application without consent', async () => {
      const { POST } = await import('@/app/api/career-applications/route');

      const req = new Request('http://localhost:3000/api/career-applications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: 'Marcus',
          lastName: 'Cole',
          email: 'marcus@example.com',
          phone: '(313) 555-0444',
          role: 'line-cook',
          availability: 'Open availability',
          consent: false,
          resume: { name: 'resume.pdf', type: 'application/pdf', size: 1000, data: 'data:application/pdf;base64,AAA' }
        })
      });

      const res = await POST(req);
      expect(res.status).toBe(400);
    });
  });
});
