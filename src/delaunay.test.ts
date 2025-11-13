import { Delaunay } from "d3-delaunay";
import { describe, expect, it } from "vitest";
import { findTriangle } from "./delaunay";
import { Vec2 } from "./vec2";

describe("findTriangle", () => {
  it("works in weird collinear case #1", () => {
    const delaunay = Delaunay.from([
      [250, 0],
      [250, 50],
    ]);
    const pt = Vec2(250, 55);
    expect(findTriangle(delaunay, pt)).toEqual(-1);
  });

  it("works in weird collinear case #2", () => {
    const delaunay = Delaunay.from([
      [250, 0],
      [250, 50],
    ]);
    const pt = Vec2(300, 55);
    expect(findTriangle(delaunay, pt)).toEqual(-1);
  });

  it("works in weird collinear case #3", () => {
    const delaunay = Delaunay.from([
      [250, 0],
      [250, 50],
      [250, 100],
    ]);
    const pt = Vec2(250, 55);
    expect(findTriangle(delaunay, pt)).toEqual(-1);
  });
});
