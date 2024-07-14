import { queryToDify } from "./dify";
import { queryToRasa } from "./rasa";
import { markChatAsRead, sendChatbotReply } from "./whatsapp";
import amqp from "amqplib";

const { CONNECTION_PLATFORM, RABBIT_MQ_URL } = process.env;
const DIFY = "dify";
const RASA = "rasa";


export interface WebhookHandlerActiveObject {
  handleWebhookCall(body: unknown):Promise<void>;
  init():Promise<void>;
}

const QUEUE_NAME = "WEBHOOK_QUEUE";
export class WebhookHandlerUsingRabbitMQ implements WebhookHandlerActiveObject {


  constructor(){
    
  }
  init(): Promise<void> {
    return this.consumeQueue();
  }

  async consumeQueue(): Promise<void> {
    try {
      console.info(`Connecting to ${RABBIT_MQ_URL}...`)
      const connection = await amqp.connect(RABBIT_MQ_URL || "");
      console.info(`Queue connected to ${RABBIT_MQ_URL}`);

      const channel = await connection.createChannel();

      process.once("SIGINT", async () => {
        await channel.close();
        await connection.close();
      });

      await channel.assertQueue(QUEUE_NAME, { durable: false });
      await channel.consume(
        QUEUE_NAME,
        (message) => {
          if (message) {
            this.queryChatbot(JSON.parse(message.content.toString()));
          }
        },
        { noAck: true }
      );

      console.log(" [*] Waiting for messages. To exit press CTRL+C");
    } catch (err) {
      console.warn(err);
    }
  }
  async handleWebhookCall(req: Record<string, unknown>): Promise<void> {
    let connection;
    try {
      
      // log incoming messages
      const body = req.body;
      console.log("Incoming webhook message:", body);
      
      connection = await amqp.connect(RABBIT_MQ_URL || "");
      const channel = await connection.createChannel();

      await channel.assertQueue(QUEUE_NAME, { durable: false });
      channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(body)));
      console.log(" [x] Sent '%s'", body);
      await channel.close();
    } catch (err) {
      console.error(err);
    } finally {
      if (connection) await connection.close();
    }
  }
  async queryChatbot(body: Record<string, unknown>): Promise<void> {
    console.log('Receiving body:', body);

    // check if the webhook request contains a message
    // details on WhatsApp text message payload: https://developers.facebook.com/docs/whatsapp/cloud-api/webhooks/payload-examples#text-messages
    
    const message = (body as Record<string, Record<string, Record<string, Record<string, Record<string, Record<string, Record<string, Record<string, unknown>>>>>>>>).entry?.[0]?.changes[0]?.value?.messages?.[0];

    // check if the incoming message contains text
    if (!message?.type) {      
      return;
    }

    let chatbotReply = null;
    let queryText = "";

    switch ((message.type as string)) {
      case "interactive":
        if (((message.interactive as Record<string, unknown>).type as string) === "button_reply") {
          queryText = ((message.interactive as Record<string, unknown>).button_reply as Record<string, unknown>).id as string;
        } else if ((message.interactive as Record<string, unknown>).type === "list_reply") {
          queryText = ((message.interactive as Record<string, unknown>).list_reply as Record<string, unknown>).id as string;
        }
        break;
      default:
        queryText = (message.text as Record<string, unknown>).body as string;
        break;
    }

    if (CONNECTION_PLATFORM === DIFY) {
      chatbotReply = await queryToDify({ body, query: queryText });
    } else if (CONNECTION_PLATFORM === RASA) {
      chatbotReply = await queryToRasa({ body, query: queryText });
    }
    console.log("Chatbot Reply:\n", chatbotReply);

    if (!chatbotReply) {      
      return;
    }

    await sendChatbotReply({ to: (message as Record<string, unknown>).from as string, chatbotReply });
    await markChatAsRead( (message as Record<string, unknown>).id as string);
  }

}

const webHookHandler: WebhookHandlerActiveObject = new WebhookHandlerUsingRabbitMQ();

export const getWebhookHandler = ()=>{
  return webHookHandler;
}