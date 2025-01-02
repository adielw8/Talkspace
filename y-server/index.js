import express from "express";
import multer from "multer";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import fs from "fs/promises";

export const app = express();
const port = 3000;
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5M
const DB_PATH = "./uploads/db/images.json";

app.use(cors());
app.use(express.json());

app.use((req, res, next) => {
  console.log(`${req.method} ${req.url}`);
  next();
});

const storage = multer.diskStorage({
  destination: "./uploads/",
  filename: (req, file, cb) => cb(null, `${uuidv4()}.jpg`),
});

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
});

const initializeDirectories = async () => {
  try {
    await fs.mkdir("./uploads", { recursive: true });
    await fs.mkdir("./uploads/db", { recursive: true });
    try {
      await fs.access(DB_PATH);
    } catch {
      await fs.writeFile(DB_PATH, JSON.stringify({}));
    }
  } catch (error) {
    console.error("Error initializing directories:", error);
  }
};

const uploadMiddleware = (req, res, next) => {
  upload.single("image")(req, res, (err) => {
    if (err instanceof multer.MulterError) {
      if (err.code === "LIMIT_FILE_SIZE") {
        return res.status(413).json({
          error: `File too large. Maximum size is ${
            MAX_FILE_SIZE / (1024 * 1024)
          }MB`,
        });
      }
      return res.status(400).json({ error: err.message });
    }
    next(err);
  });
};

const readImagesData = async () => {
  try {
    const data = await fs.readFile(DB_PATH);
    return JSON.parse(data);
  } catch (error) {
    console.error("Error reading images data:", error);
    return {};
  }
};

const writeImagesData = async (data) => {
  try {
    await fs.writeFile(DB_PATH, JSON.stringify(data, null, 2));
  } catch (error) {
    console.error("Error writing images data:", error);
  }
};

app.post("/v1/images", uploadMiddleware, async (req, res) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No image provided" });

    const id = req.file.filename.split(".")[0];
    const expiry = Date.now() + parseInt(req.body.expirationTime) * 60 * 1000;

    const images = await readImagesData();
    images[id] = { path: req.file.path, expiry };
    await writeImagesData(images);

    res.json({ url: `${req.protocol}://${req.get("host")}/v1/images/${id}` });
  } catch (error) {
    res.status(500).json({ error: "Upload failed" });
  }
});

app.get("/v1/images/:imageID", async (req, res) => {
  try {
    const { imageID } = req.params;
    const images = await readImagesData();
    const image = images[imageID];

    if (!image) return res.status(404).json({ error: "Image not found" });
    if (Date.now() > image.expiry) {
      try {
        await fs.unlink(image.path);
      } catch (error) {
        console.error("Error deleting file:", error);
      }
      delete images[imageID];
      await writeImagesData(images);
      return res.status(410).json({ error: "Image expired" });
    }

    res.sendFile(image.path, { root: "." });
  } catch (error) {
    console.error("Serve error:", error);
    res.status(500).json({ error: "Server error" });
  }
});

initializeDirectories().then(() => {
  app.listen(port, () => {
    console.log(`Server running on port ${port}`);
  });
});
