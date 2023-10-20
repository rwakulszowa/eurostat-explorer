import {
  DatasetViz,
  DatasetVizLegend,
  DatasetVizPlot,
} from "./components/dataset-viz";
import { DatasetView, DatasetViewSection } from "./components/dataset-view";
import { WorkerClient } from "../lib/eurostat-client";

const eurostatWorker = new Worker(`${document.baseURI}eurostat-worker.js`, {
  type: "module",
});

const searchWorker = new Worker(`${document.baseURI}search-worker.js`, {
  type: "module",
});

const eurostatClient = new WorkerClient(eurostatWorker);

DatasetViz.client = eurostatClient;

customElements.define("dataset-view", DatasetView);
customElements.define("dataset-view-section", DatasetViewSection);
customElements.define("dataset-viz", DatasetViz);
customElements.define("dataset-viz-plot", DatasetVizPlot);
customElements.define("dataset-viz-legend", DatasetVizLegend);
