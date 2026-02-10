import { Falsey } from "lodash";
import "react";
import { DragSpecBrand } from "./DragSpec";

declare module "react" {
  interface SVGAttributes<T> {
    /**
     * Custom attribute for attaching drag specifications to SVG elements.
     * Set to a function returning a DragSpec.
     *
     * @example
     * <circle data-on-drag={() => d.vary(state, ["x"], ["y"])} />
     *
     * @example
     * <rect data-on-drag={() => d.span([state1, state2])} />
     */
    "data-on-drag"?: (() => DragSpecBrand) | Falsey;

    "data-z-index"?: number;
    "data-transition"?: boolean;
  }
}
