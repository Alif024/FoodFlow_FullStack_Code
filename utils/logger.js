function write(level, message, meta = {}) {
  const payload = {
    ts: new Date().toISOString(),
    level,
    message,
    ...meta,
  };
  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
    return;
  }
  console.log(line);
}

function logInfo(message, meta) {
  write("info", message, meta);
}

function logError(message, meta) {
  write("error", message, meta);
}

module.exports = {
  logInfo,
  logError,
};
