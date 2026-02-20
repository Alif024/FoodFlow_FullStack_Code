const { logInfo } = require("../utils/logger");

function createRequestLogger(service) {
  return function requestLogger(req, res, next) {
    const startTime = Date.now();
    res.on("finish", () => {
      logInfo("http_request", {
        service,
        method: req.method,
        path: req.originalUrl || req.url,
        status: res.statusCode,
        duration_ms: Date.now() - startTime,
      });
    });
    next();
  };
}

module.exports = {
  createRequestLogger,
};
