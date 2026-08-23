import ExcelJS from 'exceljs';
import PDFDocument from 'pdfkit';
import { col, serialize } from '../lib/db.js';
import { cleanText } from '../lib/sanitize.js';
import { get, result, badRequest } from '../router.js';

/**
 * Order exports for the admin.
 *
 * GET /api/admin/orders/export?format=xlsx|pdf&status=PAID&from=2026-07-01&to=2026-07-31
 *
 * Both formats are generated server-side from the same filtered query the
 * orders screen uses, so what the admin sees on screen and what lands in the
 * file can never disagree. Auth is enforced by the router exactly like every
 * other /admin route.
 */

const ORDER_STATUS = ['PENDING', 'PAID', 'RECEIVED', 'PREPARING', 'READY', 'ON_THE_WAY', 'DELIVERED', 'COMPLETED', 'CANCELLED', 'REFUNDED'];
const EXPORT_LIMIT = 5000;

const dollars = (cents) => (Number(cents || 0) / 100);
const money = (cents) => `$${dollars(cents).toFixed(2)}`;

async function fetchOrders(query) {
  const orders = await col('order');
  const filter = {};

  const status = cleanText(query.status, 20).toUpperCase();
  if (ORDER_STATUS.includes(status)) filter.status = status;
  if (query.open === 'true') filter.status = { $in: ['PAID', 'RECEIVED', 'PREPARING', 'READY', 'ON_THE_WAY'] };

  const fulfilment = cleanText(query.fulfilment, 20).toUpperCase();
  if (['PICKUP', 'DELIVERY'].includes(fulfilment)) filter.fulfilment = fulfilment;

  const search = cleanText(query.search, 100);
  if (search) {
    const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const clauses = [
      { 'customer.name': { $regex: escaped, $options: 'i' } },
      { 'customer.phone': { $regex: escaped, $options: 'i' } },
      { 'customer.email': { $regex: escaped, $options: 'i' } }
    ];
    const orderNumber = Number(search.replace(/^#/, ''));
    if (Number.isInteger(orderNumber) && orderNumber > 0) clauses.unshift({ orderNumber });
    filter.$or = clauses;
  }

  // Date range on createdAt. Bad dates are rejected loudly rather than
  // silently exporting everything — a wrong "last month" report is worse
  // than an error.
  const range = {};
  if (query.from) {
    const from = new Date(query.from);
    if (Number.isNaN(from.getTime())) throw badRequest('Invalid "from" date.');
    range.$gte = from;
  }
  if (query.to) {
    const to = new Date(query.to);
    if (Number.isNaN(to.getTime())) throw badRequest('Invalid "to" date.');
    to.setHours(23, 59, 59, 999); // inclusive end of day
    range.$lte = to;
  }
  if (Object.keys(range).length) filter.createdAt = range;

  const rows = await orders.find(filter).sort({ createdAt: -1 }).limit(EXPORT_LIMIT).toArray();
  return rows.map(serialize);
}

function summarise(rows) {
  const paidLike = rows.filter((row) => !['PENDING', 'CANCELLED', 'REFUNDED'].includes(row.status));
  return {
    count: rows.length,
    revenueCents: paidLike.reduce((total, row) => total + (row.totalCents || 0), 0),
    tipsCents: paidLike.reduce((total, row) => total + (row.tipCents || 0), 0),
    taxCents: paidLike.reduce((total, row) => total + (row.taxCents || 0), 0)
  };
}

function filename(extension, query) {
  const stamp = new Date().toISOString().slice(0, 10);
  const status = cleanText(query.status, 20).toUpperCase();
  const suffix = ORDER_STATUS.includes(status) ? `-${status.toLowerCase()}` : '';
  return `preva-orders${suffix}-${stamp}.${extension}`;
}

const COLUMNS = [
  { header: 'Order #', key: 'orderNumber', width: 10 },
  { header: 'Date', key: 'date', width: 20 },
  { header: 'Status', key: 'status', width: 14 },
  { header: 'Type', key: 'fulfilment', width: 11 },
  { header: 'Customer', key: 'customer', width: 22 },
  { header: 'Phone', key: 'phone', width: 15 },
  { header: 'Items', key: 'items', width: 46 },
  { header: 'Subtotal', key: 'subtotal', width: 11 },
  { header: 'Delivery', key: 'delivery', width: 10 },
  { header: 'Tax', key: 'tax', width: 9 },
  { header: 'Tip', key: 'tip', width: 9 },
  { header: 'Total', key: 'total', width: 11 },
  { header: 'Payment', key: 'payment', width: 12 }
];

function toRow(order) {
  return {
    orderNumber: order.orderNumber,
    date: order.createdAt ? new Date(order.createdAt).toLocaleString('en-US', { timeZone: 'America/Detroit' }) : '',
    status: order.status,
    fulfilment: order.fulfilment,
    customer: order.customer?.name || '',
    phone: order.customer?.phone || '',
    items: (order.lines || []).map((line) => `${line.qty}× ${line.name}${line.options ? ` (${line.options})` : ''}`).join('; '),
    subtotal: dollars(order.subtotalCents),
    delivery: dollars(order.deliveryCents),
    tax: dollars(order.taxCents),
    tip: dollars(order.tipCents),
    total: dollars(order.totalCents),
    payment: order.payment?.status || (order.status === 'PENDING' ? 'AWAITING' : '')
  };
}

/* ── Excel ──────────────────────────────────────────────────────────────── */

async function buildExcel(rows, query) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Preva Kitchen';
  const sheet = workbook.addWorksheet('Orders', { views: [{ state: 'frozen', ySplit: 1 }] });

  sheet.columns = COLUMNS;
  sheet.getRow(1).font = { bold: true, color: { argb: 'FF000000' } };
  sheet.getRow(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC9A84C' } };

  for (const order of rows) sheet.addRow(toRow(order));

  // Money columns as real numbers with a currency format, so the sheet can be
  // summed and pivoted instead of being a wall of strings.
  for (const key of ['subtotal', 'delivery', 'tax', 'tip', 'total']) {
    sheet.getColumn(key).numFmt = '"$"#,##0.00';
  }
  sheet.autoFilter = { from: 'A1', to: { row: 1, column: COLUMNS.length } };

  const totals = summarise(rows);
  const spacer = sheet.addRow([]);
  const summaryRow = sheet.addRow(['', '', '', '', '', '', 'TOTALS (excl. pending/cancelled)', '', '', totals.taxCents / 100, totals.tipsCents / 100, totals.revenueCents / 100, `${totals.count} orders`]);
  summaryRow.font = { bold: true };
  void spacer;

  return Buffer.from(await workbook.xlsx.writeBuffer());
}

/* ── PDF ────────────────────────────────────────────────────────────────── */

function buildPdf(rows, query) {
  return new Promise((resolve, reject) => {
    const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 36 });
    const chunks = [];
    doc.on('data', (chunk) => chunks.push(chunk));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);

    const totals = summarise(rows);
    const pageWidth = doc.page.width - 72;

    const drawHeader = () => {
      doc.fontSize(16).fillColor('#111').text('PREVA KITCHEN — ORDERS REPORT', { continued: false });
      doc.fontSize(9).fillColor('#666').text(
        `Generated ${new Date().toLocaleString('en-US', { timeZone: 'America/Detroit' })}` +
          (query.from || query.to ? `  ·  Range: ${query.from || 'start'} → ${query.to || 'today'}` : '') +
          (query.status ? `  ·  Status: ${query.status}` : '')
      );
      doc.moveDown(0.3);
      doc.fontSize(9).fillColor('#111').text(
        `Orders: ${totals.count}    Revenue: ${money(totals.revenueCents)}    Tips: ${money(totals.tipsCents)}    Tax collected: ${money(totals.taxCents)}`
      );
      doc.moveDown(0.5);
    };

    // Column layout: [x, width] pairs sized to fill the landscape page.
    const layout = [
      ['#', 34], ['Date', 92], ['Status', 62], ['Type', 52], ['Customer', 88],
      ['Items', 230], ['Subtotal', 48], ['Tax', 40], ['Tip', 40], ['Total', 48]
    ];

    const drawTableHead = () => {
      let x = 36;
      const y = doc.y;
      doc.rect(36, y - 2, pageWidth, 16).fill('#C9A84C');
      doc.fillColor('#000').fontSize(8).font('Helvetica-Bold');
      for (const [label, width] of layout) {
        doc.text(label, x + 3, y + 1, { width: width - 6, lineBreak: false });
        x += width;
      }
      doc.font('Helvetica').fillColor('#111');
      doc.y = y + 18;
    };

    drawHeader();
    drawTableHead();

    let shaded = false;
    for (const order of rows) {
      const row = toRow(order);
      const cells = [
        String(row.orderNumber), row.date, row.status, row.fulfilment, row.customer,
        row.items, money(order.subtotalCents), money(order.taxCents), money(order.tipCents), money(order.totalCents)
      ];

      // Measure the tallest cell so multi-line item lists don't collide.
      doc.fontSize(7.5);
      let height = 12;
      let x = 36;
      layout.forEach(([, width], index) => {
        height = Math.max(height, doc.heightOfString(cells[index], { width: width - 6 }) + 4);
        x += width;
      });

      if (doc.y + height > doc.page.height - 40) {
        doc.addPage();
        drawTableHead();
      }

      const y = doc.y;
      if (shaded) doc.rect(36, y - 1, pageWidth, height).fill('#F4EFE3');
      shaded = !shaded;
      doc.fillColor('#111');

      x = 36;
      layout.forEach(([, width], index) => {
        doc.text(cells[index], x + 3, y + 1, { width: width - 6 });
        x += width;
      });
      doc.y = y + height + 1;
      doc.x = 36;
    }

    if (rows.length === 0) {
      doc.moveDown().fontSize(10).fillColor('#666').text('No orders matched this filter.');
    }

    doc.end();
  });
}

