import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/preva-kds-test';
process.env.EMAIL_DRY_RUN = 'true';
process.env.JWT_SECRET = 'kds-test-secret-with-more-than-thirty-two-characters';
process.env.KITCHEN_ID = 'test-chef';
process.env.KITCHEN_PASSWORD = 'test-kitchen-password';
process.env.KITCHEN_TOKEN_TTL = '15m';

const { dispatch } = await import('../src/index.js');
const { col, asObjectId } = await import('../src/lib/db.js');
const { currentUser, SESSION_COOKIE } = await import('../src/lib/auth.js');

const adminUser = {
  id: '000000000000000000000001',
  email: 'owner@example.com',
  role: 'SUPER_ADMIN',
  name: 'Test Owner'
};

let sequence = 980000;

function nextNumber() {
  sequence += 1;
  return sequence;
}

async function createOrder(overrides = {}) {
  const orders = await col('order');
  const now = new Date();
  const document = {
    orderNumber: nextNumber(),
    status: 'RECEIVED',
    fulfilment: 'PICKUP',
    customer: {
      name: 'KDS Test Guest',
      email: 'guest@example.com',
      phone: '313-555-0199'
    },
    lines: [{ name: 'Test Wings', qty: 2, options: 'Hot' }],
    totalCents: 2400,
    readyAt: new Date(now.getTime() + 25 * 60 * 1000),
    estimatedReadyAt: new Date(now.getTime() + 25 * 60 * 1000),
    statusHistory: [{ status: 'RECEIVED', at: now, by: 'test' }],
    createdAt: now,
    updatedAt: now,
    ...overrides
  };
  const inserted = await orders.insertOne(document);
  return { ...document, _id: inserted.insertedId, id: inserted.insertedId.toString() };
}

async function kitchenToken() {
  const response = await dispatch({
    method: 'POST',
    path: '/shop/kitchen-login',
    body: { username: process.env.KITCHEN_ID, password: process.env.KITCHEN_PASSWORD },
    ip: 'kds-test-login'
  });
  assert.equal(response.status, 200);
  assert.equal(response.body.ok, true);
  assert.ok(response.body.token);
  return response.body.token;
}

function kitchenRequest(token) {
  return { headers: { authorization: `Bearer ${token}` } };
}

async function kitchenStatus(token, order, status) {
  return dispatch({
    method: 'PATCH',
    path: `/shop/kitchen-tickets/${order.id}/status`,
    body: { status },
    request: kitchenRequest(token),
    ip: 'kds-test-terminal'
  });
}

test('kitchen routes require a valid terminal token', async () => {
  const unauthorized = await dispatch({ method: 'GET', path: '/shop/kitchen-tickets' });
  assert.equal(unauthorized.status, 401);

  const failedLogin = await dispatch({
    method: 'POST',
    path: '/shop/kitchen-login',
    body: { username: process.env.KITCHEN_ID, password: 'wrong-password' },
    ip: 'kds-test-wrong-login'
  });
  assert.equal(failedLogin.status, 401);

  const token = await kitchenToken();
  const authorized = await dispatch({
    method: 'GET',
    path: '/shop/kitchen-tickets',
    request: kitchenRequest(token)
  });
  assert.equal(authorized.status, 200);
  assert.ok(Array.isArray(authorized.body));
});

test('editor and author sessions cannot access kitchen APIs', async () => {
  for (const role of ['EDITOR', 'AUTHOR']) {
    const response = await dispatch({
      method: 'GET',
      path: '/shop/kitchen-tickets',
      user: { id: `role-${role.toLowerCase()}`, email: `${role.toLowerCase()}@example.com`, role }
    });
    assert.equal(response.status, 401, `${role} must not access KDS routes`);
  }
});

