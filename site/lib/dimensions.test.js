import test from "ava";

import { Dimensions } from "./dimensions.js";

test("0d", (t) => {
  const d = new Dimensions([]);

  t.deepEqual(d.values(), null);
});

test("1d", (t) => {
  const d = new Dimensions([{ id: "a", size: 2 }]);

  t.deepEqual(d.values(), [
    { dim: "a", i: 0 },
    { dim: "a", i: 1 },
  ]);
});

test("2d", (t) => {
  const d = new Dimensions([
    { id: "a", size: 2 },
    { id: "b", size: 3 },
  ]);

  t.deepEqual(d.values(), [
    {
      dim: "a",
      i: 0,
      children: [
        { dim: "b", i: 0 },
        { dim: "b", i: 1 },
        { dim: "b", i: 2 },
      ],
    },
    {
      dim: "a",
      i: 1,
      children: [
        { dim: "b", i: 0 },
        { dim: "b", i: 1 },
        { dim: "b", i: 2 },
      ],
    },
  ]);
});

test("reorder", (t) => {
  const d = new Dimensions([
    { id: "a", size: 2 },
    { id: "b", size: 1 },
    { id: "c", size: 2 },
  ]);

  // Put `c` first.
  d.reorder((x, y) => {
    if (x === "c") {
      return -1;
    }
    if (y === "c") {
      return 1;
    }
    return x.localeCompare(y);
  });

  t.deepEqual(d.values(), [
    {
      dim: "c",
      i: 0,
      children: [
        { dim: "a", i: 0, children: [{ dim: "b", i: 0 }] },
        { dim: "a", i: 1, children: [{ dim: "b", i: 0 }] },
      ],
    },
    {
      dim: "c",
      i: 1,
      children: [
        { dim: "a", i: 0, children: [{ dim: "b", i: 0 }] },
        { dim: "a", i: 1, children: [{ dim: "b", i: 0 }] },
      ],
    },
  ]);
});
