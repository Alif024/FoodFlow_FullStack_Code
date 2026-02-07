const path = require('path');
const fs = require('fs');
const sqlite3 = require('sqlite3').verbose();

const dbFile = path.join(__dirname, 'database.sqlite');
const exists = fs.existsSync(dbFile);
const db = new sqlite3.Database(dbFile);

function run(sql, params = []) {
	return new Promise((resolve, reject) => {
		db.run(sql, params, function (err) {
			if (err) reject(err);
			else resolve(this);
		});
	});
}

function get(sql, params = []) {
	return new Promise((resolve, reject) => {
		db.get(sql, params, (err, row) => (err ? reject(err) : resolve(row)));
	});
}
async function init() {
	try {
		await run("PRAGMA foreign_keys = ON;");

		await run(`
	  CREATE TABLE IF NOT EXISTS Menu (
		menu_id INTEGER PRIMARY KEY AUTOINCREMENT,
		menu_name TEXT NOT NULL,
		category_name TEXT,
				price REAL NOT NULL,
				stock INTEGER,
				tags TEXT,
		status TEXT DEFAULT 'available'
	  );
	`);

		await run(`
	  CREATE TABLE IF NOT EXISTS Customer (
		customer_id INTEGER PRIMARY KEY AUTOINCREMENT,
		customer_name TEXT NOT NULL,
		phone TEXT,
		email TEXT
	  );
	`);

		await run(`
	  CREATE TABLE IF NOT EXISTS Orders (
		order_id INTEGER PRIMARY KEY AUTOINCREMENT,
		customer_id INTEGER,
		order_date TEXT,
		total_price REAL DEFAULT 0,
		order_status TEXT DEFAULT 'pending',
		FOREIGN KEY(customer_id) REFERENCES Customer(customer_id) ON DELETE SET NULL
	  );
	`);

		await run(`
	  CREATE TABLE IF NOT EXISTS OrderDetail (
		order_detail_id INTEGER PRIMARY KEY AUTOINCREMENT,
		order_id INTEGER,
		menu_id INTEGER,
		quantity INTEGER DEFAULT 1,
		sub_total REAL DEFAULT 0,
		FOREIGN KEY(order_id) REFERENCES Orders(order_id) ON DELETE CASCADE,
		FOREIGN KEY(menu_id) REFERENCES Menu(menu_id) ON DELETE SET NULL
	  );
	`);

		await run(`
			CREATE TABLE IF NOT EXISTS DiningTable (
				table_id INTEGER PRIMARY KEY AUTOINCREMENT,
				table_name TEXT,
				status TEXT DEFAULT 'open', -- open, closed, locked
				created_at TEXT
			);
		`);

		await run(`
			CREATE TABLE IF NOT EXISTS CustomerSession (
				session_id TEXT PRIMARY KEY,
				table_id INTEGER,
				created_at TEXT,
				expires_at TEXT,
				customer_name TEXT,
				status TEXT DEFAULT 'active', -- active, closed
				FOREIGN KEY(table_id) REFERENCES DiningTable(table_id) ON DELETE SET NULL
			);
		`);

		await run(`
			CREATE TABLE IF NOT EXISTS TableQR (
				token TEXT PRIMARY KEY,
				table_id INTEGER,
				created_at TEXT,
				expires_at TEXT,
				used INTEGER DEFAULT 0
			);
		`);

		await run(`
			CREATE TABLE IF NOT EXISTS AuditLog (
				id INTEGER PRIMARY KEY AUTOINCREMENT,
				actor TEXT,
				action TEXT,
				target TEXT,
				data TEXT,
				created_at TEXT
			);
		`);

		// insert sample Menu items if table empty
		const menuCount = await get(`SELECT COUNT(*) as c FROM Menu`);
		if (menuCount && menuCount.c === 0) {
			await run(`INSERT INTO Menu (menu_name, category_name, price, status) VALUES (?,?,?,?)`, ['Pad Thai', 'Noodles', 60, 'available']);
			await run(`INSERT INTO Menu (menu_name, category_name, price, status) VALUES (?,?,?,?)`, ['Green Curry', 'Curry', 80, 'available']);
			await run(`INSERT INTO Menu (menu_name, category_name, price, status) VALUES (?,?,?,?)`, ['Mango Sticky Rice', 'Dessert', 50, 'available']);
			console.log('Inserted sample Menu items');
		}

		// insert sample Customers if empty
		const custCount = await get(`SELECT COUNT(*) as c FROM Customer`);
		if (custCount && custCount.c === 0) {
			await run(`INSERT INTO Customer (customer_name, phone, email) VALUES (?,?,?)`, ['Somchai', '0812345678', 'somchai@example.com']);
			await run(`INSERT INTO Customer (customer_name, phone, email) VALUES (?,?,?)`, ['Suda', '0898765432', 'suda@example.com']);
			console.log('Inserted sample Customers');
		}

		// insert a sample order with details if none exist
		const orderCount = await get(`SELECT COUNT(*) as c FROM Orders`);
		if (orderCount && orderCount.c === 0) {
			// create order for Somchai
			const now = new Date().toISOString();
			const res = await run(`INSERT INTO Orders (customer_id, order_date, total_price, order_status) VALUES (?,?,?,?)`, [1, now, 0, 'confirmed']);
			const orderId = res.lastID;

			// add order details (2 x Pad Thai, 1 x Mango Sticky Rice)
			// fetch Pad Thai and Mango ids
			const pad = await get(`SELECT menu_id, price FROM Menu WHERE menu_name = ?`, ['Pad Thai']);
			const mango = await get(`SELECT menu_id, price FROM Menu WHERE menu_name = ?`, ['Mango Sticky Rice']);
			const sub1 = pad.price * 2;
			const sub2 = mango.price * 1;
			await run(`INSERT INTO OrderDetail (order_id, menu_id, quantity, sub_total) VALUES (?,?,?,?)`, [orderId, pad.menu_id, 2, sub1]);
			await run(`INSERT INTO OrderDetail (order_id, menu_id, quantity, sub_total) VALUES (?,?,?,?)`, [orderId, mango.menu_id, 1, sub2]);

			const total = sub1 + sub2;
			await run(`UPDATE Orders SET total_price = ? WHERE order_id = ?`, [total, orderId]);
			console.log('Inserted sample Order and OrderDetail');
		}

		console.log('Database initialization complete. DB file:', dbFile);
	} catch (err) {
		console.error('Error initializing database:', err);
	}
}