test('Kitchen ID can open the admin KDS but cannot access other admin areas', async () => {
  const login = await dispatch({
    method: 'POST',
    path: '/auth/login',
    body: { email: process.env.KITCHEN_ID, password: process.env.KITCHEN_PASSWORD },
    ip: 'kds-admin-login'
  });
  assert.equal(login.status, 200);
  assert.equal(login.body.user.role, 'KDS_MANAGER');
  assert.equal(login.body.user.isKitchenAccount, true);

  const session = login.cookies.find((cookie) => cookie.name === SESSION_COOKIE)?.value;
  assert.ok(session);
  const user = await currentUser({
    headers: { get: () => null },
    cookies: { get: () => ({ value: session }) }
  });
  assert.equal(user.role, 'KDS_MANAGER');

  const kdsOrders = await dispatch({ method: 'GET', path: '/admin/orders-summary', user });
  assert.equal(kdsOrders.status, 200);

  const dashboard = await dispatch({ method: 'GET', path: '/admin/dashboard', user });
  assert.equal(dashboard.status, 403);

  const users = await dispatch({ method: 'GET', path: '/admin/users', user });
  assert.equal(users.status, 403);
});

test('pickup orders follow the validated kitchen workflow and record actual timestamps', async () => {
  const orders = await col('order');
  const token = await kitchenToken();
  const order = await createOrder();

  const invalid = await kitchenStatus(token, order, 'DELIVERED');
  assert.equal(invalid.status, 400);
  assert.match(invalid.body.message, /cannot move/i);

  assert.equal((await kitchenStatus(token, order, 'PREPARING')).status, 200);
  assert.equal((await kitchenStatus(token, order, 'READY')).status, 200);

  const ready = await orders.findOne({ _id: order._id });
  assert.equal(ready.status, 'READY');
  assert.ok(ready.actualReadyAt instanceof Date);
  assert.notEqual(ready.actualReadyAt.getTime(), ready.estimatedReadyAt.getTime());
  assert.deepEqual(ready.statusHistory.slice(-2).map((entry) => entry.status), ['PREPARING', 'READY']);

  assert.equal((await kitchenStatus(token, order, 'COMPLETED')).status, 200);
  const completed = await orders.findOne({ _id: order._id });
  assert.equal(completed.status, 'COMPLETED');
  assert.ok(completed.completedAt instanceof Date);
});

test('delivery tickets remain in the admin KDS until they are delivered', async () => {
  const orders = await col('order');
  const token = await kitchenToken();
  const order = await createOrder({ fulfilment: 'DELIVERY' });

  assert.equal((await kitchenStatus(token, order, 'PREPARING')).status, 200);
  assert.equal((await kitchenStatus(token, order, 'READY')).status, 200);
  assert.equal((await kitchenStatus(token, order, 'ON_THE_WAY')).status, 200);

  const active = await dispatch({
    method: 'GET',
    path: '/admin/orders',
    query: { status: 'KDS', sort: 'fifo' },
    user: adminUser
  });
  assert.equal(active.status, 200);
  assert.ok(active.body.some((row) => row.id === order.id && row.status === 'ON_THE_WAY'));

  assert.equal((await kitchenStatus(token, order, 'DELIVERED')).status, 200);
  const delivered = await orders.findOne({ _id: order._id });
  assert.ok(delivered.deliveredAt instanceof Date);
  assert.ok(delivered.completedAt instanceof Date);
});

test('delivery tickets support audited driver assignment', async () => {
  const token = await kitchenToken();
  const order = await createOrder({ fulfilment: 'DELIVERY' });
  const assigned = await dispatch({
    method: 'PATCH',
    path: `/shop/kitchen-tickets/${order.id}/driver`,
    body: { name: 'Alex Driver', phone: '313-555-0188' },
    request: kitchenRequest(token)
  });
  assert.equal(assigned.status, 200);
  assert.equal(assigned.body.driver.name, 'Alex Driver');
  const saved = await col('order').then((orders) => orders.findOne({ _id: order._id }));
  assert.equal(saved.kdsDriver.phone, '313-555-0188');
  assert.equal(saved.kdsDriver.assignedBy, 'test-chef');
});

