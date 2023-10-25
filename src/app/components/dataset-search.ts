import { debounce } from "lodash";
import { DatasetList } from "./dataset-list";
import { normalizeQuery } from "../../lib/search";

export class DatasetSearch extends HTMLElement {
  connectedCallback() {
    const oninput = () => {
      this.handleDatasetSearch(this.inputEl.value);
    };
    this.inputEl.oninput = debounce(oninput, 1000);
    // Initial call in case the field is not empty on load.
    oninput();

    this.markActive();
  }

  private handleDatasetSearch(query: string) {
    this.datasetListEl.setAttribute("query", normalizeQuery(query));
  }

  get inputEl(): HTMLInputElement {
    const el = this.querySelector("#dataset-search-input") as HTMLInputElement;
    if (!el) {
      throw new Error("#dataset-search-input not found");
    }
    return el;
  }

  get datasetListEl(): DatasetList {
    const el = document.querySelector(".dataset-list") as DatasetList;
    if (!el) {
      throw new Error(".dataset-list not found");
    }
    return el;
  }

  private markActive() {
    this.inputEl.toggleAttribute("disabled", false);
  }
}
