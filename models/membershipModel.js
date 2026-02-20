const { reseedAutoIncrement } = require("../services/sqliteSequenceService");

function createMembershipModel(dbClient) {
  const PUBLIC_SELECT =
    "SELECT membership_id, member_name, member_lastname, phone, email, tier, points, created_at, active FROM Membership";

  async function listAll() {
    return dbClient.all(PUBLIC_SELECT);
  }

  async function findById(id) {
    return dbClient.get("SELECT * FROM Membership WHERE membership_id = ?", [id]);
  }

  async function findPublicById(id) {
    return dbClient.get(`${PUBLIC_SELECT} WHERE membership_id = ?`, [id]);
  }

  async function findByEmail(email) {
    return dbClient.get("SELECT * FROM Membership WHERE email = ?", [email]);
  }

  async function findEmailOwner(email, excludeMembershipId) {
    return dbClient.get(
      "SELECT membership_id FROM Membership WHERE email = ? AND membership_id != ?",
      [email, excludeMembershipId],
    );
  }

  async function create(payload = {}) {
    await dbClient.run(
      `INSERT INTO Membership
       (member_name, member_lastname, phone, email, password_hash, salt, tier, points, created_at, active)
       VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [
        payload.member_name || null,
        payload.member_lastname || null,
        payload.phone || null,
        payload.email,
        payload.password_hash || null,
        payload.salt || null,
        payload.tier || "basic",
        payload.points || 0,
        payload.created_at || null,
        payload.active == null ? 1 : payload.active,
      ],
    );
    return dbClient.get(`${PUBLIC_SELECT} WHERE email = ?`, [payload.email]);
  }

  async function update(id, payload = {}) {
    await dbClient.run(
      `UPDATE Membership
       SET member_name = ?, member_lastname = ?, phone = ?, email = ?, password_hash = ?, salt = ?, tier = ?, points = ?, active = ?
       WHERE membership_id = ?`,
      [
        payload.member_name || null,
        payload.member_lastname || null,
        payload.phone || null,
        payload.email,
        payload.password_hash || null,
        payload.salt || null,
        payload.tier || "basic",
        payload.points || 0,
        payload.active == null ? 1 : payload.active,
        id,
      ],
    );
    return findPublicById(id);
  }

  async function remove(id) {
    const result = await dbClient.run("DELETE FROM Membership WHERE membership_id = ?", [id]);
    if (result.changes > 0) {
      await reseedAutoIncrement(dbClient, "Membership", "membership_id");
    }
    return result.changes;
  }

  return {
    listAll,
    findById,
    findPublicById,
    findByEmail,
    findEmailOwner,
    create,
    update,
    remove,
  };
}

module.exports = {
  createMembershipModel,
};
