import { produce } from "immer";
import _ from "lodash";
import { SVGProps } from "react";
import { amb, produceAmb } from "../amb";
import { floating, numsAtPaths } from "../DragSpec";
import { Manipulable } from "../manipulable";
import { getAtPath } from "../paths";
import { translate } from "../svgx/helpers";

export namespace CanvasOfListsNested {
  export type State = {
    rows: (Row & { x: number; y: number })[];
  };

  type Tile = { id: string; label: string };
  type Row = { id: string; items: (Tile | Row)[]; color: string };

  function isTile(item: Tile | Row): item is Tile {
    return "label" in item;
  }

  const colors = [
    "#c9e4f0", // soft blue
    "#f5d5d8", // soft pink
    "#d4edcf", // soft green
    "#f5eac9", // soft yellow
    "#e4d4e8", // soft purple
    "#f5dcc9", // soft peach
    "#c9f0ed", // soft aqua
    "#e8d4f0", // soft lavender
  ];

  export const state1: State = {
    rows: [
      {
        id: "row1",
        items: [
          { id: "A1", label: "A1" },
          { id: "B1", label: "B1" },
          {
            id: "row1-1",
            items: [
              { id: "A1-1", label: "A1-1" },
              { id: "B1-1", label: "B1-1" },
            ],
            color: colors[3],
          },
        ],
        color: colors[0],
        x: 0,
        y: 0,
      },
      {
        id: "row2",
        items: [
          { id: "A2", label: "A2" },
          { id: "B2", label: "B2" },
          { id: "C2", label: "C2" },
        ],
        color: colors[1],
        x: 20,
        y: 100,
      },
      {
        id: "row3",
        items: [
          { id: "A3", label: "A3" },
          { id: "B3", label: "B3" },
          { id: "C3", label: "C3" },
        ],
        color: colors[2],
        x: 100,
        y: 200,
      },
    ],
  };

