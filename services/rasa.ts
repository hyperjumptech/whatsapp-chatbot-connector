import dotenv from "dotenv";
import { Request } from "express";
import { httpClient } from "./http-client";

dotenv.config();

const { RASA_BASE_URL } = process.env;

export const sendQuery = async ({
  userId,
  query,
}: {
  userId: string;
  query: string;
}) => {
  return httpClient(RASA_BASE_URL || "", {
    signal: AbortSignal.timeout(20_000),
    method: "POST",
    // TODO: handle authorization
    // headers: {
    //   Authorization: `Bearer ${RASA_TOKEN}`,
    // },
    body: JSON.stringify({
      message: query,
      sender: userId,
    }),
  });
};

export const queryToRasa = async ({
  req,
  query,
}: {
  req: Request;
  query: string;
}) => {
  const waId = req.body.entry?.[0]?.changes[0]?.value?.contacts?.[0]?.wa_id;
  const res = await sendQuery({
    userId: waId,
    query,
  });

  const resData = ((res.data as Array<unknown>)[0]  as Record<string, unknown>);
  const buttonLength = ((resData?.buttons) as Array<{ title: string; payload: string }>)?.length;

  if (buttonLength > 0) {
    if (buttonLength > 3) {
      return {
        type: "interactive-list",
        text: resData.text,
        rows: (resData.buttons as Array<{ title: string; payload: string }>).map(
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
      buttons: (resData.buttons as Array<{ title: string; payload: string }>).map(
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

  return {text: resData.text};
};
