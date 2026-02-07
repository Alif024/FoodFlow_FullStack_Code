const sqlite3 = require('sqlite3').verbose();

module.exports = function (app, dbFile, events) {
  const db = new sqlite3.Database(dbFile);

  function requireManager(req, res, next) {
    const role = req.headers['x-role'];
    if (!role || (role !== 'manager' && role !== 'staff')) return res.status(403).json({ error: 'forbidden' });
    req.user = { role, name: req.headers['x-user'] || 'unknown' };
    next();
  }

  // SSE for manager to receive new orders and requests
  app.get('/manager/events', requireManager, (req, res) => {
    res.writeHead(200, {
      Connection: 'keep-alive',
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache'
    });
    const onNew = (data) => res.write(`event: new-order\ndata: ${JSON.stringify(data)}\n\n`);
    const onReq = (data) => res.write(`event: request-bill\ndata: ${JSON.stringify(data)}\n\n`);
    events.on('new-order', onNew);
    events.on('request-bill', onReq);
    req.on('close', () => {
      events.removeListener('new-order', onNew);
      events.removeListener('request-bill', onReq);
    });
  });

  // list orders (manager)
  app.get('/manager/orders', requireManager, (req, res) => {
    db.all('SELECT * FROM Orders ORDER BY order_date DESC LIMIT 200', [], (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(rows);
    });
  });

  // accept/reject order
  app.post('/manager/orders/:id/accept', requireManager, (req, res) => {
    const id = req.params.id;
    const action = req.body.action || 'accept'; // accept or reject
    const reason = req.body.reason || null;
    if (action === 'accept') {
      db.run('UPDATE Orders SET order_status = ? WHERE order_id = ?', ['accepted', id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        db.run('INSERT INTO AuditLog (actor, action, target, data, created_at) VALUES (?,?,?,?,?)', [req.user.name, 'accept_order', id, JSON.stringify({}), new Date().toISOString()], () => {});
        res.json({ accepted: true });
      });
    } else {
      db.run('UPDATE Orders SET order_status = ? WHERE order_id = ?', ['cancelled', id], function (err) {
        if (err) return res.status(500).json({ error: err.message });
        db.run('INSERT INTO AuditLog (actor, action, target, data, created_at) VALUES (?,?,?,?,?)', [req.user.name, 'reject_order', id, JSON.stringify({ reason }), new Date().toISOString()], () => {});
        res.json({ rejected: true, reason });
      });
    }
  });

  // menu management (additional endpoints)
  app.post('/manager/menus/:id/stop-sell', requireManager, (req, res) => {
    const id = req.params.id;
    db.run('UPDATE Menu SET status = ? WHERE menu_id = ?', ['inactive', id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.run('INSERT INTO AuditLog (actor, action, target, data, created_at) VALUES (?,?,?,?,?)', [req.user.name, 'stop_sell', id, JSON.stringify({}), new Date().toISOString()], () => {});
      // notify customers via event
      if (events) events.emit('menu-updated', { menu_id: id, status: 'inactive' });
      res.json({ stopped: true });
    });
  });

  // table controls
  app.post('/manager/tables', requireManager, (req, res) => {
    const { table_name } = req.body;
    const created_at = new Date().toISOString();
    db.run('INSERT INTO DiningTable (table_name, status, created_at) VALUES (?,?,?)', [table_name, 'open', created_at], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ table_id: this.lastID, table_name, status: 'open' });
    });
  });

  app.post('/manager/tables/:id/lock', requireManager, (req, res) => {
    const id = req.params.id;
    db.run('UPDATE DiningTable SET status = ? WHERE table_id = ?', ['locked', id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.run('INSERT INTO AuditLog (actor, action, target, data, created_at) VALUES (?,?,?,?,?)', [req.user.name, 'lock_table', id, JSON.stringify({}), new Date().toISOString()], () => {});
      res.json({ locked: true });
    });
  });

  app.post('/manager/tables/:id/unlock', requireManager, (req, res) => {
    const id = req.params.id;
    db.run('UPDATE DiningTable SET status = ? WHERE table_id = ?', ['open', id], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.run('INSERT INTO AuditLog (actor, action, target, data, created_at) VALUES (?,?,?,?,?)', [req.user.name, 'unlock_table', id, JSON.stringify({}), new Date().toISOString()], () => {});
      res.json({ unlocked: true });
    });
  });

  // generate a QR token for a table (expires in minutes)
  app.post('/manager/tables/:id/generate-qr', requireManager, (req, res) => {
    const id = req.params.id;
    const minutes = parseInt(req.body.minutes || 30);
    const token = require('crypto').randomBytes(12).toString('hex');
    const created_at = new Date().toISOString();
    const expires_at = new Date(Date.now() + minutes*60*1000).toISOString();
    db.run('INSERT INTO TableQR (token, table_id, created_at, expires_at) VALUES (?,?,?,?)', [token, id, created_at, expires_at], function (err) {
      if (err) return res.status(500).json({ error: err.message });
      db.run('INSERT INTO AuditLog (actor, action, target, data, created_at) VALUES (?,?,?,?,?)', [req.user.name, 'generate_qr', id, JSON.stringify({ token, expires_at }), new Date().toISOString()], () => {});
      res.json({ token, expires_at });
    });
  });

  // basic reports: sales today
  app.get('/manager/reports/sales-today', requireManager, (req, res) => {
    const start = new Date(); start.setHours(0,0,0,0);
    const end = new Date(); end.setHours(23,59,59,999);
    db.get('SELECT COUNT(*) as orders, IFNULL(SUM(total_price),0) as total FROM Orders WHERE order_date BETWEEN ? AND ?', [start.toISOString(), end.toISOString()], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      res.json(row);
    });
  });

};
