function createOrdersController({
  orderModel,
  orderDetailModel,
  diningTableModel,
  membershipModel,
  menuModel,
  onOrderEvent,
  subscribeOrderEvents,
}) {
  function toNullablePositiveInt(value) {
    const parsed = Number(value);
    if (!Number.isFinite(parsed) || parsed <= 0) return null;
    return parsed;
  }

  async function clearOrderDetails(orderId) {
    const safeOrderId = Number(orderId);
    if (!Number.isFinite(safeOrderId) || safeOrderId <= 0) return;
    if (typeof orderDetailModel.removeByOrderId === "function") {
      await orderDetailModel.removeByOrderId(safeOrderId);
      return;
    }
    const existingDetails = await orderDetailModel.listByOrderIdWithMenu(safeOrderId);
    for (const item of existingDetails) {
      const detailId = Number(item?.order_detail_id);
      if (!Number.isFinite(detailId) || detailId <= 0) continue;
      await orderDetailModel.remove(detailId);
    }
  }

  function normalizeOrderStatus(value) {
    const status = String(value || "pending").trim().toLowerCase();
    const allowed = new Set(["pending", "confirmed", "preparing", "ready", "served", "billing", "paid", "cancelled"]);
    return allowed.has(status) ? status : "pending";
  }

  function normalizePaymentStatus(value) {
    const status = String(value || "unpaid").trim().toLowerCase();
    const allowed = new Set(["unpaid", "paid", "refunded"]);
    return allowed.has(status) ? status : "unpaid";
  }

  function emitOrderEvent(event, payload = {}) {
    if (typeof onOrderEvent === "function") {
      onOrderEvent(event, payload);
    }
  }

  async function syncTableLifecycle(tableId) {
    const safeTableId = Number(tableId);
    if (!Number.isFinite(safeTableId) || safeTableId <= 0) return;
    const snapshot = await orderModel.getWorkflowSnapshotByTable(safeTableId);
    const unpaidOpen = Number(snapshot?.unpaid_open_count) || 0;
    const billingCandidates = Number(snapshot?.billing_candidate_count) || 0;
    const nextStatus = unpaidOpen <= 0 ? "open" : billingCandidates > 0 ? "billing" : "occupied";
    const updatedTable = await diningTableModel.updateStatus(safeTableId, nextStatus);
    if (updatedTable) {
      emitOrderEvent("table_status_changed", { table: updatedTable });
    }
  }

  async function buildReceipt(orderId) {
    const order = await orderModel.findById(orderId);
    if (!order) return null;
    const details = await orderDetailModel.listByOrderIdWithMenu(orderId);
    const subtotal = Number(order.total_price || 0);
    const serviceCharge = Number(order.service_charge || 0);
    const tax = Number(order.tax || 0);
    const grandTotal = subtotal + serviceCharge + tax;
    return {
      order_id: order.order_id,
      receipt_no: order.receipt_no || null,
      order_date: order.order_date,
      paid_at: order.paid_at || null,
      table_id: order.table_id || null,
      membership_id: order.membership_id || null,
      payment_status: order.payment_status || "unpaid",
      subtotal,
      service_charge: serviceCharge,
      tax,
      grand_total: grandTotal,
      details,
    };
  }

  async function list(_req, res) {
    try {
      const rows = await orderModel.listAll();
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async function getById(req, res) {
    try {
      const order = await orderModel.findById(req.params.id);
      if (!order) return res.status(404).json({ error: "Not found" });
      order.details = await orderDetailModel.listByOrderIdWithMenu(req.params.id);
      return res.json(order);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  async function kitchenQueue(_req, res) {
    try {
      const rows = await orderModel.listKitchenQueue();
      return res.json(rows);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  async function stream(req, res) {
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("Connection", "keep-alive");
    if (typeof res.flushHeaders === "function") {
      res.flushHeaders();
    }

    res.write(`event: connected\ndata: ${JSON.stringify({ ok: true, ts: Date.now() })}\n\n`);

    const unsubscribe = typeof subscribeOrderEvents === "function"
      ? subscribeOrderEvents((event, payload) => {
          try {
            res.write(`event: ${event}\ndata: ${JSON.stringify(payload || {})}\n\n`);
          } catch (_err) {
            // Client may have disconnected; close is handled below.
          }
        })
      : null;

    const heartbeat = setInterval(() => {
      try {
        res.write(`event: heartbeat\ndata: ${JSON.stringify({ ts: Date.now() })}\n\n`);
      } catch (_err) {
        // Ignore heartbeat failures for disconnected sockets.
      }
    }, 15000);

    req.on("close", () => {
      clearInterval(heartbeat);
      if (typeof unsubscribe === "function") unsubscribe();
      res.end();
    });
  }

  async function create(req, res) {
    try {
      const { table_id, membership_id, order_date, order_status, details } = req.body || {};
      const date = order_date || new Date().toISOString();

      const rawTableId = Number(table_id);
      const tableRow = Number.isFinite(rawTableId) ? await diningTableModel.findById(rawTableId) : null;
      const safeTableId = tableRow ? rawTableId : null;

      const rawMembershipId = Number(membership_id);
      const memberRow = Number.isFinite(rawMembershipId)
        ? await membershipModel.findById(rawMembershipId)
        : null;
      const safeMembershipId = memberRow ? rawMembershipId : null;

      const normalizedDetails = Array.isArray(details)
        ? details.filter((item) => Number.isFinite(Number(item.menu_id)))
        : [];

      const validDetails = [];
      for (const item of normalizedDetails) {
        const menuId = Number(item.menu_id);
        const qty = Number.isFinite(Number(item.quantity)) && Number(item.quantity) > 0 ? Number(item.quantity) : 1;
        const menuRow = await menuModel.findById(menuId);
        if (!menuRow) continue;
        validDetails.push({ menu: menuRow, qty });
      }

      if (!validDetails.length) {
        return res.status(400).json({ error: "No valid menu items in order" });
      }

      const createdOrder = await orderModel.create({
        table_id: safeTableId,
        membership_id: safeMembershipId,
        order_date: date,
        total_price: 0,
        order_status: normalizeOrderStatus(order_status || "pending"),
        payment_status: "unpaid",
        paid_at: null,
        receipt_no: null,
        service_charge: 0,
        tax: 0,
      });

      const orderId = createdOrder.order_id;
      let total = 0;
      for (const detail of validDetails) {
        const subTotal = (detail.menu.price || 0) * detail.qty;
        total += subTotal;
        await orderDetailModel.create({
          order_id: orderId,
          menu_id: detail.menu.menu_id,
          quantity: detail.qty,
          sub_total: subTotal,
        });
      }
      await orderModel.updateTotalPrice(orderId, total);
      const order = await orderModel.findById(orderId);
      await syncTableLifecycle(safeTableId);
      emitOrderEvent("order_created", { order_id: orderId, table_id: safeTableId });
      return res.status(201).json(order);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  async function update(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: "invalid order id" });
      const existing = await orderModel.findById(id);
      if (!existing) return res.status(404).json({ error: "Not found" });

      const { table_id, membership_id, order_date, order_status, payment_status, paid_at, receipt_no, service_charge, tax, details } = req.body || {};
      const requestedTableId = toNullablePositiveInt(table_id);
      const requestedMembershipId = toNullablePositiveInt(membership_id);
      const tableRow = requestedTableId ? await diningTableModel.findById(requestedTableId) : null;
      const memberRow = requestedMembershipId ? await membershipModel.findById(requestedMembershipId) : null;
      const nextTableId = tableRow ? requestedTableId : null;
      const nextMembershipId = memberRow ? requestedMembershipId : null;
      let order = null;
      try {
        order = await orderModel.update(id, {
          table_id: nextTableId,
          membership_id: nextMembershipId,
          order_date,
          order_status: normalizeOrderStatus(order_status),
          payment_status: normalizePaymentStatus(payment_status || existing.payment_status || "unpaid"),
          paid_at: paid_at || existing.paid_at || null,
          receipt_no: receipt_no || existing.receipt_no || null,
          service_charge: Number(service_charge ?? existing.service_charge) || 0,
          tax: Number(tax ?? existing.tax) || 0,
        });
      } catch (err) {
        return res.status(500).json({ error: err.message, where: "orders.update.order" });
      }

      if (Array.isArray(details)) {
        const normalizedDetails = details.filter((item) => Number.isFinite(Number(item.menu_id)));
        const validDetails = [];
        for (const item of normalizedDetails) {
          const menuId = Number(item.menu_id);
          const qty = Number.isFinite(Number(item.quantity)) && Number(item.quantity) > 0 ? Number(item.quantity) : 1;
          const menuRow = await menuModel.findById(menuId);
          if (!menuRow) continue;
          validDetails.push({ menu: menuRow, qty });
        }

        if (!validDetails.length) {
          return res.status(400).json({ error: "No valid menu items in order" });
        }

        try {
          await clearOrderDetails(id);
        } catch (err) {
          return res.status(500).json({ error: err.message, where: "orders.update.clear_details" });
        }
        let nextTotal = 0;
        for (const detail of validDetails) {
          const subTotal = (detail.menu.price || 0) * detail.qty;
          nextTotal += subTotal;
          try {
            await orderDetailModel.create({
              order_id: id,
              menu_id: detail.menu.menu_id,
              quantity: detail.qty,
              sub_total: subTotal,
            });
          } catch (err) {
            return res.status(500).json({ error: err.message, where: "orders.update.create_detail" });
          }
        }
        await orderModel.updateTotalPrice(id, nextTotal);
      }

      await syncTableLifecycle(existing.table_id);
      if (nextTableId && nextTableId !== Number(existing.table_id)) {
        await syncTableLifecycle(nextTableId);
      }
      emitOrderEvent("order_updated", { order_id: id, table_id: nextTableId || existing.table_id });
      const latestOrder = await orderModel.findById(id);
      return res.json(latestOrder || order);
    } catch (err) {
      return res.status(500).json({ error: err.message, where: "orders.update" });
    }
  }

  async function markPaid(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: "invalid order id" });
      const existing = await orderModel.findById(id);
      if (!existing) return res.status(404).json({ error: "Not found" });

      const nowIso = new Date().toISOString();
      const dateCode = nowIso.slice(0, 10).replace(/-/g, "");
      const receiptNo = existing.receipt_no || `R-${dateCode}-${String(id).padStart(6, "0")}`;
      const paid = await orderModel.markPaid(id, {
        paid_at: nowIso,
        receipt_no: receiptNo,
        service_charge: Number(req.body?.service_charge) || 0,
        tax: Number(req.body?.tax) || 0,
      });
      await syncTableLifecycle(existing.table_id);
      emitOrderEvent("order_paid", { order_id: id, table_id: existing.table_id, receipt_no: receiptNo });
      return res.json(paid);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  async function getReceipt(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) return res.status(400).json({ error: "invalid order id" });
      const receipt = await buildReceipt(id);
      if (!receipt) return res.status(404).json({ error: "Not found" });
      return res.json(receipt);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  async function remove(req, res) {
    try {
      const id = Number(req.params.id);
      const existing = await orderModel.findById(id);
      if (!existing) return res.status(404).json({ error: "Not found" });
      const deleted = await orderModel.remove(id);
      await syncTableLifecycle(existing.table_id);
      emitOrderEvent("order_deleted", { order_id: id, table_id: existing.table_id });
      return res.json({ deleted });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return {
    list,
    getById,
    stream,
    kitchenQueue,
    create,
    update,
    markPaid,
    getReceipt,
    remove,
  };
}

module.exports = {
  createOrdersController,
};
