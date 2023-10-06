import {
  DatasetDescriptionView,
  fetchDatasetDescription,
} from "../../lib/eurostat-dataset-description";

export class DatasetView extends HTMLElement {
  get datasetId(): string {
    const maybeValue = this.getAttribute("dataset-id");
    if (!maybeValue) {
      throw new Error("'dataset-id' not set");
    }
    return maybeValue;
  }

  async connectedCallback() {
    const description = await fetchDatasetDescription(
      new URL("data.json", window.location.href),
    );

    const datasetId = this.datasetId;
    const baseCategories = this.baseCategories(description);

    const children = description.spread(["time", "geo"]).map((s) => {
      const section = document.createElement(
        "dataset-view-section",
      ) as DatasetViewSection;
      section.datasetId = datasetId;
      section.baseCategories = baseCategories;
      section.labels = s.map(({ dim, cat }) => ({
        dim: dim.code,
        dimDescription: dim.description,
        cat: cat.code,
        catDescription: cat.description,
      }));
      return section;
    });

    this.replaceChildren(...children);
  }

  private baseCategories(ds: DatasetDescriptionView): URLSearchParams {
    const { dimensions } = ds.datasetDescription;

    function getDim(code: string) {
      const dim = dimensions.find((x) => x.code === code);
      if (!dim) {
        throw new Error(`"${code}" dimension not found`);
      }
      return dim;
    }

    /**
     * Geo dimenion often contains aggregates (such as EU as of year 1234).
     * They make the charts look unreadable, so we filter them out.
     */
    function filterGeo(geoDim) {
      return {
        ...geoDim,
        positions: geoDim.positions.filter(
          (d) => !d.code.startsWith("EU") && !d.code.startsWith("EA"),
        ),
      };
    }

    const time = getDim("time");
    const geo = filterGeo(getDim("geo"));

    const categories = new URLSearchParams();
    for (const { code } of geo.positions) {
      categories.append("geo", code);
    }
    for (const { code } of time.positions) {
      categories.append("time", code);
    }
    return categories;
  }
}

/**
 * Single chart with metadata - title, categories, etc.
 */
export class DatasetViewSection extends HTMLElement {
  datasetId: string;
  labels: Array<{
    dim: string;
    dimDescription: string;
    cat: string;
    catDescription: string;
  }>;
  baseCategories: URLSearchParams;

  connectedCallback() {
    const container = document.createElement("div");
    container.classList.add("w-full", "p-2", "border-2", "shadow-xl");

    const header = this.header(this.labels);

    const separator = document.createElement("div");
    separator.classList.add("divider", "m-0");

    const viz = document.createElement("dataset-viz");
    viz.classList.add(
      "w-full",
      "aspect-video",
      "flex",
      "justify-center",
      "items-center",
    );
    viz.toggleAttribute("pending", true);
    viz.setAttribute("dataset-id", this.datasetId);
    viz.setAttribute("categories", this.categories().toString());

    const vizLoader = document.createElement("span");
    vizLoader.classList.add("loading", "loading-bars", "text-primary", "w-1/4");

    viz.replaceChildren(vizLoader);

    container.replaceChildren(header, separator, viz);

    this.replaceChildren(container);
  }

  private categories(): URLSearchParams {
    const categories = new URLSearchParams(this.baseCategories);
    for (const { dim, cat } of this.labels) {
      categories.append(dim, cat);
    }
    return categories;
  }

  private header(
    labels: Array<{ dimDescription: string; catDescription: string }>,
  ): HTMLElement {
    function label(dim: string, cat: string): HTMLElement {
      const li = document.createElement("li");
      li.classList.add("stat", "p-3");

      const title = document.createElement("div");
      title.classList.add("stat-title", "text-sm");
      title.innerText = dim;

      const description = document.createElement("div");
      description.classList.add("stat-value", "text-base");
      description.innerText = cat;

      li.replaceChildren(title, description);

      return li;
    }

    const ul = document.createElement("ul");
    ul.classList.add(
      "stats",
      "text-sm",
      "lowercase",
      "w-full",
      "overflow-x-auto",
    );

    for (const { dimDescription, catDescription } of labels) {
      ul.appendChild(label(dimDescription, catDescription));
    }

    return ul;
  }
}
