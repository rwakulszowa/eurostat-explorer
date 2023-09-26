import test from "ava";

import { parseDatasetValues } from "./eurostat-api.js";

function range(x: number) {
  return Array(x)
    .fill(null)
    .map((_, i) => i);
}

test("parse", (t) => {
  const data = {
    id: ["x", "y", "z"],
    size: [1, 2, 3],
    dimension: {
      x: {
        label: "X",
        category: { index: { a: 0 }, label: { a: "xa" } },
      },
      y: {
        label: "Y",
        category: { index: { a: 0, b: 1 }, label: { a: "ya", b: "yb" } },
      },
      z: {
        label: "Z",
        category: {
          index: { a: 0, b: 1, c: 2 },
          label: { a: "za", b: "zb", c: "zc" },
        },
      },
    },
    value: range(6),
    label: "label",
    status: [],
    extension: { annotation: [], status: { label: {} } },
  };

  t.deepEqual(parseDatasetValues(data), {
    rows: [
      { x: "a", y: "a", z: "a", value: 0 },
      { x: "a", y: "a", z: "b", value: 1 },
      { x: "a", y: "a", z: "c", value: 2 },
      { x: "a", y: "b", z: "a", value: 3 },
      { x: "a", y: "b", z: "b", value: 4 },
      { x: "a", y: "b", z: "c", value: 5 },
    ],
    idToLabel: new Map([
      ["x", { label: "X", cat: new Map([["a", "xa"]]) }],
      [
        "y",
        {
          label: "Y",
          cat: new Map([
            ["a", "ya"],
            ["b", "yb"],
          ]),
        },
      ],
      [
        "z",
        {
          label: "Z",
          cat: new Map([
            ["a", "za"],
            ["b", "zb"],
            ["c", "zc"],
          ]),
        },
      ],
    ]),
  });
});
