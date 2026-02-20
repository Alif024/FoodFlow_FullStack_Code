const fs = require("fs");
const path = require("path");
const multer = require("multer");

const imagesDir = path.join(__dirname, "..", "public", "assets", "images");
if (!fs.existsSync(imagesDir)) {
  fs.mkdirSync(imagesDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, imagesDir);
  },
  filename: (req, _file, cb) => {
    const rawMenuName = String(req.body?.menu_name || "").trim();
    const safeBase = rawMenuName
      .replace(/[<>:"/\\|?*\x00-\x1F]/g, "_")
      .replace(/\s+/g, "_")
      .replace(/\.+$/g, "")
      .slice(0, 120);

    cb(null, `${safeBase || "menu-image"}.png`);
  },
});

function imageFilter(_req, file, cb) {
  if (!file || !file.mimetype) return cb(null, false);
  if (file.mimetype.startsWith("image/")) return cb(null, true);
  return cb(new Error("Only image files are allowed"));
}

const menuImageUpload = multer({
  storage,
  fileFilter: imageFilter,
  limits: { fileSize: 5 * 1024 * 1024 },
}).single("menuImage");

module.exports = {
  menuImageUpload,
};
