// APP
import app from "./app";
const port = 5007;
app.listen(port, () => console.log(`Server ready on port ${port}.`));

// WORKER
import worker from "./worker";
worker.run();
