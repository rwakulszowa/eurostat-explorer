import test from "ava";

import {
  parseValues,
  reordering,
  dimensionsReordering,
} from "./eurostat-client.js";

function range(x) {
  return Array(x)
    .fill()
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
  };

  t.deepEqual(parseValues(data), [
    { categories: Array.from("aaa"), value: 0 },
    { categories: Array.from("aab"), value: 1 },
    { categories: Array.from("aac"), value: 2 },
    { categories: Array.from("aba"), value: 3 },
    { categories: Array.from("abb"), value: 4 },
    { categories: Array.from("abc"), value: 5 },
  ]);
});

test("reordering", (t) => {
  const src = Array.from("ABCD");
  const dst = Array.from("CADB");

  const reorder = reordering(src, dst);
  t.deepEqual(reorder(src), dst);
  t.deepEqual(reorder([1, 2, 3, 4]), [3, 1, 4, 2]);
});

test("dimensionsReordering", (t) => {
  const description = {
    code: "code",
    dimensions: [
      { code: "A", positions: [] },
      { code: "B", positions: [] },
    ],
  };
  const values = { id: ["B", "A"], value: [] };

  const reorder = dimensionsReordering(description, values);
  t.deepEqual(reorder([0, 1]), [1, 0]);
});
