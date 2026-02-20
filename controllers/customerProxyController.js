function createCustomerProxyController({ MENUS_API, UPSTREAM_BASE }) {
  async function proxyMenus(req, res, path = "") {
    try {
      const method = req.method || "GET";
      const url = `${UPSTREAM_BASE}/menus${path}`;
      const isReadOnly = method === "GET" || method === "DELETE";
      const payload = {
        menu_name: (req.body?.menu_name || "").trim(),
        category_name: (req.body?.category_name || "").trim(),
        price: Number(req.body?.price) || 0,
        status: (req.body?.status || "available").trim().toLowerCase(),
      };

      if ((req.body?.image_path || "").trim()) {
        payload.image_path = req.body.image_path.trim();
      }
      if (req.file?.filename) {
        payload.image_path = `/assets/images/${req.file.filename}`;
      }

      const upstream = await fetch(url, {
        method,
        headers: isReadOnly ? undefined : { "Content-Type": "application/json" },
        body: isReadOnly ? undefined : JSON.stringify(payload),
      });
      if (!upstream.ok) {
        const text = await upstream.text();
        return res.status(upstream.status).send(text);
      }
      const text = await upstream.text();
      if (method === "GET") {
        res.set("Cache-Control", "no-store");
      }
      return res.status(upstream.status).send(text);
    } catch (err) {
      console.error("Menu proxy failed", err);
      return res.status(502).json({ error: "Failed to proxy menu request" });
    }
  }

  async function proxyMembership(req, res, path = "") {
    try {
      const upstream = await fetch(`${UPSTREAM_BASE}/memberships${path}`, {
        method: req.method,
        headers: { "Content-Type": "application/json" },
        body:
          req.method === "GET" || req.method === "DELETE"
            ? undefined
            : JSON.stringify(req.body || {}),
      });
      const text = await upstream.text();
      return res.status(upstream.status).send(text);
    } catch (err) {
      console.error("Membership proxy failed", err);
      return res.status(502).json({ error: "Failed to proxy membership request" });
    }
  }

  async function proxyOrders(req, res, path = "") {
    try {
      const upstream = await fetch(`${UPSTREAM_BASE}/orders${path}`, {
        method: req.method,
        headers: req.method === "GET" || req.method === "DELETE" ? undefined : { "Content-Type": "application/json" },
        body: req.method === "GET" || req.method === "DELETE" ? undefined : JSON.stringify(req.body || {}),
      });
      const text = await upstream.text();
      return res.status(upstream.status).send(text);
    } catch (err) {
      console.error("Order proxy failed", err);
      return res.status(502).json({ error: "Failed to proxy order request" });
    }
  }

  async function proxyMembershipRegistration(req, res) {
    try {
      const upstream = await fetch(`${UPSTREAM_BASE}/memberships`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });
      const text = await upstream.text();
      return res.status(upstream.status).send(text);
    } catch (err) {
      console.error("Memberships proxy failed", err);
      return res.status(502).json({ error: "Failed to create membership" });
    }
  }

  async function proxyLogin(req, res) {
    try {
      const upstream = await fetch(`${UPSTREAM_BASE}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(req.body),
      });
      const text = await upstream.text();
      return res.status(upstream.status).send(text);
    } catch (err) {
      console.error("Login proxy failed", err);
      return res.status(502).json({ error: "Failed to login" });
    }
  }

  return {
    proxyMenus,
    proxyMembership,
    proxyOrders,
    proxyMembershipRegistration,
    proxyLogin,
  };
}

module.exports = {
  createCustomerProxyController,
};