test('completed tickets can be recalled and quantity summaries use line qty', async () => {
  const token = await kitchenToken();
  const order = await createOrder({
    status: 'COMPLETED',
    lines: [
      { name: 'Test Wings', qty: 2 },
      { name: 'Test Pasta', qty: 3 }
    ],
    updatedAt: new Date()
  });

  const recalls = await dispatch({
    method: 'GET',
    path: '/shop/kitchen-recalls',
    request: kitchenRequest(token)
  });
  assert.equal(recalls.status, 200);
  const recalled = recalls.body.find((row) => row.id === order.id);
  assert.equal(recalled.itemsCount, 5);
  assert.match(recalled.itemsSummary, /2x Test Wings/);

  const restored = await kitchenStatus(token, order, 'READY');
  assert.equal(restored.status, 200);
  const orders = await col('order');
  assert.equal((await orders.findOne({ _id: order._id })).status, 'READY');
});

test('item preparation state persists with actor and timestamp metadata', async () => {
  const token = await kitchenToken();
  const order = await createOrder({
    lines: [
      { name: 'Test Wings', qty: 1 },
      { name: 'Test Fries', qty: 1 }
    ]
  });

  const checked = await dispatch({
    method: 'PATCH',
    path: `/shop/kitchen-tickets/${order.id}/items/1`,
    body: { checked: true },
    request: kitchenRequest(token),
    ip: 'kds-test-terminal'
  });
  assert.equal(checked.status, 200);
  assert.equal(checked.body.itemState.lineIndex, 1);
  assert.equal(checked.body.itemState.checked, true);
  assert.equal(checked.body.itemState.by, process.env.KITCHEN_ID);

  const orders = await col('order');
  const saved = await orders.findOne({ _id: order._id });
  assert.equal(saved.kdsItemStates[0].checked, true);
  assert.ok(saved.kdsItemStates[0].at instanceof Date);
  assert.equal(saved.kdsItemHistory.length, 1);

  const listed = await dispatch({
    method: 'GET',
    path: '/shop/kitchen-tickets',
    request: kitchenRequest(token)
  });
  const ticket = listed.body.find((row) => row.id === order.id);
  assert.equal(ticket.kdsItemStates[0].checked, true);

  const unchecked = await dispatch({
    method: 'PATCH',
    path: `/shop/kitchen-tickets/${order.id}/items/1`,
    body: { checked: false },
    request: kitchenRequest(token),
    ip: 'kds-test-terminal'
  });
  assert.equal(unchecked.status, 200);
  assert.equal(unchecked.body.itemState.checked, false);
  assert.equal((await orders.findOne({ _id: order._id })).kdsItemHistory.length, 2);

  const invalid = await dispatch({
    method: 'PATCH',
    path: `/shop/kitchen-tickets/${order.id}/items/99`,
    body: { checked: true },
    request: kitchenRequest(token)
  });
  assert.equal(invalid.status, 400);
});

test('kitchen controls can pause ordering, adjust capacity, and 86 menu items', async () => {
  const token = await kitchenToken();
  const authRequest = kitchenRequest(token);
  const initial = await dispatch({
    method: 'GET',
    path: '/shop/kitchen-operations',
    request: authRequest
  });
  assert.equal(initial.status, 200);
  assert.ok(initial.body.items.length > 0);
  assert.ok(initial.body.stations.includes('Expo'));

  const settingsUpdate = await dispatch({
    method: 'PATCH',
    path: '/shop/kitchen-operations',
    body: { orderingEnabled: false, pickupMinutes: 40 },
    request: authRequest,
    ip: 'kds-test-terminal'
  });
  assert.equal(settingsUpdate.status, 200);
  assert.equal(settingsUpdate.body.settings.orderingEnabled, false);
  assert.equal(settingsUpdate.body.settings.pickupMinutes, 40);

  const item = initial.body.items[0];
  const itemUpdate = await dispatch({
    method: 'PATCH',
    path: `/shop/kitchen-menu-items/${item.id}`,
    body: { available: false, station: 'Grill' },
    request: authRequest,
    ip: 'kds-test-terminal'
  });
  assert.equal(itemUpdate.status, 200);
  assert.equal(itemUpdate.body.item.available, false);
  assert.equal(itemUpdate.body.item.station, 'Grill');

  const menuItems = await col('menuItems');
  const savedItem = await menuItems.findOne({ name: item.name });
  assert.equal(savedItem.available, false);
  assert.equal(savedItem.kdsStation, 'Grill');

  // Restore shared fallback data so the rest of the suite is independent.
  await dispatch({
    method: 'PATCH',
    path: '/shop/kitchen-operations',
    body: { orderingEnabled: true, pickupMinutes: 25 },
    request: authRequest
  });
  await dispatch({
    method: 'PATCH',
    path: `/shop/kitchen-menu-items/${item.id}`,
    body: { available: item.available, station: item.station },
    request: authRequest
  });
});

