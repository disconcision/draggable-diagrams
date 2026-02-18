import { ReactElement, SetStateAction } from "react";
import { DragSpec, DragSpecBuilder } from "./DragSpec";
import { Svgx } from "./svgx";
import { TransitionLike } from "./transition";

/**
 * A Draggable is a function that takes state and draggable helper, returns SVG JSX.
 */
export type Draggable<T extends object> = (props: DraggableProps<T>) => Svgx;

export type DraggableProps<T extends object> = {
  state: T;
  d: DragSpecBuilder<T>;
  draggedId: string | null;
  setState: SetState<T>;
};

// # setState

export type SetState<T> = (
  newState: SetStateAction<T>,
  props?: {
    transition?: TransitionLike;
  },
) => void;

// # drag

export type DragParams = {
  altKey: boolean;
  ctrlKey: boolean;
  metaKey: boolean;
  shiftKey: boolean;
};

export type OnDragPropValue<T> = (params: DragParams) => DragSpec<T>;

export function getDragSpecCallbackOnElement<T>(
  element: ReactElement,
): ((params: DragParams) => DragSpec<T>) | undefined {
  return (element.props as any)["data-on-drag"] || undefined;
}
