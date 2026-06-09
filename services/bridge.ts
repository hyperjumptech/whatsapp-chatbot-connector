import axios, { AxiosError } from "axios";
import { config } from "../utils/config";

const { BRIDGE_ENABLED, BRIDGE_URL, BRIDGE_TIMEOUT, BRIDGE_HEADERS } = config;

const AxiosInstanceBridge = axios.create({
  timeout: BRIDGE_TIMEOUT,
  timeoutErrorMessage: "Bridge connection timed out",
});

/**
 * Forward webhook body to external URL
 * Useful for logging, analytics, or custom processing
 */
export const forwardWebhook = async (body: any): Promise<boolean> => {
  if (!BRIDGE_ENABLED || !BRIDGE_URL) {
    return false;
  }

  try {
    await AxiosInstanceBridge({
      method: "POST",
      url: BRIDGE_URL,
      headers: {
        "Content-Type": "application/json",
        ...BRIDGE_HEADERS,
      },
      data: body,
    });
    return true;
  } catch (error) {
    console.error(
      `[Bridge] Forward error: ${JSON.stringify(
        (error as AxiosError)?.response?.data || error
      )}`
    );
    return false;
  }
};
