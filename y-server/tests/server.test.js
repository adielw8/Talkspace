import request from "supertest";
import fs from "fs/promises";
import { app } from "../index.js";

describe("Image Upload API", () => {
  let imageId;

  beforeAll(async () => {
    try {
      await fs.mkdir("uploads/db", { recursive: true });
      await fs.writeFile("uploads/db/images.json", JSON.stringify({}));
    } catch (error) {
      console.error("Setup error:", error);
    }
  });

  afterAll(async () => {
    try {
      const files = await fs.readdir("uploads");
      for (const file of files) {
        const filePath = `uploads/${file}`;
        if ((await fs.stat(filePath)).isFile()) {
          await fs.unlink(filePath);
        }
      }
      await fs.rm("uploads", { recursive: true, force: true });
    } catch (error) {
      console.error("Cleanup error:", error);
    }
  });

  describe("POST /v1/images", () => {
    test("should return 400 when no image is provided", async () => {
      const res = await request(app)
        .post("/v1/images")
        .field("expirationTime", "60");

      expect(res.status).toBe(400);
      expect(res.body.error).toBe("No image provided");
    });

    test("should successfully upload an image", async () => {
      const imageBuffer = Buffer.alloc(1024); // 1KB test image
      await fs.writeFile("./tests/test.jpg", imageBuffer);

      const res = await request(app)
        .post("/v1/images")
        .attach("image", "tests/test.jpg")
        .field("expirationTime", "60");

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty("url");
      expect(res.body.url).toMatch(/\/v1\/images\/[\w-]+$/);

      imageId = res.body.url.split("/").pop();

      await fs.unlink("tests/test.jpg");
    });

    test("should reject files larger than 5MB", async () => {
      const largeBuffer = Buffer.alloc(6 * 1024 * 1024); // 6MB
      await fs.writeFile("tests/large.jpg", largeBuffer);

      const res = await request(app)
        .post("/v1/images")
        .attach("image", "tests/large.jpg")
        .field("expirationTime", "60");

      expect(res.status).toBe(413); // Payload Too Large

      await fs.unlink("tests/large.jpg");
    });
  });

  describe("GET /v1/images/:imageID", () => {
    test("should retrieve an uploaded image", async () => {
      const res = await request(app).get(`/v1/images/${imageId}`);

      expect(res.status).toBe(200);
      expect(res.headers["content-type"]).toMatch(/^image/);
    });

    test("should return 404 for non-existent image", async () => {
      const res = await request(app).get("/v1/images/nonexistent-id");

      expect(res.status).toBe(404);
      expect(res.body.error).toBe("Image not found");
    });

    test("should handle expired images", async () => {
      const images = JSON.parse(
        await fs.readFile("uploads/db/images.json", "utf8")
      );
      const expiredId = "expired-test";

      await fs.writeFile("uploads/expired-test.jpg", "test");

      images[expiredId] = {
        path: "uploads/expired-test.jpg",
        expiry: Date.now() - 1000, // Expired 1 second ago
      };

      await fs.writeFile("uploads/db/images.json", JSON.stringify(images));

      const res = await request(app).get(`/v1/images/${expiredId}`);

      expect(res.status).toBe(410);
      expect(res.body.error).toBe("Image expired");
    });
  });
});
