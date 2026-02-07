const sqlite3 = require('sqlite3').verbose();
const { randomBytes } = require('crypto');

module.exports = function (app, dbFile, events) {
  const db = new sqlite3.Database(dbFile);

  function nowISO() { return new Date().toISOString(); }

  // scan QR -> create customer session (expires in 30 minutes)
  app.post('/customer/scan-qr', async (req, res) => {
    const { token, customer_name } = req.body;
    if (!token) return res.status(400).json({ error: 'token required' });
    db.get('SELECT * FROM TableQR WHERE token = ? AND expires_at > ? AND used = 0', [token, nowISO()], (err, row) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!row) return res.status(404).json({ error: 'invalid or expired token' });
      // check table status
      db.get('SELECT * FROM DiningTable WHERE table_id = ?', [row.table_id], (e, table) => {
        if (e) return res.status(500).json({ error: e.message });
        if (!table) return res.status(404).json({ error: 'table not found' });
        if (table.status === 'locked' || table.status === 'closed') return res.status(403).json({ error: 'table not available' });
        const sessionId = randomBytes(8).toString('hex');
        const created_at = nowISO();
        const expires_at = new Date(Date.now() + 30*60*1000).toISOString();
        db.run('INSERT INTO CustomerSession (session_id, table_id, created_at, expires_at, customer_name) VALUES (?,?,?,?,?)', [sessionId, row.table_id, created_at, expires_at, customer_name || null], function (ie) {
          if (ie) return res.status(500).json({ error: ie.message });
          res.json({ session_id: sessionId, table_id: row.table_id, expires_at });
        });
      });
    });
  });

  // list menus for customers (only available and with stock >0 if stock is not null)
  app.get('/customer/menus', (req, res) => {
    const { category, search, tag } = req.query;
    let sql = 'SELECT menu_id, menu_name, category_name, price, stock, tags FROM Menu WHERE status = "available"';
    const params = [];
    if (category) { sql += ' AND category_name = ?'; params.push(category); }
    if (search) { sql += ' AND menu_name LIKE ?'; params.push('%'+search+'%'); }
    if (tag) { sql += ' AND tags LIKE ?'; params.push('%'+tag+'%'); }
    // ensure stock if defined
    sql += ' AND (stock IS NULL OR stock > 0)';
    db.all(sql, params, (err, rows) => {
      if (err) return res.status(500).json({ error: err.message });
      // only return limited fields for customers
      res.json(rows.map(r => ({ menu_id: r.menu_id, menu_name: r.menu_name, category_name: r.category_name, price: r.price, stock: r.stock })));
    });
  });

  // place order (bound to session)
  app.post('/customer/orders', async (req, res) => {
    try {
      const { session_id, items } = req.body; // items: [{menu_id, quantity}]
      if (!session_id || !Array.isArray(items) || items.length === 0) return res.status(400).json({ error: 'session_id and items required' });
      db.get('SELECT * FROM CustomerSession WHERE session_id = ? AND expires_at > ? AND status = "active"', [session_id, nowISO()], async (err, session) => {
        if (err) return res.status(500).json({ error: err.message });
        if (!session) return res.status(403).json({ error: 'invalid or expired session' });
        // check table status
        db.get('SELECT * FROM DiningTable WHERE table_id = ?', [session.table_id], (te, table) => {
          if (te) return res.status(500).json({ error: te.message });
          if (!table || table.status === 'closed' || table.status === 'locked') return res.status(403).json({ error: 'table not accepting orders' });
          // calculate totals server-side
          (async () => {
            let total = 0;
            const now = nowISO();
            // create order
            const insOrder = await new Promise((resolve, reject) => db.run('INSERT INTO Orders (customer_id, order_date, total_price, order_status) VALUES (?,?,?,?)', [null, now, 0, 'pending'], function (er) { if (er) reject(er); else resolve(this); }));
            const orderId = insOrder.lastID;
            for (const it of items) {
              const m = await new Promise((resolve, reject) => db.get('SELECT menu_id, price, stock FROM Menu WHERE menu_id = ?', [it.menu_id], (e, r) => e ? reject(e) : resolve(r)));
              if (!m) continue;
              const qty = parseInt(it.quantity || 1);
              if (m.stock != null && m.stock < qty) continue; // skip if insufficient
              const sub = (m.price || 0) * qty;
              total += sub;
              await new Promise((resolve, reject) => db.run('INSERT INTO OrderDetail (order_id, menu_id, quantity, sub_total) VALUES (?,?,?,?)', [orderId, m.menu_id, qty, sub], function (er) { if (er) reject(er); else resolve(this); }));
              // reduce stock if defined
              if (m.stock != null) await new Promise((resolve, reject) => db.run('UPDATE Menu SET stock = stock - ? WHERE menu_id = ?', [qty, m.menu_id], function (er) { if (er) reject(er); else resolve(this); }));
            }
            await new Promise((resolve, reject) => db.run('UPDATE Orders SET total_price = ?, order_status = ? WHERE order_id = ?', [total, 'pending', orderId], function (er) { if (er) reject(er); else resolve(this); }));
            // bind order to table by using Order -> we require order to tie with table via OrderTable or via CustomerSession; simplest: insert into OrderTable isn't in schema; we'll update Orders.customer_id as session.customer_name for traceability and store table via OrderDetail not ideal. For now, insert AuditLog and emit event.
            await new Promise((resolve, reject) => db.run('INSERT INTO AuditLog (actor, action, target, data, created_at) VALUES (?,?,?,?,?)', [session.customer_name || 'guest', 'place_order', String(orderId), JSON.stringify({ table_id: session.table_id }), now], function (er) { if (er) reject(er); else resolve(this); }));
            // emit event
            if (events && typeof events.emit === 'function') events.emit('new-order', { orderId, table_id: session.table_id, total });
            res.status(201).json({ order_id: orderId, status: 'pending', total });
          })().catch(e => res.status(500).json({ error: e.message }));
        });
      });
    } catch (err) { res.status(500).json({ error: err.message }); }
  });

  // customers can request bill (will mark on Orders as requested_bill=true via AuditLog)
  app.post('/customer/orders/:id/request-bill', (req, res) => {
    const session_id = req.body.session_id;
    db.get('SELECT * FROM CustomerSession WHERE session_id = ?', [session_id], (err, session) => {
      if (err) return res.status(500).json({ error: err.message });
      if (!session) return res.status(403).json({ error: 'invalid session' });
      db.run('INSERT INTO AuditLog (actor, action, target, data, created_at) VALUES (?,?,?,?,?)', [session.customer_name || 'guest', 'request_bill', req.params.id, JSON.stringify({ table_id: session.table_id }), nowISO()], function (e) {
        if (e) return res.status(500).json({ error: e.message });
        // emit event to manager
        if (events) events.emit('request-bill', { orderId: req.params.id, table_id: session.table_id });
        res.json({ requested: true });
      });
    });
  });

};
