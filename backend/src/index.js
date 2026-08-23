/**
 * Registering the route table. Importing a routes module has the side effect
 * of adding its handlers to the router, so this file is the single place that
 * decides which modules exist.
 */
import './routes/public.js';
import './routes/shop.js';
// exports.js MUST register before admin.js: its /admin/orders/export would
// otherwise be swallowed by admin.js's /admin/orders/:id pattern, which
// happily treats "export" as an order id and returns 404.
import './routes/exports.js';
import './routes/admin.js';

export { dispatch, listRoutes } from './router.js';
