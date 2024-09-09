import request from "supertest";
import appTest from "../app";

describe("Test the root path", () => {
  test("It should response the GET method", async () => {
    const response = await request(appTest).get("/");
    expect(response.statusCode).toBe(200);
  });
});
