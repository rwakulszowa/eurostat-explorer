import test from "ava";

import { parseDate } from "./parseUtils";

test("parseDate", (t) => {
  t.deepEqual(parseDate("2020").toDateString(), "Wed Jan 01 2020");
  t.deepEqual(parseDate("2020-Q2").toDateString(), "Wed Apr 01 2020");
  t.deepEqual(parseDate("2020-05").toDateString(), "Fri May 01 2020");
});
