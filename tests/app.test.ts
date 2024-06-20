const request = require("supertest");
const appTest = require("../app");

describe("Test the root path", () => {
  test("It should response the GET method", async () => {
    const response = await request(appTest).get("/");
    expect(response.statusCode).toBe(200);
  });
});