function buildCsv(rows) {
  const quote = (v) => `"${String(v ?? '').replaceAll('"', '""')}"`;
  const headers = [
    'Order #',
    'Placed at',
    'Status',
    'Fulfilment',
    'Customer name',
    'Customer email',
    'Customer phone',
    'Delivery address',
    'Subtotal ($)',
    'Tax ($)',
    'Delivery fee ($)',
    'Tip ($)',
    'Total ($)',
    'Payment method',
    'Items'
  ];

  const lines = [headers.map(quote).join(',')];
  for (const row of rows) {
    const itemsSummary = (row.items || [])
      .map((it) => `${it.quantity}x ${it.name} ($${((it.priceCents * it.quantity) / 100).toFixed(2)})`)
      .join('; ');
    const values = [
      row.orderNumber,
      row.createdAt ? new Date(row.createdAt).toISOString() : '',
      row.status,
      row.fulfilment,
      row.customer?.name || '',
      row.customer?.email || '',
      row.customer?.phone || '',
      row.customer?.address || '',
      ((row.pricing?.subtotalCents || 0) / 100).toFixed(2),
      ((row.pricing?.taxCents || 0) / 100).toFixed(2),
      ((row.pricing?.deliveryFeeCents || 0) / 100).toFixed(2),
      ((row.pricing?.tipCents || 0) / 100).toFixed(2),
      ((row.totalCents || 0) / 100).toFixed(2),
      row.payment?.method || '',
      itemsSummary
    ];
    lines.push(values.map(quote).join(','));
  }
  return Buffer.from(lines.join('\r\n'), 'utf-8');
}

/* ── the route ──────────────────────────────────────────────────────────── */

get('/admin/orders/export', { auth: true }, async ({ query }) => {
  const format = (query.format || 'xlsx').toLowerCase();
  const rows = await fetchOrders(query);

  if (format === 'csv') {
    const buffer = buildCsv(rows);
    return result(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename('csv', query)}"`
      }
    });
  }

  if (format === 'xlsx') {
    const buffer = await buildExcel(rows, query);
    return result(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'Content-Disposition': `attachment; filename="${filename('xlsx', query)}"`
      }
    });
  }

  if (format === 'pdf') {
    const buffer = await buildPdf(rows, query);
    return result(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename('pdf', query)}"`
      }
    });
  }

  throw badRequest('format must be csv, xlsx or pdf.');
});
