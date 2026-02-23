import "react";
import { DragSpecBrand } from "./DragSpec";
import { DragParams } from "./draggable";

declare module "react" {
  interface SVGAttributes<T> {
    /**
     * Custom attribute for attaching drag specifications to SVG elements.
     * Set to a function returning a DragSpec.
     *
     * @example
     * <circle dragology={() => d.vary(state, [["x"], ["y"]])} />
     *
     * @example
     * <rect dragology={() => d.between([state1, state2])} />
     */
    dragology?:
      | ((params: DragParams) => DragSpecBrand)
      | false
      | null
      | undefined;

    "data-z-index"?: number;
    "data-transition"?: boolean;
  }
}
