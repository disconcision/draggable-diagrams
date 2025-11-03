import { Vec2 } from "./vec2";

export type XYWH = readonly [number, number, number, number];

export const XYWH = (x: number, y: number, w: number, h: number): XYWH => {
  if (w < 0) {
    x -= w;
    w = -w;
  }
  if (h < 0) {
    y -= h;
    h = -h;
  }
  return [x, y, w, h];
};

export const inXYWH = (tx: number, ty: number, [x, y, w, h]: XYWH) => {
  return x <= tx && tx <= x + w && y <= ty && ty <= y + h;
};

export const tl = (xywh: XYWH): Vec2 => [xywh[0], xywh[1]];
export const tr = (xywh: XYWH): Vec2 => [xywh[0] + xywh[2], xywh[1]];
export const bl = (xywh: XYWH): Vec2 => [xywh[0], xywh[1] + xywh[3]];
export const br = (xywh: XYWH): Vec2 => [xywh[0] + xywh[2], xywh[1] + xywh[3]];
export const tm = (xywh: XYWH): Vec2 => [xywh[0] + xywh[2] / 2, xywh[1]];
export const bm = (xywh: XYWH): Vec2 => [
  xywh[0] + xywh[2] / 2,
  xywh[1] + xywh[3],
];
export const ml = (xywh: XYWH): Vec2 => [xywh[0], xywh[1] + xywh[3] / 2];
export const mr = (xywh: XYWH): Vec2 => [
  xywh[0] + xywh[2],
  xywh[1] + xywh[3] / 2,
];
export const mm = (xywh: XYWH): Vec2 => [
  xywh[0] + xywh[2] / 2,
  xywh[1] + xywh[3] / 2,
];

export const expand = (xywh: XYWH, dx: number, dy?: number): XYWH => {
  if (dy === undefined) dy = dx;
  return [xywh[0] - dx, xywh[1] - dy, xywh[2] + 2 * dx, xywh[3] + 2 * dy];
};