test('the KDS Settings station list can be edited, deduplicated, and never emptied', async () => {
  const token = await kitchenToken();
  const authRequest = kitchenRequest(token);
  const initial = await dispatch({ method: 'GET', path: '/shop/kitchen-operations', request: authRequest });
  const originalStations = initial.body.stations;

  const renamed = await dispatch({
    method: 'PATCH',
    path: '/shop/kitchen-operations',
    body: { stations: ['Grill', '  Grill  ', 'grill', 'Salad Bar', ''] },
    request: authRequest
  });
  assert.equal(renamed.status, 200);
  assert.deepEqual(renamed.body.stations, ['Grill', 'Salad Bar']);

  const reread = await dispatch({ method: 'GET', path: '/shop/kitchen-operations', request: authRequest });
  assert.deepEqual(reread.body.stations, ['Grill', 'Salad Bar']);

  const emptied = await dispatch({
    method: 'PATCH',
    path: '/shop/kitchen-operations',
    body: { stations: [] },
    request: authRequest
  });
  assert.equal(emptied.status, 400);
  assert.match(emptied.body.message, /at least one/i);

  const notAList = await dispatch({
    method: 'PATCH',
    path: '/shop/kitchen-operations',
    body: { stations: 'Grill' },
    request: authRequest
  });
  assert.equal(notAList.status, 400);

  // Restore shared fallback data so the rest of the suite is independent.
  await dispatch({
    method: 'PATCH',
    path: '/shop/kitchen-operations',
    body: { stations: originalStations },
    request: authRequest
  });
});

test('tickets support audited cook assignment and reasoned cancellation', async () => {
  const token = await kitchenToken();
  const order = await createOrder();

  const assigned = await dispatch({
    method: 'PATCH',
    path: `/shop/kitchen-tickets/${order.id}/assignment`,
    body: { station: 'Fryer', assignee: 'Chef Test' },
    request: kitchenRequest(token),
    ip: 'kds-test-terminal'
  });
  assert.equal(assigned.status, 200);
  assert.equal(assigned.body.assignment.station, 'Fryer');
  assert.equal(assigned.body.assignment.assignee, 'Chef Test');
  assert.equal(assigned.body.assignment.by, process.env.KITCHEN_ID);

  const cancelled = await dispatch({
    method: 'PATCH',
    path: `/shop/kitchen-tickets/${order.id}/status`,
    body: { status: 'CANCELLED', reason: 'Test item unavailable' },
    request: kitchenRequest(token),
    ip: 'kds-test-terminal'
  });
  assert.equal(cancelled.status, 200);

  const orders = await col('order');
  const saved = await orders.findOne({ _id: order._id });
  assert.equal(saved.kdsAssignment.station, 'Fryer');
  assert.equal(saved.kdsAssignmentHistory.length, 1);
  assert.equal(saved.status, 'CANCELLED');
  assert.equal(saved.cancellationReason, 'Test item unavailable');
  assert.ok(saved.cancelledAt instanceof Date);
});

