import axios from "axios";
import dotenv from "dotenv";

dotenv.config();

const { RASA_BASE_URL } = process.env;

const AxiosInstanceDify = axios.create({
  baseURL: RASA_BASE_URL,
  timeout: 20_000, // 20 seconds,
  timeoutErrorMessage: "Connection timed out",
});

export const sendQuery = async ({
  userId,
  query,
}: {
  userId: string;
  query: string;
}) => {
  return await AxiosInstanceDify({
    method: "POST",
    url: RASA_BASE_URL,
    // TODO: handle authorization
    // headers: {
    //   Authorization: `Bearer ${RASA_TOKEN}`,
    // },
    data: {
      message: query,
      sender: userId,
    },
  });
};

export const queryToRasa = async ({
  waId,
  query,
}: {
  waId: string;
  query: string;
}) => {
  const res = await sendQuery({
    userId: waId,
    query,
  });

  const resData = res.data[0];
  const buttonLength = resData?.buttons?.length;

  if (buttonLength > 0) {
    if (buttonLength > 3) {
      return {
        type: "interactive-list",
        text: resData.text,
        rows: resData.buttons.map(
          (rasaBtn: { title: string; payload: string }) => ({
            id: rasaBtn.payload,
            title: rasaBtn.title,
            description: "",
          })
        ),
      };
    }

    return {
      type: "interactive-button",
      text: resData.text,
      buttons: resData.buttons.map(
        (rasaBtn: { title: string; payload: string }) => ({
          type: "reply",
          reply: {
            id: rasaBtn.payload,
            title: rasaBtn.title,
          },
        })
      ),
    };
  }

  return { text: resData.text };
};
