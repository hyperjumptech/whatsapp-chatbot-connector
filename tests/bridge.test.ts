import axios from "axios";

// Create mock axios instance before any imports
const mockAxiosInstance = jest.fn();
const mockCreate = jest.fn(() => mockAxiosInstance);

jest.mock("axios", () => {
  return {
    __esModule: true,
    default: Object.assign(jest.fn(), {
      create: mockCreate,
    }),
  };
});

// Mock config
jest.mock("../utils/config", () => ({
  config: {
    BRIDGE_ENABLED: true,
    BRIDGE_URL: "https://example.com/webhook",
    BRIDGE_TIMEOUT: 10000,
    BRIDGE_HEADERS: { "X-Custom-Header": "test-value" },
  },
}));

// Import after mocks are set up
import { forwardWebhook } from "../services/bridge";

describe("Bridge Service", () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe("forwardWebhook", () => {
    it("should forward webhook body to bridge URL", async () => {
      const mockBody = {
        entry: [
          {
            changes: [
              {
                value: {
                  messages: [
                    {
                      from: "1234567890",
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

      mockAxiosInstance.mockResolvedValueOnce({ status: 200, data: {} });

      const result = await forwardWebhook(mockBody);

      expect(result).toBe(true);
      expect(mockAxiosInstance).toHaveBeenCalledWith({
        method: "POST",
        url: "https://example.com/webhook",
        headers: {
          "Content-Type": "application/json",
          "X-Custom-Header": "test-value",
        },
        data: mockBody,
      });
    });

    it("should return false when bridge is disabled", async () => {
      // Reset modules and re-mock with bridge disabled
      jest.resetModules();

      // Re-setup axios mock for fresh import
      const freshMockInstance = jest.fn();
      jest.mock("axios", () => ({
        __esModule: true,
        default: Object.assign(jest.fn(), {
          create: jest.fn(() => freshMockInstance),
        }),
      }));

      jest.mock("../utils/config", () => ({
        config: {
          BRIDGE_ENABLED: false,
          BRIDGE_URL: "https://example.com/webhook",
          BRIDGE_TIMEOUT: 10000,
          BRIDGE_HEADERS: {},
        },
      }));

      const { forwardWebhook: disabledForwardWebhook } = await import(
        "../services/bridge"
      );

      const result = await disabledForwardWebhook({ test: "data" });

      expect(result).toBe(false);
      expect(freshMockInstance).not.toHaveBeenCalled();
    });

    it("should return false when bridge URL is empty", async () => {
      // Reset modules and re-mock with empty URL
      jest.resetModules();

      // Re-setup axios mock for fresh import
      const freshMockInstance = jest.fn();
      jest.mock("axios", () => ({
        __esModule: true,
        default: Object.assign(jest.fn(), {
          create: jest.fn(() => freshMockInstance),
        }),
      }));

      jest.mock("../utils/config", () => ({
        config: {
          BRIDGE_ENABLED: true,
          BRIDGE_URL: "",
          BRIDGE_TIMEOUT: 10000,
          BRIDGE_HEADERS: {},
        },
      }));

      const { forwardWebhook: emptyUrlForwardWebhook } = await import(
        "../services/bridge"
      );

      const result = await emptyUrlForwardWebhook({ test: "data" });

      expect(result).toBe(false);
      expect(freshMockInstance).not.toHaveBeenCalled();
    });

    it("should return false and log error when request fails", async () => {
      const mockError = {
        response: {
          data: { message: "Internal Server Error" },
        },
      };

      mockAxiosInstance.mockRejectedValueOnce(mockError);

      const consoleSpy = jest.spyOn(console, "error").mockImplementation();

      const result = await forwardWebhook({ test: "data" });

      expect(result).toBe(false);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[Bridge] Forward error:")
      );

      consoleSpy.mockRestore();
    });

    it("should include custom headers in the request", async () => {
      const mockBody = { test: "data" };

      mockAxiosInstance.mockResolvedValueOnce({ status: 200, data: {} });

      await forwardWebhook(mockBody);

      expect(mockAxiosInstance).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: expect.objectContaining({
            "X-Custom-Header": "test-value",
          }),
        })
      );
    });
  });
});