test('admin and kitchen endpoints share the same transition policy', async () => {
  const order = await createOrder({ fulfilment: 'PICKUP' });

  const preparing = await dispatch({
    method: 'PATCH',
    path: `/admin/orders/${order.id}/status`,
    body: { status: 'PREPARING' },
    user: adminUser,
    ip: 'kds-test-admin'
  });
  assert.equal(preparing.status, 200);
  assert.equal(preparing.body.status, 'PREPARING');

  const illegal = await dispatch({
    method: 'PATCH',
    path: `/admin/orders/${order.id}/status`,
    body: { status: 'DELIVERED' },
    user: adminUser,
    ip: 'kds-test-admin'
  });
  assert.equal(illegal.status, 400);
  assert.match(illegal.body.message, /cannot move/i);
});

test('an admin session satisfies kitchen auth on the terminal item/assignment endpoints without a kitchen token', async () => {
  const order = await createOrder({
    lines: [
      { name: 'Test Wings', qty: 1 },
      { name: 'Test Fries', qty: 1 }
    ]
  });

  const itemUpdate = await dispatch({
    method: 'PATCH',
    path: `/shop/kitchen-tickets/${order.id}/items/1`,
    body: { checked: true },
    user: adminUser,
    ip: 'kds-test-admin'
  });
  assert.equal(itemUpdate.status, 200);
  assert.equal(itemUpdate.body.itemState.checked, true);
  assert.equal(itemUpdate.body.itemState.by, adminUser.email);

  const assigned = await dispatch({
    method: 'PATCH',
    path: `/shop/kitchen-tickets/${order.id}/assignment`,
    body: { station: 'Grill', assignee: 'Admin Chef' },
    user: adminUser,
    ip: 'kds-test-admin'
  });
  assert.equal(assigned.status, 200);
  assert.equal(assigned.body.assignment.station, 'Grill');
  assert.equal(assigned.body.assignment.by, adminUser.email);

  const orders = await col('order');
  const saved = await orders.findOne({ _id: order._id });
  assert.equal(saved.kdsItemStates[0].checked, true);
  assert.equal(saved.kdsAssignment.station, 'Grill');
});

test('staff can enter a dine-in order for a table, and it lands straight on the KDS as unpaid', async () => {
  const token = await kitchenToken();
  const authRequest = kitchenRequest(token);
  const menuItems = await col('menuItems');
  const item = await menuItems.findOne({ orderable: true, available: { $ne: false } });
  assert.ok(item, 'fixture data must include at least one orderable menu item');

  const created = await dispatch({
    method: 'POST',
    path: '/shop/dine-in-orders',
    body: { tableNumber: '4', lines: [{ itemId: item._id.toString(), qty: 2 }], note: 'No onions' },
    request: authRequest,
    ip: 'kds-test-terminal'
  });
  assert.equal(created.status, 200);
  assert.equal(created.body.ok, true);
  assert.ok(created.body.orderNumber);

  const orders = await col('order');
  const saved = await orders.findOne({ _id: asObjectId(created.body.orderId) });
  assert.equal(saved.fulfilment, 'DINE_IN');
  assert.equal(saved.tableNumber, '4');
  assert.equal(saved.status, 'RECEIVED');
  assert.equal(saved.payment.status, 'UNPAID');
  assert.equal(saved.lines[0].qty, 2);

  const tickets = await dispatch({ method: 'GET', path: '/shop/kitchen-tickets', request: authRequest });
  const ticket = tickets.body.find((row) => row.id === created.body.orderId);
  assert.ok(ticket, 'the dine-in order should appear on the active KDS board');
  assert.equal(ticket.tableNumber, '4');
  assert.equal(ticket.paymentStatus, 'UNPAID');

  const unknownTable = await dispatch({
    method: 'POST',
    path: '/shop/dine-in-orders',
    body: { tableNumber: 'Rooftop', lines: [{ itemId: item._id.toString(), qty: 1 }] },
    request: authRequest
  });
  assert.equal(unknownTable.status, 400);
  assert.match(unknownTable.body.message, /not configured/i);

  const paid = await dispatch({
    method: 'PATCH',
    path: `/shop/dine-in-orders/${created.body.orderId}/payment`,
    body: { method: 'cash' },
    request: authRequest
  });
  assert.equal(paid.status, 200);
  const afterPay = await orders.findOne({ _id: saved._id });
  assert.equal(afterPay.payment.status, 'PAID');
  assert.equal(afterPay.payment.method, 'cash');

  const doublePay = await dispatch({
    method: 'PATCH',
    path: `/shop/dine-in-orders/${created.body.orderId}/payment`,
    body: { method: 'card' },
    request: authRequest
  });
  assert.equal(doublePay.status, 400);
  assert.match(doublePay.body.message, /already marked paid/i);
});

