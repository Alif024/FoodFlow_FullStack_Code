function createOrderDetailsController({ orderDetailModel, orderModel, menuModel }) {
  async function list(_req, res) {
    try {
      const rows = await orderDetailModel.listAll();
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async function getById(req, res) {
    try {
      const row = await orderDetailModel.findById(req.params.id);
      if (!row) return res.status(404).json({ error: "Not found" });
      return res.json(row);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  async function create(req, res) {
    try {
      const { order_id, menu_id, quantity } = req.body || {};
      const menu = await menuModel.findById(menu_id);
      const qty = quantity || 1;
      const subTotal = (menu ? menu.price : 0) * qty;

      const row = await orderDetailModel.create({
        order_id,
        menu_id,
        quantity: qty,
        sub_total: subTotal,
      });

      const sum = await orderDetailModel.sumByOrderId(order_id);
      await orderModel.updateTotalPrice(order_id, sum || 0);
      return res.status(201).json(row);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  async function update(req, res) {
    try {
      const id = req.params.id;
      const { menu_id, quantity } = req.body || {};
      const menu = await menuModel.findById(menu_id);
      const qty = quantity || 1;
      const subTotal = (menu ? menu.price : 0) * qty;

      const row = await orderDetailModel.update(id, {
        menu_id,
        quantity: qty,
        sub_total: subTotal,
      });

      if (row && row.order_id) {
        const sum = await orderDetailModel.sumByOrderId(row.order_id);
        await orderModel.updateTotalPrice(row.order_id, sum || 0);
      }
      return res.json(row);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  async function remove(req, res) {
    try {
      const id = req.params.id;
      const row = await orderDetailModel.findById(id);
      if (!row) return res.status(404).json({ error: "Not found" });
      await orderDetailModel.remove(id);
      const sum = await orderDetailModel.sumByOrderId(row.order_id);
      await orderModel.updateTotalPrice(row.order_id, sum || 0);
      return res.json({ deleted: 1 });
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
  createOrderDetailsController,
};
