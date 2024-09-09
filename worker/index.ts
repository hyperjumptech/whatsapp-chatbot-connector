import { Worker } from "bullmq";
import { config } from "../utils/config";
import { _markChatAsRead, _queryAndReply } from "../services/whatsapp";

const worker = new Worker(
  "messages",
  async (job) => {
    if (job.name === "markChatAsRead") {
      await _markChatAsRead(job.data);
    } else if (job.name === "queryAndReply") {
      await _queryAndReply(job.data);
    }
  },
  {
    connection: {
      host: config.REDIS_HOST,
      port: config.REDIS_PORT,
    },
    autorun: false,
  }
);

worker.on("completed", (job) => {
  console.log(`JOB ID ${job.id} has completed!`);
});

worker.on("failed", (job, err) => {
  console.log(`JOB ID ${job?.id} has failed with error: ${err.message}`);
});

export default worker;