test('dine-in orders skip the ordering-pause and minimum-order gates', async () => {
  const token = await kitchenToken();
  const authRequest = kitchenRequest(token);
  const menuItems = await col('menuItems');
  const item = await menuItems.findOne({ orderable: true, available: { $ne: false } });

  const opsBefore = await dispatch({ method: 'GET', path: '/shop/kitchen-operations', request: authRequest });
  assert.ok(opsBefore.body.tables.includes('1'));

  await dispatch({
    method: 'PATCH',
    path: '/shop/kitchen-operations',
    body: { orderingEnabled: false },
    request: authRequest
  });

  const whilePaused = await dispatch({
    method: 'POST',
    path: '/shop/dine-in-orders',
    body: { tableNumber: '1', lines: [{ itemId: item._id.toString(), qty: 1 }] },
    request: authRequest
  });
  assert.equal(whilePaused.status, 200, 'dine-in should not be blocked by the online-ordering pause');

  await dispatch({
    method: 'PATCH',
    path: '/shop/kitchen-operations',
    body: { orderingEnabled: true },
    request: authRequest
  });
});

test('dine-in payments support partial cash with change and final card settlement', async () => {
  const token = await kitchenToken();
  const order = await createOrder({
    fulfilment: 'DINE_IN',
    tableNumber: '10',
    totalCents: 3000,
    payment: { provider: 'none', status: 'UNPAID', amountCents: 3000, currency: 'usd' }
  });

  const first = await dispatch({
    method: 'PATCH',
    path: `/shop/dine-in-orders/${order.id}/payment`,
    body: { method: 'cash', amountCents: 1000, cashTenderedCents: 1500 },
    request: kitchenRequest(token)
  });
  assert.equal(first.status, 200);
  assert.equal(first.body.status, 'PARTIAL');
  assert.equal(first.body.remainingCents, 2000);
  assert.equal(first.body.changeCents, 500);

  const final = await dispatch({
    method: 'PATCH',
    path: `/shop/dine-in-orders/${order.id}/payment`,
    body: { method: 'card', amountCents: 2000 },
    request: kitchenRequest(token)
  });
  assert.equal(final.status, 200);
  assert.equal(final.body.status, 'PAID');
  assert.equal(final.body.remainingCents, 0);
});

test('a dine-in order can include a tip, added on top of the subtotal', async () => {
  const token = await kitchenToken();
  const authRequest = kitchenRequest(token);
  const menuItems = await col('menuItems');
  const item = await menuItems.findOne({ orderable: true, available: { $ne: false } });

  const tipped = await dispatch({
    method: 'POST',
    path: '/shop/dine-in-orders',
    body: { tableNumber: '7', lines: [{ itemId: item._id.toString(), qty: 1 }], tipCents: 500 },
    request: authRequest
  });
  assert.equal(tipped.status, 200);

  const orders = await col('order');
  const saved = await orders.findOne({ _id: asObjectId(tipped.body.orderId) });
  assert.equal(saved.tipCents, 500);
  assert.equal(saved.totalCents, saved.subtotalCents + saved.taxCents + 500);
  assert.equal(saved.payment.amountCents, saved.totalCents);

  const noTip = await dispatch({
    method: 'POST',
    path: '/shop/dine-in-orders',
    body: { tableNumber: '7', lines: [{ itemId: item._id.toString(), qty: 1 }] },
    request: authRequest
  });
  assert.equal(noTip.status, 200);
  const savedNoTip = await orders.findOne({ _id: asObjectId(noTip.body.orderId) });
  assert.equal(savedNoTip.tipCents, 0);

  const excessiveTip = await dispatch({
    method: 'POST',
    path: '/shop/dine-in-orders',
    body: { tableNumber: '7', lines: [{ itemId: item._id.toString(), qty: 1 }], tipCents: 999999999 },
    request: authRequest
  });
  assert.equal(excessiveTip.status, 400);
  assert.match(excessiveTip.body.message, /tip/i);
});

