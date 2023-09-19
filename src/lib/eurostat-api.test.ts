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

  t.deepEqual(parseDatasetValues(data), [
    { X: "xa", Y: "ya", Z: "za", value: 0 },
    { X: "xa", Y: "ya", Z: "zb", value: 1 },
    { X: "xa", Y: "ya", Z: "zc", value: 2 },
    { X: "xa", Y: "yb", Z: "za", value: 3 },
    { X: "xa", Y: "yb", Z: "zb", value: 4 },
    { X: "xa", Y: "yb", Z: "zc", value: 5 },
  ]);
});
