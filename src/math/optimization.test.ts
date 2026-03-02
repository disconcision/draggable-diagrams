import { describe, expect, it } from "vitest";
import { DistanceMinimizer, equal, lessThan } from "./optimization";
import { Vec2 } from "./vec2";

/**
 * Call minimize, then call it again with the same arguments and assert
 * the result is stable (within rhoend tolerance). Returns the first result.
 */
function minimizeAndCheckStable(
  m: DistanceMinimizer,
  target: Vec2,
  paramsToPoint: (params: number[]) => Vec2,
  options?: Parameters<DistanceMinimizer["minimize"]>[2],
): number[] {
  const result = m.minimize(target, paramsToPoint, options);
  const result2 = m.minimize(target, paramsToPoint, options);
  for (let i = 0; i < result.length; i++) {
    expect(result2[i]).toBeCloseTo(result[i]);
  }
  return result;
}

describe("DistanceMinimizer", () => {
  describe("1D slider (like study-slider)", () => {
    // A single param `value` controls x-position on a horizontal track.
    const paramsToPoint = ([value]: number[]) => Vec2(value, 0);

    it("moves param toward target", () => {
      const m = new DistanceMinimizer([100], 0);
      const result = minimizeAndCheckStable(m, Vec2(150, 0), paramsToPoint);
      expect(result[0]).toBeCloseTo(150);
    });

    it("warm-starts from previous solution", () => {
      const m = new DistanceMinimizer([0], 0);
      minimizeAndCheckStable(m, Vec2(100, 0), paramsToPoint);
      // Second call: target moves slightly. Should converge quickly
      // from the warm-started position near 100.
      const result = minimizeAndCheckStable(m, Vec2(105, 0), paramsToPoint);
      expect(result[0]).toBeCloseTo(105);
    });

    it("respects upper-bound constraint", () => {
      const W = 240;
      const constraints = ([value]: number[]) => [
        lessThan(0, value),
        lessThan(value, W),
      ];
      const m = new DistanceMinimizer([100], 2);
      const result = minimizeAndCheckStable(m, Vec2(300, 0), paramsToPoint, {
        constraints,
      });
      expect(result[0]).toBeCloseTo(W);
      expect(result[0]).toBeLessThanOrEqual(W);
    });

    it("respects lower-bound constraint", () => {
      const constraints = ([value]: number[]) => [
        lessThan(0, value),
        lessThan(value, 240),
      ];
      const m = new DistanceMinimizer([100], 2);
      const result = minimizeAndCheckStable(m, Vec2(-50, 0), paramsToPoint, {
        constraints,
      });
      expect(result[0]).toBeCloseTo(0);
      expect(result[0]).toBeGreaterThanOrEqual(0);
    });

    it("ignores perpendicular pointer offset", () => {
      // Target is at (120, 50) but element only moves on x-axis.
      // Should still find value ≈ 120 (minimizes distance).
      const m = new DistanceMinimizer([0], 0);
      const result = minimizeAndCheckStable(m, Vec2(120, 50), paramsToPoint);
      expect(result[0]).toBeCloseTo(120);
    });
  });

  describe("2D position", () => {
    const paramsToPoint = ([x, y]: number[]) => Vec2(x, y);

    it("finds target in 2D", () => {
      const m = new DistanceMinimizer([0, 0], 0);
      const result = minimizeAndCheckStable(m, Vec2(80, 60), paramsToPoint);
      expect(result[0]).toBeCloseTo(80);
      expect(result[1]).toBeCloseTo(60);
    });

    it("works with non-zero initial params", () => {
      const m = new DistanceMinimizer([200, 150], 0);
      const result = minimizeAndCheckStable(m, Vec2(50, 30), paramsToPoint);
      expect(result[0]).toBeCloseTo(50);
      expect(result[1]).toBeCloseTo(30);
    });
  });

  describe("nonlinear mapping", () => {
    it("handles param that maps nonlinearly to position", () => {
      // param `angle` maps to position on a circle of radius 100
      const paramsToPoint = ([angle]: number[]) =>
        Vec2(100 * Math.cos(angle), 100 * Math.sin(angle));

      const m = new DistanceMinimizer([0], 0);
      // Target at top of circle
      const result = minimizeAndCheckStable(m, Vec2(0, 100), paramsToPoint);
      const pos = paramsToPoint(result);
      // COBYLA is derivative-free so nonlinear mapping is less precise
      expect(pos.x).toBeCloseTo(0, 0);
      expect(pos.y).toBeCloseTo(100, 0);
    });
  });

  describe("zero initial params", () => {
    it("still converges when initial params are all zero", () => {
      const paramsToPoint = ([x, y]: number[]) => Vec2(x, y);
      const m = new DistanceMinimizer([0, 0], 0);
      const result = minimizeAndCheckStable(m, Vec2(50, 50), paramsToPoint);
      expect(result[0]).toBeCloseTo(50);
      expect(result[1]).toBeCloseTo(50);
    });
  });

  describe("equality constraint", () => {
    // 2D point with constraint x + y == 100.
    // The closest point on x + y = 100 to target (tx, ty) is
    // ((tx - ty + 100) / 2, (ty - tx + 100) / 2).
    const paramsToPoint = ([x, y]: number[]) => Vec2(x, y);
    const constraints = ([x, y]: number[]) => equal(x + y, 100);

    it("finds closest point on x+y=100 from small initial params", () => {
      const m = new DistanceMinimizer([10, 10], 2);
      const target = Vec2(80, 60);
      const result = minimizeAndCheckStable(m, target, paramsToPoint, {
        constraints,
      });
      // Closest point on x+y=100 to (80,60) is (60, 40)
      expect(result[0]).toBeCloseTo(60);
      expect(result[1]).toBeCloseTo(40);
      expect(result[0] + result[1]).toBeCloseTo(100);
    });

    it("finds closest point on x+y=100 from large initial params", () => {
      const m = new DistanceMinimizer([200, 200], 2);
      const target = Vec2(80, 60);
      const result = minimizeAndCheckStable(m, target, paramsToPoint, {
        constraints,
      });
      expect(result[0]).toBeCloseTo(60);
      expect(result[1]).toBeCloseTo(40);
      expect(result[0] + result[1]).toBeCloseTo(100);
    });

    it("projects a large x-only target shift onto the constraint line", () => {
      // Start on the line x+y=100 at (50,50), then target (250,50).
      // Closest point on x+y=100 to (250,50) is (150,-50).
      // That's +100 in x, -100 in y (half the x delta in each direction).
      const m = new DistanceMinimizer([50, 50], 2);
      const opts = { constraints };
      // Stabilize at starting point
      minimizeAndCheckStable(m, Vec2(50, 50), paramsToPoint, opts);
      // Jump target far in x
      const result = minimizeAndCheckStable(
        m,
        Vec2(250, 50),
        paramsToPoint,
        opts,
      );
      expect(result[0]).toBeCloseTo(150);
      expect(result[1]).toBeCloseTo(-50);
      expect(result[0] + result[1]).toBeCloseTo(100);
    });

    it("does not oscillate over many frames with static target", () => {
      const m = new DistanceMinimizer([10, 10], 2);
      const target = Vec2(80, 60);
      const opts = { constraints };
      // Warm up
      m.minimize(target, paramsToPoint, opts);
      const results: number[][] = [];
      for (let i = 0; i < 20; i++) {
        results.push(m.minimize(target, paramsToPoint, opts));
      }
      // Every frame should produce the same result (within rhoend)
      for (let i = 1; i < results.length; i++) {
        for (let j = 0; j < results[0].length; j++) {
          expect(results[i][j]).toBeCloseTo(results[0][j]);
        }
      }
    });

    it("does not oscillate with a slowly moving target", () => {
      const m = new DistanceMinimizer([10, 10], 2);
      const opts = { constraints };
      // Simulate a drag: target moves smoothly from (80,60) to (120,60)
      const frames = 30;
      const results: number[][] = [];
      for (let i = 0; i < frames; i++) {
        const tx = 80 + (40 * i) / (frames - 1);
        results.push(m.minimize(Vec2(tx, 60), paramsToPoint, opts));
      }
      // Each frame's result should move monotonically in x
      // (no jitter / direction reversals)
      for (let i = 2; i < results.length; i++) {
        const dx0 = results[i - 1][0] - results[i - 2][0];
        const dx1 = results[i][0] - results[i - 1][0];
        expect(dx0 * dx1).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe.todo("Cassini oval constraint", () => {
    // Matches the point-on-curve demo exactly:
    // center=(200,150), scale=100, a=1.1, c=1
    const center = Vec2(200, 150);
    const aPx = 110;
    const cPx = 100;
    const f1 = Vec2(center.x - cPx, center.y);
    const f2 = Vec2(center.x + cPx, center.y);
    const paramsToPoint = ([x, y]: number[]) => Vec2(x, y);
    const constraints = ([x, y]: number[]) => {
      const p = Vec2(x, y);
      return equal(p.dist(f1) * p.dist(f2), aPx ** 2);
    };

    // Top/bottom of the waist (the narrow part at x=center.x)
    const waistR = Math.sqrt(aPx ** 2 - cPx ** 2); // ≈ 45.83
    const waistTop = Vec2(center.x, center.y - waistR);
    const waistBottom = Vec2(center.x, center.y + waistR);

    it("crosses from top to bottom of waist when target moves below", () => {
      const m = new DistanceMinimizer([waistTop.x, waistTop.y], 2);
      const opts = { constraints };
      minimizeAndCheckStable(m, waistTop, paramsToPoint, opts);
      // Target moves well below the bottom of the waist
      const result = minimizeAndCheckStable(
        m,
        Vec2(center.x, center.y + 80),
        paramsToPoint,
        opts,
      );
      expect(result[1]).toBeGreaterThan(center.y);
    });

    it("crosses from bottom to top of waist when target moves above", () => {
      const m = new DistanceMinimizer([waistBottom.x, waistBottom.y], 2);
      const opts = { constraints };
      minimizeAndCheckStable(m, waistBottom, paramsToPoint, opts);
      // Target moves well above the top of the waist
      const result = minimizeAndCheckStable(
        m,
        Vec2(center.x, center.y - 80),
        paramsToPoint,
        opts,
      );
      expect(result[1]).toBeLessThan(center.y);
    });
  });
});
