import request from "supertest";
import crypto from "crypto";
import appTest from "../app";

describe("Webhook header validation", () => {
  const validPayload = {
    entry: [
      {
        changes: [
          {
            value: {
              messages: [
                {
                  from: "1234567890",
                  id: "wamid.test123",
                  timestamp: "1234567890",
                  text: { body: "Hello" },
                  type: "text",
                },
              ],
            },
          },
        ],
      },
    ],
  };

  const createSignature = (payload: string, secret: string): string => {
    return (
      "sha256=" +
      crypto.createHmac("sha256", secret).update(payload, "utf8").digest("hex")
    );
  };

  test("should reject request without proper Content-Type", async () => {
    const response = await request(appTest)
      .post("/webhook")
      .set("Content-Type", "text/plain") // Set wrong content type
      .send(JSON.stringify(validPayload));

    expect(response.statusCode).toBe(403);
    expect(response.body.message).toContain("Content-Type");
  });

  test("should reject request with invalid signature when app secret is set", async () => {
    // Set app secret in config for this test
    process.env.WEBHOOK_APP_SECRET = "test-secret";

    const response = await request(appTest)
      .post("/webhook")
      .set("Content-Type", "application/json")
      .set("X-Hub-Signature-256", "sha256=invalid-signature")
      .send(validPayload);

    expect(response.statusCode).toBe(403);
    expect(response.body.message).toContain("signature");
  });

  test("should accept request with valid signature", async () => {
    process.env.WEBHOOK_APP_SECRET = "test-secret";
    const payload = JSON.stringify(validPayload);
    const signature = createSignature(payload, "test-secret");

    const response = await request(appTest)
      .post("/webhook")
      .set("Content-Type", "application/json")
      .set("X-Hub-Signature-256", signature)
      .send(validPayload);

    expect(response.statusCode).toBe(200);
  });

  test("should reject request without signature when app secret is not configured", async () => {
    delete process.env.WEBHOOK_APP_SECRET;

    const response = await request(appTest)
      .post("/webhook")
      .set("Content-Type", "application/json")
      .send(validPayload);

    expect(response.statusCode).toBe(403);
  });

  afterEach(() => {
    // Clean up environment
    delete process.env.WEBHOOK_APP_SECRET;
  });
});
