import { Draggable } from "./draggable";
import { DragSpecBuilder } from "./DragSpec";
import { Svgx } from "./svgx";
import { accumulateTransforms, LayeredSvgx, layerSvg } from "./svgx/layers";
import { assignPaths } from "./svgx/path";
import { pipe, throwError } from "./utils";

/** Render a state through assignPaths + accumulateTransforms, but stop before layering. */
export function renderDraggableInertUnlayered<T extends object>(
  draggable: Draggable<T>,
  state: T,
  draggedId: string | null,
): Svgx {
  return pipe(
    draggable({
      state,
      d: new DragSpecBuilder<T>(),
      draggedId,
      setState: throwError,
    }),
    assignPaths,
    accumulateTransforms,
  );
}

export function renderDraggableInert<T extends object>(
  draggable: Draggable<T>,
  state: T,
  draggedId: string | null,
): LayeredSvgx {
  return layerSvg(renderDraggableInertUnlayered(draggable, state, draggedId));
}
