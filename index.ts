// APP
import app from "./app";
import { config } from "./utils/config";
const port = 5007;
app.listen(port, () => console.log(`Server ready on port ${port}.`));

// WORKER
if (config.SESSION_DATABASE === "redis") {
  (async () => {
    const worker = await import("./worker");
    worker.default.run();
  })();
}
