function toMoney(value) {
  const n = Number(value || 0);
  return Number.isFinite(n) ? n.toFixed(2) : '0.00';
}

function parseId(value) {
  const n = Number.parseInt(value, 10);
  return Number.isFinite(n) ? n : null;
}

module.exports = { toMoney, parseId };
