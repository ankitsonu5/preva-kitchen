import test from 'node:test';
import assert from 'node:assert/strict';

process.env.NODE_ENV = 'test';
process.env.MONGODB_URI = 'mongodb://127.0.0.1:1/preva-inventory-test';
process.env.EMAIL_DRY_RUN = 'true';
process.env.JWT_SECRET = 'inventory-test-secret-with-more-than-thirty-two-characters';
process.env.KITCHEN_ID = 'inv-test-chef';
process.env.KITCHEN_PASSWORD = 'inv-test-kitchen-password';
process.env.KITCHEN_TOKEN_TTL = '15m';

const { dispatch } = await import('../src/index.js');
const { col } = await import('../src/lib/db.js');

const adminUser = {
  id: '000000000000000000000002',
  email: 'inventory-owner@example.com',
  role: 'SUPER_ADMIN',
  name: 'Inventory Test Owner'
};

async function kitchenToken() {
  const response = await dispatch({
    method: 'POST',
    path: '/shop/kitchen-login',
    body: { username: process.env.KITCHEN_ID, password: process.env.KITCHEN_PASSWORD },
    ip: `inv-test-login-${Math.random()}`
  });
  assert.equal(response.status, 200);
  return response.body.token;
}

function kitchenRequest(token) {
  return { headers: { authorization: `Bearer ${token}` } };
}

async function pickTrackedItem(authRequest, stockCount) {
  const ops = await dispatch({ method: 'GET', path: '/shop/kitchen-operations', request: authRequest });
  const item = ops.body.items.find((one) => one.available);
  assert.ok(item, 'fixture data must include at least one available menu item');

  const enabled = await dispatch({
    method: 'PATCH',
    path: `/shop/kitchen-menu-items/${item.id}`,
    body: { trackInventory: true, stockCount },
    request: authRequest
  });
  assert.equal(enabled.status, 200);
  assert.equal(enabled.body.item.trackInventory, true);
  assert.equal(enabled.body.item.stockCount, stockCount);
  return item.id;
}

test('enabling inventory tracking and setting stock is reflected on GET kitchen-operations', async () => {
  const token = await kitchenToken();
  const authRequest = kitchenRequest(token);
  const itemId = await pickTrackedItem(authRequest, 5);

  const ops = await dispatch({ method: 'GET', path: '/shop/kitchen-operations', request: authRequest });
  const reloaded = ops.body.items.find((one) => one.id === itemId);
  assert.equal(reloaded.trackInventory, true);
  assert.equal(reloaded.stockCount, 5);
});

test('a dine-in order decrements tracked stock, and stops the order once stock runs out', async () => {
  const token = await kitchenToken();
  const authRequest = kitchenRequest(token);
  const itemId = await pickTrackedItem(authRequest, 3);

  const first = await dispatch({
    method: 'POST',
    path: '/shop/dine-in-orders',
    body: { tableNumber: '2', lines: [{ itemId, qty: 2 }] },
    request: authRequest
  });
  assert.equal(first.status, 200);

  const opsAfterFirst = await dispatch({ method: 'GET', path: '/shop/kitchen-operations', request: authRequest });
  assert.equal(opsAfterFirst.body.items.find((one) => one.id === itemId).stockCount, 1);

  // Only 1 left — ordering 2 more must fail cleanly and must not touch stock.
  const tooMany = await dispatch({
    method: 'POST',
    path: '/shop/dine-in-orders',
    body: { tableNumber: '3', lines: [{ itemId, qty: 2 }] },
    request: authRequest
  });
  assert.equal(tooMany.status, 400);
  assert.match(tooMany.body.message, /limited stock/i);

  const opsAfterFailure = await dispatch({ method: 'GET', path: '/shop/kitchen-operations', request: authRequest });
  assert.equal(opsAfterFailure.body.items.find((one) => one.id === itemId).stockCount, 1, 'a failed order must not change stock');

  // Exactly the remaining unit sells out the item and auto-86s it.
  const last = await dispatch({
    method: 'POST',
    path: '/shop/dine-in-orders',
    body: { tableNumber: '3', lines: [{ itemId, qty: 1 }] },
    request: authRequest
  });
  assert.equal(last.status, 200);

  const opsSoldOut = await dispatch({ method: 'GET', path: '/shop/kitchen-operations', request: authRequest });
  const soldOutItem = opsSoldOut.body.items.find((one) => one.id === itemId);
  assert.equal(soldOutItem.stockCount, 0);
  assert.equal(soldOutItem.available, false);
});

test('restocking a sold-out item makes it available again automatically', async () => {
  const token = await kitchenToken();
  const authRequest = kitchenRequest(token);
  const itemId = await pickTrackedItem(authRequest, 1);

  await dispatch({
    method: 'POST',
    path: '/shop/dine-in-orders',
    body: { tableNumber: '1', lines: [{ itemId, qty: 1 }] },
    request: authRequest
  });
  const soldOut = await dispatch({ method: 'GET', path: '/shop/kitchen-operations', request: authRequest });
  assert.equal(soldOut.body.items.find((one) => one.id === itemId).available, false);

  const restocked = await dispatch({
    method: 'PATCH',
    path: `/shop/kitchen-menu-items/${itemId}`,
    body: { stockCount: 10 },
    request: authRequest
  });
  assert.equal(restocked.status, 200);
  assert.equal(restocked.body.item.available, true);
  assert.equal(restocked.body.item.stockCount, 10);
});

test('cancelling a received dine-in order releases its reserved stock', async () => {
  const token = await kitchenToken();
  const authRequest = kitchenRequest(token);
  const itemId = await pickTrackedItem(authRequest, 4);

  const created = await dispatch({
    method: 'POST',
    path: '/shop/dine-in-orders',
    body: { tableNumber: '5', lines: [{ itemId, qty: 3 }] },
    request: authRequest
  });
  assert.equal(created.status, 200);

  const afterOrder = await dispatch({ method: 'GET', path: '/shop/kitchen-operations', request: authRequest });
  assert.equal(afterOrder.body.items.find((one) => one.id === itemId).stockCount, 1);

  const cancelled = await dispatch({
    method: 'PATCH',
    path: `/shop/kitchen-tickets/${created.body.orderId}/status`,
    body: { status: 'CANCELLED', reason: 'Guest left' },
    request: authRequest
  });
  assert.equal(cancelled.status, 200);

  const afterCancel = await dispatch({ method: 'GET', path: '/shop/kitchen-operations', request: authRequest });
  assert.equal(afterCancel.body.items.find((one) => one.id === itemId).stockCount, 4, 'the 3 reserved units must be given back');
});

test('an order for an item with tracking off never touches stock', async () => {
  const token = await kitchenToken();
  const authRequest = kitchenRequest(token);
  const menuItems = await col('menuItems');
  const untracked = await menuItems.findOne({ orderable: true, available: { $ne: false }, trackInventory: { $ne: true } });
  assert.ok(untracked, 'fixture data must include an untracked orderable item');

  const created = await dispatch({
    method: 'POST',
    path: '/shop/dine-in-orders',
    body: { tableNumber: '6', lines: [{ itemId: untracked._id.toString(), qty: 25 }] },
    request: authRequest
  });
  assert.equal(created.status, 200, 'an untracked item has unlimited stock regardless of quantity');
});
