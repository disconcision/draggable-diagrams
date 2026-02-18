import { Draggable, DraggableProps } from "./draggable";
import { assignPaths } from "./svgx/path";
import { accumulateTransforms, layerSvg, LayeredSvgx } from "./svgx/layers";
import { pipe, throwError } from "./utils";

export function renderDraggableReadOnly<T extends object>(
  draggable: Draggable<T>,
  props: Omit<DraggableProps<T>, "setState">,
): LayeredSvgx {
  return pipe(
    draggable({
      ...props,
      setState: throwError,
    }),
    assignPaths,
    accumulateTransforms,
    layerSvg,
  );
}
