import assert from "node:assert/strict";
import test from "node:test";
import { selectBrandTitleFit } from "./mobile-brand-title-fit";

for (const [device, minimum, singleCap, multiCap] of [["tablet", 40, 80, 60], ["pc", 44, 88, 64]] as const) {
  const limits = { minimum, singleCap, multiCap, singleTarget: 0.8, multiTarget: 0.75 };
  test(`${device} brand fits independently with bounded short and whole-word long titles`, () => {
    const short = selectBrandTitleFit("KOHI", new Map([["KOHI", 235]]), 300, limits);
    assert.equal(short.fontSize, singleCap);
    assert.deepEqual(short.lines, ["KOHI"]);
    const long = selectBrandTitleFit("SUNDAY ROASTERS", new Map([["SUNDAY ROASTERS", 1000], ["SUNDAY", 400], ["ROASTERS", 500]]), 300, limits);
    assert.deepEqual(long.lines, ["SUNDAY", "ROASTERS"]);
    assert.ok(long.fontSize >= minimum && long.fontSize <= multiCap);
    assert.equal(long.lines.join(" "), "SUNDAY ROASTERS");
    assert.equal(selectBrandTitleFit("UNMEASURED", new Map(), 300, limits).fontSize, minimum);
  });
}
