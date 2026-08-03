import multer from "multer";
import fs from "fs";
import path from "path";

const uploadDir = path.join(process.cwd(), "src/uploads/videos");

if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination(req, file, cb) {
    cb(null, uploadDir);
  },

  filename(req, file, cb) {
    const unique =
      Date.now() + "-" + Math.round(Math.random() * 1e9);

    cb(
      null,
      unique + path.extname(file.originalname)
    );
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = [
    "video/mp4",
    "video/webm",
    "video/quicktime",
    "video/x-msvideo",
    "video/mpeg",
  ];

  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(
      new Error(
        "Only MP4, MOV, WEBM, AVI and MPEG videos are allowed."
      )
    );
  }
};

const uploadVideo = multer({
  storage,
  fileFilter,

  limits: {
    fileSize: 100 * 1024 * 1024, // 100MB
  },
});

export default uploadVideo;