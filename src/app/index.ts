import { DatasetSearch } from "./components/dataset-search";
import { WorkerSearchClient } from "../lib/search-client";

const searchWorker = new Worker(`${document.baseURI}search-worker.js`, {
  type: "module",
});

const searchClient = new WorkerSearchClient(searchWorker);

DatasetSearch.client = searchClient;

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
