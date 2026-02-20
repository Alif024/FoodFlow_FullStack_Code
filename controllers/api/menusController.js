function createMenusController({ menuModel }) {
  async function list(_req, res) {
    try {
      const rows = await menuModel.listAll();
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async function getById(req, res) {
    try {
      const row = await menuModel.findById(req.params.id);
      if (!row) return res.status(404).json({ error: "Not found" });
      return res.json(row);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  async function create(req, res) {
    try {
      const payload = req.body || {};
      if (!(payload.menu_name || "").trim()) {
        return res.status(400).json({ error: "menu_name is required" });
      }
      const row = await menuModel.create({
        menu_name: (payload.menu_name || "").trim(),
        category_name: (payload.category_name || "").trim() || null,
        price: Number(payload.price) || 0,
        status: (payload.status || "available").trim().toLowerCase(),
        image_path: (payload.image_path || "").trim() || null,
      });
      return res.status(201).json(row);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  async function update(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ error: "invalid menu id" });
      }
      const existing = await menuModel.findById(id);
      if (!existing) return res.status(404).json({ error: "Not found" });

      const payload = req.body || {};
      const row = await menuModel.update(id, {
        menu_name: (payload.menu_name || "").trim() || existing.menu_name,
        category_name: (payload.category_name || "").trim() || null,
        price: Number(payload.price) || 0,
        status: (payload.status || "available").trim().toLowerCase(),
        image_path: (payload.image_path || "").trim() || existing.image_path || null,
      });
      return res.json(row);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  async function remove(req, res) {
    try {
      const deleted = await menuModel.remove(req.params.id);
      return res.json({ deleted });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return {
    list,
    getById,
    create,
    update,
    remove,
  };
}

module.exports = {
  createMenusController,
};
