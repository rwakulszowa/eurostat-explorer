import {
  DatasetViz,
  DatasetVizLegend,
  DatasetVizPlot,
} from "./components/dataset-viz";
import { DatasetView, DatasetViewSection } from "./components/dataset-view";
import { DatasetSearch } from "./components/dataset-search";
import { WorkerClient } from "../lib/eurostat-client";
import { WorkerSearchClient } from "../lib/search-client";

const eurostatWorker = new Worker(`${document.baseURI}eurostat-worker.js`, {
  type: "module",
});

const searchWorker = new Worker(`${document.baseURI}search-worker.js`, {
  type: "module",
});

const eurostatClient = new WorkerClient(eurostatWorker);
const searchClient = new WorkerSearchClient(searchWorker);

DatasetViz.client = eurostatClient;
DatasetSearch.client = searchClient;

customElements.define("dataset-view", DatasetView);
customElements.define("dataset-view-section", DatasetViewSection);
customElements.define("dataset-viz", DatasetViz);
customElements.define("dataset-viz-plot", DatasetVizPlot);
customElements.define("dataset-viz-legend", DatasetVizLegend);
customElements.define("dataset-search", DatasetSearch);

function carouselScroll(next: boolean) {
  return function carouselScrollInner(el: HTMLElement) {
    const parentCarouselItem = el.closest(".carousel-item");
    if (!parentCarouselItem) {
      console.warn("Parent carousel item not found.");
      return;
    }
    const targetCarouselItem = next
      ? parentCarouselItem.nextElementSibling
      : parentCarouselItem.previousElementSibling;
    if (!targetCarouselItem) {
      console.warn("Target carousel item not found.");
      return;
    }
    targetCarouselItem.scrollIntoView({
      block: "nearest",
      inline: "nearest",
      behavior: "smooth",
    });
  };
}

(window as any).carouselNext = carouselScroll(true);
(window as any).carouselPrev = carouselScroll(false);