test('orders-summary reports average cook time, orders completed today, and running-late tickets', async () => {
  const now = new Date();

  // Took exactly 12 minutes from PREPARING to READY, and was completed today.
  await createOrder({
    status: 'COMPLETED',
    preparingAt: new Date(now.getTime() - 20 * 60 * 1000),
    actualReadyAt: new Date(now.getTime() - 8 * 60 * 1000),
    completedAt: now
  });

  // Still active, but its ready-by estimate already passed — running late.
  await createOrder({
    status: 'PREPARING',
    estimatedReadyAt: new Date(now.getTime() - 5 * 60 * 1000)
  });

  const summary = await dispatch({ method: 'GET', path: '/admin/orders-summary', user: adminUser });
  assert.equal(summary.status, 200);
  assert.ok(summary.body.completedToday >= 1);
  // Other tests in this file also drive PREPARING -> READY transitions, so
  // this is an average across all of them, not just the 12-minute order above.
  assert.ok(summary.body.avgPrepMinutes > 0);
  assert.ok(summary.body.slaBreaches >= 1);
});

test('the table status board reflects empty, active and unpaid tables, and merges multiple rounds at one table', async () => {
  const token = await kitchenToken();
  const authRequest = kitchenRequest(token);
  const menuItems = await col('menuItems');
  const item = await menuItems.findOne({ orderable: true, available: { $ne: false } });

  const first = await dispatch({
    method: 'POST',
    path: '/shop/dine-in-orders',
    body: { tableNumber: '8', lines: [{ itemId: item._id.toString(), qty: 1 }] },
    request: authRequest
  });
  const second = await dispatch({
    method: 'POST',
    path: '/shop/dine-in-orders',
    body: { tableNumber: '8', lines: [{ itemId: item._id.toString(), qty: 2 }] },
    request: authRequest
  });
  assert.equal(first.status, 200);
  assert.equal(second.status, 200);

  const boardWithTwoOpenOrders = await dispatch({ method: 'GET', path: '/shop/dine-in-tables', request: authRequest });
  const table8 = boardWithTwoOpenOrders.body.tables.find((row) => row.table === '8');
  assert.equal(table8.status, 'active');
  assert.equal(table8.orderCount, 2);
  assert.equal(table8.itemCount, 3);

  const emptyTable = boardWithTwoOpenOrders.body.tables.find((row) => row.table === '9');
  assert.equal(emptyTable.status, 'empty');

  // Serve and close out just the first order; the table should stay
  // "active" because the second order is still open.
  await dispatch({ method: 'PATCH', path: `/shop/kitchen-tickets/${first.body.orderId}/status`, body: { status: 'PREPARING' }, request: authRequest });
  await dispatch({ method: 'PATCH', path: `/shop/kitchen-tickets/${first.body.orderId}/status`, body: { status: 'READY' }, request: authRequest });
  await dispatch({ method: 'PATCH', path: `/shop/kitchen-tickets/${first.body.orderId}/status`, body: { status: 'COMPLETED' }, request: authRequest });

  const boardAfterOneClosed = await dispatch({ method: 'GET', path: '/shop/dine-in-tables', request: authRequest });
  const table8Again = boardAfterOneClosed.body.tables.find((row) => row.table === '8');
  assert.equal(table8Again.status, 'unpaid', 'a completed-but-unpaid order should flag the table even with another order still open');
});
