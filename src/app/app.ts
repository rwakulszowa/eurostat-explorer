import {
  DatasetViz,
  DatasetVizLegend,
  DatasetVizPlot,
} from "./components/dataset-viz";
import { DatasetView, DatasetViewSection } from "./components/dataset-view";
import { WorkerClient } from "../lib/eurostat-client";
import { WorkerSearchClient } from "../lib/search-client";
import { debounce } from "lodash";

const eurostatWorker = new Worker(`${document.baseURI}eurostat-worker.js`, {
  type: "module",
});

const searchWorker = new Worker(`${document.baseURI}search-worker.js`, {
  type: "module",
});

const eurostatClient = new WorkerClient(eurostatWorker);
const searchClient = new WorkerSearchClient(searchWorker);

DatasetViz.client = eurostatClient;

customElements.define("dataset-view", DatasetView);
customElements.define("dataset-view-section", DatasetViewSection);
customElements.define("dataset-viz", DatasetViz);
customElements.define("dataset-viz-plot", DatasetVizPlot);
customElements.define("dataset-viz-legend", DatasetVizLegend);

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

async function handleDatasetSearch(query: string, baseSelector: string) {
  // This corner case is fairly common, so let's handle it separately.
  if (!query) {
    const hiddenDatasetsSelector = `${baseSelector}[search-hidden]`;
    for (const el of document.querySelectorAll(hiddenDatasetsSelector)) {
      el.toggleAttribute("search-hidden", false);
    }
    return;
  }

  const datasets = document.querySelectorAll(baseSelector);
  const matches = new Set(await searchClient.search(query));
  // We ignore search results order for now.

  for (const el of datasets) {
    const shouldShow = matches.has(el.id);
    el.toggleAttribute("search-hidden", !shouldShow);
  }
}

(window as any).carouselNext = carouselScroll(true);
(window as any).carouselPrev = carouselScroll(false);
(window as any).handleDatasetSearch = debounce(handleDatasetSearch, 1000);

// Search handler is not attached to window - we can enable it.
document
  .getElementById("dataset-search-input")
  ?.toggleAttribute("disabled", false);