// Start express server with CRUD endpoints on port 7000
function startServer() {
	const express = require('express');
	const app = express();
	app.use(express.json());
	app.use(express.urlencoded({ extended: true }));

	const EventEmitter = require('events');
	const events = new EventEmitter();

	// mount customer and manager routers
	try {
		require('../routes/customer')(app, dbFile, events);
	} catch (e) { console.warn('customer routes not loaded:', e.message); }
	try {
		require('../routes/manager')(app, dbFile, events);
	} catch (e) { console.warn('manager routes not loaded:', e.message); }

	// Menus CRUD
	app.get('/menus', async (req, res) => {
		db.all('SELECT * FROM Menu', (err, rows) => {
			if (err) return res.status(500).json({ error: err.message });
			res.json(rows);
		});
	});

	app.get('/menus/:id', (req, res) => {
		db.get('SELECT * FROM Menu WHERE menu_id = ?', [req.params.id], (err, row) => {
			if (err) return res.status(500).json({ error: err.message });
			if (!row) return res.status(404).json({ error: 'Not found' });
			res.json(row);
		});
	});

	app.post('/menus', (req, res) => {
		const { menu_name, category_name, price, status } = req.body;
		db.run(
			`INSERT INTO Menu (menu_name, category_name, price, status) VALUES (?,?,?,?)`,
			[menu_name, category_name, price || 0, status || 'available'],
			function (err) {
				if (err) return res.status(500).json({ error: err.message });
				db.get('SELECT * FROM Menu WHERE menu_id = ?', [this.lastID], (e, row) => res.status(201).json(row));
			}
		);
	});

	app.put('/menus/:id', (req, res) => {
		const { menu_name, category_name, price, status } = req.body;
		db.run(
			`UPDATE Menu SET menu_name=?, category_name=?, price=?, status=? WHERE menu_id = ?`,
			[menu_name, category_name, price || 0, status || 'available', req.params.id],
			function (err) {
				if (err) return res.status(500).json({ error: err.message });
				db.get('SELECT * FROM Menu WHERE menu_id = ?', [req.params.id], (e, row) => res.json(row));
			}
		);
	});

	app.delete('/menus/:id', (req, res) => {
		db.run('DELETE FROM Menu WHERE menu_id = ?', [req.params.id], function (err) {
			if (err) return res.status(500).json({ error: err.message });
			res.json({ deleted: this.changes });
		});
	});

	// Customers CRUD
	app.get('/customers', (req, res) => {
		db.all('SELECT * FROM Customer', (err, rows) => {
			if (err) return res.status(500).json({ error: err.message });
			res.json(rows);
		});
	});

	app.get('/customers/:id', (req, res) => {
		db.get('SELECT * FROM Customer WHERE customer_id = ?', [req.params.id], (err, row) => {
			if (err) return res.status(500).json({ error: err.message });
			if (!row) return res.status(404).json({ error: 'Not found' });
			res.json(row);
		});
	});

	app.post('/customers', (req, res) => {
		const { customer_name, phone, email } = req.body;
		db.run(`INSERT INTO Customer (customer_name, phone, email) VALUES (?,?,?)`, [customer_name, phone, email], function (err) {
			if (err) return res.status(500).json({ error: err.message });
			db.get('SELECT * FROM Customer WHERE customer_id = ?', [this.lastID], (e, row) => res.status(201).json(row));
		});
	});

	app.put('/customers/:id', (req, res) => {
		const { customer_name, phone, email } = req.body;
		db.run(`UPDATE Customer SET customer_name=?, phone=?, email=? WHERE customer_id = ?`, [customer_name, phone, email, req.params.id], function (err) {
			if (err) return res.status(500).json({ error: err.message });
			db.get('SELECT * FROM Customer WHERE customer_id = ?', [req.params.id], (e, row) => res.json(row));
		});
	});

	app.delete('/customers/:id', (req, res) => {
		db.run('DELETE FROM Customer WHERE customer_id = ?', [req.params.id], function (err) {
			if (err) return res.status(500).json({ error: err.message });
			res.json({ deleted: this.changes });
		});
	});

	// Orders CRUD
	app.get('/orders', (req, res) => {
		db.all('SELECT * FROM Orders', (err, rows) => {
			if (err) return res.status(500).json({ error: err.message });
			res.json(rows);
		});
	});

	app.get('/orders/:id', (req, res) => {
		const id = req.params.id;
		db.get('SELECT * FROM Orders WHERE order_id = ?', [id], (err, order) => {
			if (err) return res.status(500).json({ error: err.message });
			if (!order) return res.status(404).json({ error: 'Not found' });
			db.all('SELECT od.*, m.menu_name, m.price FROM OrderDetail od LEFT JOIN Menu m ON od.menu_id = m.menu_id WHERE od.order_id = ?', [id], (e, details) => {
				if (e) return res.status(500).json({ error: e.message });
				order.details = details;
				res.json(order);
			});
		});
	});

	// create order with optional details: { customer_id, order_date, order_status, details: [{menu_id, quantity}] }
	app.post('/orders', async (req, res) => {
		try {
			const { customer_id, order_date, order_status, details } = req.body;
			const date = order_date || new Date().toISOString();
			const result = await run(`INSERT INTO Orders (customer_id, order_date, total_price, order_status) VALUES (?,?,?,?)`, [customer_id || null, date, 0, order_status || 'pending']);
			const orderId = result.lastID;
			let total = 0;
			if (Array.isArray(details)) {
				for (const d of details) {
					const m = await get('SELECT price FROM Menu WHERE menu_id = ?', [d.menu_id]);
					const qty = d.quantity || 1;
					const sub = (m ? m.price : 0) * qty;
					total += sub;
					await run(`INSERT INTO OrderDetail (order_id, menu_id, quantity, sub_total) VALUES (?,?,?,?)`, [orderId, d.menu_id, qty, sub]);
				}
			}
			await run('UPDATE Orders SET total_price = ? WHERE order_id = ?', [total, orderId]);
			const order = await get('SELECT * FROM Orders WHERE order_id = ?', [orderId]);
			res.status(201).json(order);
		} catch (err) {
			res.status(500).json({ error: err.message });
		}
	});

	app.put('/orders/:id', async (req, res) => {
		try {
			const id = req.params.id;
			const { customer_id, order_date, order_status } = req.body;
			await run('UPDATE Orders SET customer_id=?, order_date=?, order_status=? WHERE order_id = ?', [customer_id, order_date, order_status, id]);
			const order = await get('SELECT * FROM Orders WHERE order_id = ?', [id]);
			res.json(order);
		} catch (err) {
			res.status(500).json({ error: err.message });
		}
	});

	app.delete('/orders/:id', (req, res) => {
		db.run('DELETE FROM Orders WHERE order_id = ?', [req.params.id], function (err) {
			if (err) return res.status(500).json({ error: err.message });
			res.json({ deleted: this.changes });
		});
	});

	// OrderDetail CRUD
	app.get('/order-details', (req, res) => {
		db.all('SELECT * FROM OrderDetail', (err, rows) => {
			if (err) return res.status(500).json({ error: err.message });
			res.json(rows);
		});
	});

	app.get('/order-details/:id', (req, res) => {
		db.get('SELECT * FROM OrderDetail WHERE order_detail_id = ?', [req.params.id], (err, row) => {
			if (err) return res.status(500).json({ error: err.message });
			if (!row) return res.status(404).json({ error: 'Not found' });
			res.json(row);
		});
	});

	app.post('/order-details', async (req, res) => {
		try {
			const { order_id, menu_id, quantity } = req.body;
			const m = await get('SELECT price FROM Menu WHERE menu_id = ?', [menu_id]);
			const qty = quantity || 1;
			const sub = (m ? m.price : 0) * qty;
			const r = await run(`INSERT INTO OrderDetail (order_id, menu_id, quantity, sub_total) VALUES (?,?,?,?)`, [order_id, menu_id, qty, sub]);
			// update order total
			const sum = await get('SELECT SUM(sub_total) as s FROM OrderDetail WHERE order_id = ?', [order_id]);
			await run('UPDATE Orders SET total_price = ? WHERE order_id = ?', [sum.s || 0, order_id]);
			const row = await get('SELECT * FROM OrderDetail WHERE order_detail_id = ?', [r.lastID]);
			res.status(201).json(row);
		} catch (err) {
			res.status(500).json({ error: err.message });
		}
	});

	app.put('/order-details/:id', async (req, res) => {
		try {
			const id = req.params.id;
			const { menu_id, quantity } = req.body;
			const m = await get('SELECT price FROM Menu WHERE menu_id = ?', [menu_id]);
			const qty = quantity || 1;
			const sub = (m ? m.price : 0) * qty;
			await run('UPDATE OrderDetail SET menu_id=?, quantity=?, sub_total=? WHERE order_detail_id = ?', [menu_id, qty, sub, id]);
			const row = await get('SELECT * FROM OrderDetail WHERE order_detail_id = ?', [id]);
			// update order total
			await run('UPDATE Orders SET total_price = (SELECT IFNULL(SUM(sub_total),0) FROM OrderDetail WHERE order_id = ?) WHERE order_id = ?', [row.order_id, row.order_id]);
			res.json(row);
		} catch (err) {
			res.status(500).json({ error: err.message });
		}
	});

	app.delete('/order-details/:id', async (req, res) => {
		try {
			const id = req.params.id;
			const row = await get('SELECT * FROM OrderDetail WHERE order_detail_id = ?', [id]);
			if (!row) return res.status(404).json({ error: 'Not found' });
			await run('DELETE FROM OrderDetail WHERE order_detail_id = ?', [id]);
			await run('UPDATE Orders SET total_price = (SELECT IFNULL(SUM(sub_total),0) FROM OrderDetail WHERE order_id = ?) WHERE order_id = ?', [row.order_id, row.order_id]);
			res.json({ deleted: 1 });
		} catch (err) {
			res.status(500).json({ error: err.message });
		}
	});

	const port = 7000;
	app.listen(port, () => console.log(`CRUD API running on http://localhost:${port}`));
}

// Run when invoked directly: initialize DB then start server
if (require.main === module) {
	(async () => {
		await init();
		startServer();
		// keep DB open while server runs
		process.on('SIGINT', () => {
			console.log('Shutting down server and closing DB');
			db.close(() => process.exit());
		});
	})();
}

