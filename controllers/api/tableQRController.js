function createTableQRController({ tableQRModel, diningTableModel }) {
  async function generate(req, res) {
    try {
      const payload = req.body || {};
      const tableId = Number(payload.table_id);
      if (!Number.isFinite(tableId) || tableId <= 0) {
        return res.status(400).json({ error: "invalid table_id" });
      }

      const table = await diningTableModel.findById(tableId);
      if (!table) return res.status(404).json({ error: "Table not found" });

      const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
      const created_at = new Date().toISOString();
      const expires_at = payload.expires_at || null;

      // Keep only one active QR token per table.
      await tableQRModel.removeByTableId(tableId);
      const row = await tableQRModel.create({ token, table_id: tableId, created_at, expires_at });

      // Provide a QR generator URL (external) and token info
      const qrData = `${req.protocol}://${req.get('host')}/t/${encodeURIComponent(token)}`;
      const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(qrData)}`;

      return res.status(201).json({ qr: { token: row.token, table_id: row.table_id, created_at: row.created_at, qrImageUrl, qrData } });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  async function getByTable(req, res) {
    try {
      const tableId = Number(req.params.tableId);
      if (!Number.isFinite(tableId) || tableId <= 0) return res.status(400).json({ error: 'invalid table id' });
      const row = await tableQRModel.findByTableId(tableId);
      if (!row) return res.status(404).json({ error: 'Not found' });
      return res.json(row);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  async function getByToken(req, res) {
    try {
      const token = req.params.token;
      if (!token) return res.status(400).json({ error: 'invalid token' });
      const row = await tableQRModel.findByToken(token);
      if (!row) return res.status(404).json({ error: 'Not found' });
      return res.json(row);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  async function list(_req, res) {
    try {
      const rows = await tableQRModel.listAll();
      return res.json(rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return {
    generate,
    getByTable,
    getByToken,
    list,
  };
}

module.exports = {
  createTableQRController,
};
