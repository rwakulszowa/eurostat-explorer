import { debounce } from "lodash";
import { SearchClient } from "../../lib/search-client";

const BASE_SELECTOR = ".dataset-list > .dataset-item";

export class DatasetSearch extends HTMLElement {
  static client: SearchClient;

  connectedCallback() {
    const oninput = () => {
      this.handleDatasetSearch(this.inputEl.value);
    };
    this.inputEl.oninput = debounce(oninput, 1000);
    // Initial call in case the field is not empty on load.
    oninput();

    this.markActive();
  }

  private async handleDatasetSearch(query: string) {
    // This corner case is fairly common, so let's handle it separately.
    if (!query) {
      const hiddenDatasetsSelector = `${BASE_SELECTOR}[search-hidden]`;
      for (const el of document.querySelectorAll(hiddenDatasetsSelector)) {
        el.toggleAttribute("search-hidden", false);
      }
      return;
    }

    const datasets = document.querySelectorAll(BASE_SELECTOR);
    const matches = new Set(await DatasetSearch.client.search(query));
    // We ignore search results order for now.

    for (const el of datasets) {
      const shouldShow = matches.has(el.id);
      el.toggleAttribute("search-hidden", !shouldShow);
    }
  }

  get inputEl(): HTMLInputElement {
    const el = this.querySelector("#dataset-search-input") as HTMLInputElement;
    if (!el) {
      throw new Error("#dataset-search-input not found");
    }
    return el;
  }

  private markActive() {
    this.inputEl.toggleAttribute("disabled", false);
  }
}
