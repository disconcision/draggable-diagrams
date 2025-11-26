import { produce } from "immer";
import _ from "lodash";
import { Manipulable, span } from "./manipulable";
import { group, rectangle } from "./shape";
import { Vec2 } from "./vec2";
import { XYWH } from "./xywh";

type PermState = {
  store: { key: string; label: string }[];
  items: { key: string; label: string }[];
};

export const manipulableInsertAndRemove: Manipulable<PermState> = {
  sourceFile: "manipulable-insert-and-remove.ts",

  render(state, draggableKey) {
    // draw grid as rectangles
    const TILE_SIZE = 50;
    return group(
      rectangle({
        xywh: XYWH(0, 0, 60, TILE_SIZE),
        label: "Store:",
      }),
      state.store.map(({ key, label }, idx) =>
        rectangle({
          xywh: XYWH(0, 0, TILE_SIZE, TILE_SIZE),
          strokeStyle: "black",
          lineWidth: 2,
          fillStyle: "white",
          label,
        })
          .draggable(key)
          .absoluteKey(key)
          .zIndex(key === draggableKey ? 1 : 0)
          .translate(Vec2(80 + idx * TILE_SIZE, 0)),
      ),
      state.items.map(({ key, label }, idx) =>
        rectangle({
          xywh: XYWH(0, 0, TILE_SIZE, TILE_SIZE),
          strokeStyle: "black",
          lineWidth: 2,
          fillStyle: "white",
          label,
        })
          .draggable(key)
          .absoluteKey(key)
          .zIndex(key === draggableKey ? 1 : 0)
          .translate(Vec2(idx * TILE_SIZE, TILE_SIZE * 1.5)),
      ),
    );
  },

  accessibleFrom(state, draggableKey) {
    const itemIdx = state.items.findIndex((item) => item.key === draggableKey);
    if (itemIdx !== -1) {
      const draggedItem = state.items[itemIdx];
      return span(
        _.range(state.items.length).map((idx) =>
          produce(state, (draft) => {
            draft.items.splice(itemIdx, 1);
            draft.items.splice(idx, 0, draggedItem);
          }),
        ),
      );
    } else {
      // item is from store, can be inserted anywhere
      const storeItemIdx = state.store.findIndex(
        (item) => item.key === draggableKey,
      );
      const storeItem = state.store[storeItemIdx];
      return span(
        _.range(state.items.length + 1).map((idx) =>
          produce(state, (draft) => {
            draft.items.splice(idx, 0, storeItem);
            draft.store[storeItemIdx].key += "-1";
          }),
        ),
      );
    }
  },
};

export const stateInsertAndRemove1: PermState = {
  store: [
    { key: "D", label: "🍎" },
    { key: "E", label: "🍌" },
    { key: "F", label: "🍇" },
  ],
  items: [
    { key: "A", label: "🍎" },
    { key: "B", label: "🍎" },
    { key: "C", label: "🍌" },
  ],
};
