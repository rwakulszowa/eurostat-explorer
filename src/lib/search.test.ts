import test from "ava";

import { search, type Index } from "./search.js";

test("emptyIndex", (t) => {
  const index = [];
  t.deepEqual(search(index, "bar"), []);
});

const index: Index = [
  ["bar", ["A", "B"]],
  ["baz", ["A", "C"]],
  ["foo", ["C"]],
];

test("empty query", (t) => {
  t.deepEqual(search(index, ""), ["A", "C", "B"]);
});

test("single word", (t) => {
  t.deepEqual(search(index, "ba"), ["A", "B", "C"]);
  t.deepEqual(search(index, "bar"), ["A", "B"]);
  t.deepEqual(search(index, "foo"), ["C"]);
  t.deepEqual(search(index, "xyz"), []);
});

test("multiple words", (t) => {
  t.deepEqual(search(index, "bar baz"), ["A"]);
  t.deepEqual(search(index, "baz foo"), ["C"]);
  t.deepEqual(search(index, "bar baz foo"), []);
});
