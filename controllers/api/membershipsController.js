function createMembershipsController({ membershipModel, passwordService }) {
  async function list(_req, res) {
    try {
      const rows = await membershipModel.listAll();
      res.json(rows);
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  }

  async function getById(req, res) {
    try {
      const row = await membershipModel.findPublicById(req.params.id);
      if (!row) return res.status(404).json({ error: "membership not found" });
      return res.json(row);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  async function create(req, res) {
    try {
      const {
        member_name,
        member_lastname,
        phone,
        email,
        password,
        tier,
        points,
        active,
      } = req.body || {};

      if (!member_name || !email || !password) {
        return res.status(400).json({ error: "member_name, email, and password are required" });
      }

      const existing = await membershipModel.findByEmail(email);
      if (existing) return res.status(409).json({ error: "email already registered" });

      const { salt, passwordHash } = passwordService.hashPassword(password);
      const safeTier = (tier || "basic").toString().trim().toLowerCase() || "basic";
      const safePoints = Number.isFinite(Number(points)) ? Math.max(0, Number(points)) : 0;
      const safeActive = Number(active) === 0 ? 0 : 1;

      const row = await membershipModel.create({
        member_name,
        member_lastname: member_lastname || null,
        phone: phone || null,
        email,
        password_hash: passwordHash,
        salt,
        tier: safeTier,
        points: safePoints,
        created_at: new Date().toISOString(),
        active: safeActive,
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
        return res.status(400).json({ error: "invalid membership id" });
      }

      const existing = await membershipModel.findById(id);
      if (!existing) return res.status(404).json({ error: "membership not found" });

      const {
        member_name,
        member_lastname,
        phone,
        email,
        password,
        tier,
        points,
        active,
      } = req.body || {};

      const safeEmail = (email || existing.email || "").trim().toLowerCase();
      if (!safeEmail) return res.status(400).json({ error: "email is required" });

      const emailOwner = await membershipModel.findEmailOwner(safeEmail, id);
      if (emailOwner) return res.status(409).json({ error: "email already registered" });

      let nextSalt = existing.salt;
      let nextHash = existing.password_hash;
      if ((password || "").trim()) {
        const hashed = passwordService.hashPassword(password);
        nextSalt = hashed.salt;
        nextHash = hashed.passwordHash;
      }

      const safePoints = Number.isFinite(Number(points))
        ? Math.max(0, Number(points))
        : existing.points || 0;
      const safeActive = Number(active) === 0 ? 0 : 1;

      const updated = await membershipModel.update(id, {
        member_name: (member_name || "").trim() || existing.member_name || null,
        member_lastname: (member_lastname || "").trim() || null,
        phone: (phone || "").trim() || null,
        email: safeEmail,
        password_hash: nextHash,
        salt: nextSalt,
        tier: (tier || existing.tier || "basic").toString().toLowerCase(),
        points: safePoints,
        active: safeActive,
      });

      return res.json(updated);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  async function remove(req, res) {
    try {
      const id = Number(req.params.id);
      if (!Number.isFinite(id) || id <= 0) {
        return res.status(400).json({ error: "invalid membership id" });
      }
      const existing = await membershipModel.findById(id);
      if (!existing) return res.status(404).json({ error: "membership not found" });
      await membershipModel.remove(id);
      return res.json({ deleted: 1, membership_id: id });
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
  createMembershipsController,
};
