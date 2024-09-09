import { Worker } from "bullmq";
import { config } from "../utils/config";
import { markChatAsRead, sendChatbotReply } from "../services/whatsapp";
import { queryToDify } from "../services/dify";
import { queryToRasa } from "../services/rasa";
import dotenv from "dotenv";

const DIFY = "dify";
const RASA = "rasa";

dotenv.config();

const { CONNECTION_PLATFORM } = process.env;

const worker = new Worker(
  "messages",
  async (job) => {
    if (job.name === "markChatAsRead") {
      try {
        await markChatAsRead(job.data);
      } catch (error) {
        console.error("Error markChatAsRead: " + error);
      }
    } else if (job.name === "queryAndReply") {
      const payload = JSON.parse(job.data.payload);
      const { waId, query, messageFrom } = payload;
      let chatbotReply = null;

      if (CONNECTION_PLATFORM === DIFY) {
        chatbotReply = await queryToDify({ waId, query });
      } else if (CONNECTION_PLATFORM === RASA) {
        chatbotReply = await queryToRasa({ waId, query });
      }
      console.log(
        `[Chatbot reply] from: ${messageFrom} - query: ${query} - reply:`,
        chatbotReply
      );

      if (!chatbotReply || !chatbotReply.text) {
        // do nothing
        return;
      }

      try {
        await sendChatbotReply({ to: messageFrom, chatbotReply });
      } catch (error) {
        console.error("Error sendChatbotReply: " + error);
      }
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
