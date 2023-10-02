import { FakeEurostatClient, HttpEurostatClient } from "../lib/eurostat-client";
import type { Categories, DatasetId } from "../lib/eurostat-api";

const client = new HttpEurostatClient();

type Message = {
  // Unique id identifying a message.
  // Used for multiplexing (de)multiplexing client <-> worker messages.
  id: number;
  payload: { categories: Categories; datasetId: DatasetId };
};

onmessage = async (e: MessageEvent<Message>) => {
  const {
    data: { id, payload },
  } = e;
  const data = await client.fetch(payload.datasetId, payload.categories);
  postMessage({ id, data });
};
