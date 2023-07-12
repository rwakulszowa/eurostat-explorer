import test from "ava";

import { Dimensions } from "./dimensions.js";

test("4d slice", (t) => {
  const a = { id: "a", size: 1 };
  const b = { id: "b", size: 2 };
  const c = { id: "c", size: 3 };
  const d = { id: "d", size: 1 };

  const dims = new Dimensions([a, b, c, d]);
  const [left, right] = dims.slice(2);

  t.deepEqual(left, [
    [
      { dim: a, i: 0 },
      { dim: b, i: 0 },
    ],
    [
      { dim: a, i: 0 },
      { dim: b, i: 1 },
    ],
  ]);

  t.deepEqual(right, [
    [
      { dim: c, i: 0 },
      { dim: d, i: 0 },
    ],
    [
      { dim: c, i: 1 },
      { dim: d, i: 0 },
    ],
    [
      { dim: c, i: 2 },
      { dim: d, i: 0 },
    ],
  ]);
});

test("reorder", (t) => {
  const a = { id: "a", size: 1 };
  const b = { id: "b", size: 2 };
  const c = { id: "c", size: 2 };

  const dims = new Dimensions([a, b, c]);

  // Put `c` first.
  dims.reorder((x, y) => {
    if (x === "c") {
      return -1;
    }
    if (y === "c") {
      return 1;
    }
    return x.localeCompare(y);
  });

  const [left, right] = dims.slice(2);

  t.deepEqual(left, [
    [
      { dim: c, i: 0 },
      { dim: a, i: 0 },
    ],
    [
      { dim: c, i: 1 },
      { dim: a, i: 0 },
    ],
  ]);
  t.deepEqual(right, [[{ dim: b, i: 0 }], [{ dim: b, i: 1 }]]);
});
