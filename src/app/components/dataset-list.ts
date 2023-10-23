import { chunk } from "lodash";
import { SearchClient } from "../../lib/search-client";

const PAGE_SIZE = 15;

export class DatasetList extends HTMLDListElement {
  static client: SearchClient;

  static observedAttributes = ["page", "query"];

  // References to all items. The value doesn't change over time.
  private items: Map<string, Element>;

  // Items sorted and paginated. This value changes with the `query` attribute.
  private idsPerPage: Promise<Array<Array<string>>>;

  // Reference to the nav element.
  private navEl: DatasetListNav;

  async connectedCallback() {
    this.navEl = document.querySelector(
      "nav[is=dataset-list-nav]",
    ) as DatasetListNav;

    this.setupNavCallbacks();

    this.items = new Map();
    for (const child of this.children) {
      this.items.set(child.id, child);
    }

    this.paginate(this.query);
    this.render(await this.idsPerPage, this.page);
  }

  async setupNavCallbacks() {
    await new Promise((resolve) => {
      const i = setInterval(() => {
        if (this.navEl.initialized) {
          resolve(undefined);
          clearInterval(i);
        }
      }, 100);
    });
    this.navEl.handleNext = () => {
      this.setAttribute("page", (this.page + 1).toString());
    };
    this.navEl.handlePrev = () => {
      this.setAttribute("page", (this.page - 1).toString());
    };
  }

  get page(): number {
    const value = this.getAttribute("page");
    if (!value) {
      return 0;
    }
    return parseInt(value);
  }

  get query(): string {
    return this.getAttribute("query") || "";
  }

  async attributeChangedCallback(name: string, oldValue: any, newValue: any) {
    if (name === "query") {
      this.paginate(newValue);
    } else if (name === "page") {
      // Noop.
    } else {
      throw new Error(`Unknown attribute: ${name}`);
    }
    this.render(await this.idsPerPage, this.page);
  }

  private async render(idsPerPage: Array<Array<string>>, page: number) {
    const idsToShow = idsPerPage[page] || [];
    const items = idsToShow.map((id) => this.items.get(id)!);
    this.replaceChildren(...items);

    // Update nav attributes.
    const hasPrev = this.page > 0;
    const hasNext = this.page < idsPerPage.length - 1;
    this.navEl.toggleAttribute("has-previous", hasPrev);
    this.navEl.toggleAttribute("has-next", hasNext);
  }

  private paginate(query: string) {
    // Rewind to start whenever we paginate.
    this.setAttribute("page", "0");
    this.idsPerPage = DatasetList.client
      .search(query)
      .then((matches) => chunk(matches, PAGE_SIZE));
  }
}

export class DatasetListNav extends HTMLElement {
  static observedAttributes = ["has-previous", "has-next"];
  private previousButton: HTMLButtonElement;
  private nextButton: HTMLButtonElement;

  // A hacky workaround to detect when the element has finished calling its constructor.
  // Only after that we can start attaching properties.
  // Ugly.
  public initialized: boolean = false;

  handlePrev: () => void;
  handleNext: () => void;

  constructor() {
    super();
    this.initialized = true;
  }

  connectedCallback() {
    this.previousButton = this.children[0] as HTMLButtonElement;
    this.nextButton = this.children[1] as HTMLButtonElement;

    this.previousButton.onclick = () => this.handlePrev();
    this.nextButton.onclick = () => this.handleNext();

    this.render(
      this.hasAttribute("has-previous"),
      this.hasAttribute("has-next"),
    );
  }

  attributeChangedCallback() {
    this.render(
      this.hasAttribute("has-previous"),
      this.hasAttribute("has-next"),
    );
  }

  render(hasPrevious: boolean, hasNext: boolean) {
    this.previousButton.toggleAttribute("disabled", !hasPrevious);
    this.nextButton.toggleAttribute("disabled", !hasNext);
  }
}