  export const manipulable: Manipulable<State> = ({
    state,
    drag,
    draggedId,
  }) => {
    const TILE_SIZE = 50;
    const TILE_GAP = 8;
    const ROW_PADDING = 8;
    const GRIP_WIDTH = 16;
    const GRIP_PADDING = 2;

    function getItemWidth(item: Tile | Row): number {
      if (isTile(item)) {
        return TILE_SIZE;
      } else {
        return getRowWidth(item);
      }
    }

    function getRowWidth(row: Row): number {
      const itemsWidth = row.items.reduce(
        (acc, item) => acc + getItemWidth(item) + TILE_GAP,
        -TILE_GAP
      );
      return GRIP_WIDTH + GRIP_PADDING + itemsWidth + ROW_PADDING * 2;
    }

    function getRowHeight(row: Row): number {
      const maxItemHeight = Math.max(
        TILE_SIZE,
        ...row.items.map((item) =>
          isTile(item) ? TILE_SIZE : getRowHeight(item)
        )
      );
      return maxItemHeight + ROW_PADDING * 2;
    }

    // Collect paths to all items arrays (for drop targets)
    function collectItemsPaths(
      row: Row,
      rowPath: (string | number)[]
    ): (string | number)[][] {
      const result: (string | number)[][] = [[...rowPath, "items"]];
      row.items.forEach((child, childIdx) => {
        if (!isTile(child)) {
          result.push(
            ...collectItemsPaths(child, [...rowPath, "items", childIdx])
          );
        }
      });
      return result;
    }

    function renderItem(
      item: Tile | Row,
      itemsPath: (string | number)[],
      idx: number,
      zIndexBase: number,
      attrs?: SVGProps<SVGGElement>
    ) {
      const isDragged = draggedId === item.id;

      const onDrag = drag(() => {
        // Remove item from current location
        const stateWithout = produce(state, (draft) => {
          const items = getAtPath<typeof draft, (Tile | Row)[]>(
            draft,
            itemsPath as any
          );
          items.splice(idx, 1);
        });

        // Get all possible drop target paths from the state after removal
        const dropTargetPaths = stateWithout.rows.flatMap((row, rowIdx) =>
          collectItemsPaths(row, ["rows", rowIdx])
        );

        // Generate states for all possible placements in existing rows
        const statesWith =
          dropTargetPaths.length > 0
            ? produceAmb(stateWithout, (draft) => {
                const targetPath = amb(dropTargetPaths);
                const targetItems = getAtPath<typeof draft, (Tile | Row)[]>(
                  draft,
                  targetPath as any
                );
                const insertIdx = amb(_.range(targetItems.length + 1));
                targetItems.splice(insertIdx, 0, item);
              })
            : [];

        // Create backdrop state for floating mode
        const stateWithNewRow = produce(stateWithout, (draft) => {
          if (isTile(item)) {
            // Tiles need a surrounding row
            const existingIds = new Set(stateWithout.rows.map((r) => r.id));
            const newRowId =
              _.range(1, 100)
                .map((i) => `row${i}`)
                .find((id) => !existingIds.has(id)) ?? "row-new";
            const newRowColor =
              colors[stateWithout.rows.length % colors.length];
            draft.rows.push({
              id: newRowId,
              items: [item],
              color: newRowColor,
              x: 0,
              y: 0,
            });
          } else {
            // Rows can be placed directly at top level
            draft.rows.push({ ...item, x: 0, y: 0 });
          }
        });

        return floating(statesWith, {
          backdrop: numsAtPaths(
            [
              ["rows", stateWithNewRow.rows.length - 1, "x"],
              ["rows", stateWithNewRow.rows.length - 1, "y"],
            ],
            stateWithNewRow
          ),
        });
      });

      const effectiveZIndex = isDragged ? zIndexBase + 10 : zIndexBase;

      if (isTile(item)) {
        return (
          <g
            id={item.id}
            data-z-index={effectiveZIndex}
            data-on-drag={onDrag}
            {...attrs}
          >
            <rect
              x={0}
              y={0}
              width={TILE_SIZE}
              height={TILE_SIZE}
              stroke="#aaa"
              strokeWidth={1.5}
              fill="white"
              rx={4}
            />
            <text
              x={TILE_SIZE / 2}
              y={TILE_SIZE / 2}
              dominantBaseline="middle"
              textAnchor="middle"
              fontSize={18}
              fontWeight="500"
              fill="#555"
            >
              {item.label}
            </text>
          </g>
        );
      } else {
        const rowHeight = getRowHeight(item);
        let xOffset = GRIP_WIDTH + GRIP_PADDING + ROW_PADDING;

        return (
          <g
            id={item.id}
            data-z-index={effectiveZIndex}
            data-on-drag={onDrag}
            {...attrs}
          >
            <rect
              width={getRowWidth(item)}
              height={rowHeight}
              fill={item.color}
              stroke="#aaa"
              strokeWidth={1.5}
              rx={6}
            />
            {/* Grip dots */}
            <g opacity={0.35}>
              {[0, 1, 2].map((i) =>
                [0, 1].map((j) => (
                  <circle
                    cx={GRIP_WIDTH / 2 + 8 * j}
                    cy={rowHeight / 2 + (i - 1) * 8}
                    r={1.5}
                    fill="#333"
                  />
                ))
              )}
            </g>
            {item.items.map((child, childIdx) => {
              const childX = xOffset;
              xOffset += getItemWidth(child) + TILE_GAP;
              return renderItem(
                child,
                [...itemsPath, idx, "items"],
                childIdx,
                effectiveZIndex + 1,
                { transform: translate(childX, ROW_PADDING) }
              );
            })}
          </g>
        );
      }
    }

    return (
      <g>
        {state.rows.map((row, rowIdx) =>
          renderItem(row, ["rows"], rowIdx, 0, { transform: translate(row) })
        )}
      </g>
    );
  };
}
