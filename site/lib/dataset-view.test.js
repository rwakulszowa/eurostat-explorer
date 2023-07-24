import test from "ava";

import { DatasetView } from "./dataset-view.js";

// Subset of an original dataset.
const datasetDescription = {
  code: "aact_uv03",
  title: "Unit values: quantities (1 000 t)",
  dimensions: [
    {
      code: "GEO",
      description: "Geopolitical entity (reporting)",
      positions: [
        { code: "BE", description: "Belgium" },
        { code: "BG", description: "Bulgaria" },
        { code: "CZ", description: "Czechia" },
        { code: "DK", description: "Denmark" },
      ],
    },
    {
      code: "FREQ",
      description: "Time frequency",
      positions: [{ code: "A", description: "Annual" }],
    },
    {
      code: "ITM_NEWA",
      description: "List of products - EAA",
      positions: [
        { code: "01000", description: "Cereals (including seeds)" },
        { code: "01100", description: "Wheat and spelt" },
        { code: "01110", description: "Soft wheat and spelt" },
      ],
    },
    {
      code: "TIME",
      description: "Period of time",
      positions: [
        { code: "2006", description: "2006" },
        { code: "2007", description: "2007" },
        { code: "2008", description: "2008" },
        { code: "2009", description: "2009" },
        { code: "2010", description: "2010" },
      ],
    },
  ],
};

test("2+2d", (t) => {
  const view = DatasetView.build(datasetDescription, 2);
  const items = view.items();

  t.deepEqual(items.length, 4 * 1);

  const item = items[0];
  t.deepEqual(
    item.key.map((x) => x.cat.description),
    ["Annual", "Belgium"],
  );

  const datum = item.items[0];
  t.deepEqual(datum.valueKey, [0, 0, 0, 0]);
  t.deepEqual(
    datum.key.map((x) => x.cat.description),
    ["Cereals (including seeds)", "2006"],
  );
});
