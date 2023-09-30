import {
  DatasetViz,
  DatasetVizLegend,
  DatasetVizPlot,
} from "../components/dataset-viz";
import { WorkerClient } from "../lib/eurostat-client";

const worker = new Worker("/worker.js", {
  type: "module",
});

const client = new WorkerClient(worker);

DatasetViz.client = client;
customElements.define("dataset-viz", DatasetViz);
customElements.define("dataset-viz-plot", DatasetVizPlot);
customElements.define("dataset-viz-legend", DatasetVizLegend);
