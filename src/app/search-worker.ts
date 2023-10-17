import { BasicSearchClient } from "../lib/search-client";

const client = new BasicSearchClient(`./search-index.json`);

type Message = {
  // Unique id identifying a message.
  // Used for multiplexing (de)multiplexing client <-> worker messages.
  id: number;
  payload: { query: string };
};

onmessage = async (e: MessageEvent<Message>) => {
  const {
    data: { id, payload },
  } = e;
  const data = await client.search(payload.query);
  postMessage({ id, data });
};
