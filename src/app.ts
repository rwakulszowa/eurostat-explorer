import { DatasetViz } from "./components/dataset-viz";
import { FakeEurostatClient, type EurostatClient } from "./lib/eurostat-client";

const client = new FakeEurostatClient();

DatasetViz.client = client;
customElements.define("dataset-viz", DatasetViz);
