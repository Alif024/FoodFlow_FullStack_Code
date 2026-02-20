const TABLES = {
  "2da29783b20a2ed5935bf86ec602b7fc": { tableNo: 1 },
  a3daf60f0013e2ece9d3d517f463b1e6: { tableNo: 2 },
};

function resolveTableInfo(tableKey) {
  return TABLES[tableKey];
}

function renderTableNotFound(res) {
  return res.status(404).render("not_found", {
    title: "Table Not Found",
    stylesheet: "/css/member.css",
    script: "/js/member.js",
  });
}

function renderMemberLogin(req, res) {
  const { tableKey } = req.params;
  const tableInfo = resolveTableInfo(tableKey);
  if (!tableInfo || !tableInfo.tableNo) return renderTableNotFound(res);

  return res.render("customer/member_login", {
    title: "Member Area",
    stylesheet: "/css/member.css",
    script: "/js/member.js",
    tableNo: tableInfo.tableNo,
    tableKey,
  });
}

function renderMemberRegister(req, res) {
  const { tableKey } = req.params;
  const tableInfo = resolveTableInfo(tableKey);
  if (!tableInfo || !tableInfo.tableNo) return renderTableNotFound(res);

  return res.render("customer/member_register", {
    title: "Member Area",
    stylesheet: "/css/member.css",
    script: "/js/member.js",
    tableNo: tableInfo.tableNo,
    tableKey,
  });
}

function renderTableDashboard(req, res, next) {
  const { tableKey } = req.params;
  if (tableKey === "api" || tableKey === "member-login" || tableKey === "member-register") {
    return next();
  }

  const tableInfo = resolveTableInfo(tableKey);
  if (!tableInfo || !tableInfo.tableNo) return renderTableNotFound(res);

  return res.render("customer/index", {
    title: "FoodFlow",
    stylesheet: "/css/index.css",
    script: "/js/index.js",
    tableNo: tableInfo.tableNo,
    tableKey,
  });
}

module.exports = {
  renderTableNotFound,
  renderMemberLogin,
  renderMemberRegister,
  renderTableDashboard,
};
