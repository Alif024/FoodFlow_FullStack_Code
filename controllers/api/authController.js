function createAuthController({ membershipModel, passwordService }) {
  async function login(req, res) {
    const { email, password } = req.body || {};
    if (!email || !password) return res.status(400).json({ error: "email and password required" });

    try {
      const member = await membershipModel.findByEmail(email);
      if (!member) return res.status(401).json({ error: "invalid credentials" });

      const isValid = passwordService.verifyPassword(password, member.salt || "", member.password_hash);
      if (!isValid) return res.status(401).json({ error: "invalid credentials" });

      return res.json({
        success: true,
        membership_id: member.membership_id,
        member_name: member.member_name || null,
        member_lastname: member.member_lastname || null,
        phone: member.phone || null,
      });
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }
  }

  return {
    login,
  };
}

module.exports = {
  createAuthController,
};
