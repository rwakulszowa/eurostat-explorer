import { DatasetViz } from "./components/dataset-viz";
import { WorkerClient } from "./lib/eurostat-client";

const worker = new Worker(new URL("worker.ts", import.meta.url), {
  type: "module",
});

const client = new WorkerClient(worker);

DatasetViz.client = client;
customElements.define("dataset-viz", DatasetViz);
