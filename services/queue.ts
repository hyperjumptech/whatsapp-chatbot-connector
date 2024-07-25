import amqp from "amqplib";


const { RABBIT_MQ_URL } = process.env;

const QUEUE_NAME = "WEBHOOK_QUEUE";

export const sendToQueue = async (methodName: string, params: unknown[])=>{
   let connection;
    try {
            
      connection = await amqp.connect(RABBIT_MQ_URL || "");
      const channel = await connection.createChannel();

      await channel.assertQueue(QUEUE_NAME, { durable: false });
      const payload = {
        methodName, 
        params
      };
      channel.sendToQueue(QUEUE_NAME, Buffer.from(JSON.stringify(payload)));
      console.log(" [x] Sent '%s'", payload);
      await channel.close();
    } catch (err) {
      console.error(err);
    } finally {
      if (connection) await connection.close();
    }  
}

export const setupQueueHandlers = async (handlerMap:Record<string, unknown>): Promise<void> => {
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
            const payload = JSON.parse(message.content.toString());
            if(payload.methodName){
              const handler: (params:[])=>unknown | unknown = handlerMap[payload.methodName] as ((params:[])=>unknown);
              if(handler){
                handler.apply(this, payload.params);
              }
            }
          }
        },
        { noAck: true }
      );

      console.log(" [*] Waiting for messages. To exit press CTRL+C");
    } catch (err) {
      console.warn(err);
    }
  }