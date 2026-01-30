import * as d3Ease from "d3-ease";
import React, {
  SetStateAction,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { assert } from "vitest";
import {
  BehaviorContext,
  DragBehavior,
  DragFrame,
  DragResult,
  DragSpec,
  dragSpecToBehavior,
} from "./DragSpec2";
import {
  Manipulable,
  ManipulableProps,
  getDragSpecCallbackOnElement,
  unsafeDrag,
} from "./manipulable2";
import { Vec2 } from "./math/vec2";
import { Svgx, updatePropsDownTree } from "./svgx";
import {
  HoistedSvgx,
  accumulateTransforms,
  drawHoisted,
  getAccumulatedTransform,
  hoistSvg,
  hoistedExtract,
} from "./svgx/hoist";
import { lerpHoisted } from "./svgx/lerp";
import { assignPaths, getPath } from "./svgx/path";
import { globalToLocal, parseTransform } from "./svgx/transform";
import { useAnimationLoop } from "./useAnimationLoop";
import { CatchToRenderError, useCatchToRenderError } from "./useRenderError";
import {
  assertNever,
  memoGeneric,
  pipe,
  throwError,
} from "./utils";

// # Engine state machine

type DragState<T> =
  | { type: "idle"; state: T }
  | {
      type: "dragging";
      behavior: DragBehavior<T>;
      pointerStart: Vec2;
      draggedId: string;
      result: DragResult<T>;
    }
  | {
      type: "animating";
      startHoisted: HoistedSvgx;
      targetHoisted: HoistedSvgx;
      easing: (t: number) => number;
      startTime: number;
      duration: number;
      nextState: T;
      easedProgress: number;
    };

// # Component

interface ManipulableDrawerProps<T extends object> {
  manipulable: Manipulable<T>;
  initialState: T;
  width?: number;
  height?: number;
}

export function ManipulableDrawer<T extends object>({
  manipulable,
  initialState,
  width,
  height,
}: ManipulableDrawerProps<T>) {
  const catchToRenderError = useCatchToRenderError();

  const [dragState, setDragState] = useState<DragState<T>>({
    type: "idle",
    state: initialState,
  });
  const dragStateRef = useRef(dragState);
  dragStateRef.current = dragState;
  const pointerRef = useRef<Vec2 | undefined>(undefined);

  const [svgElem, setSvgElem] = useState<SVGSVGElement | null>(null);

  const setPointerFromEvent = useCallback(
    (e: globalThis.PointerEvent) => {
      assert(!!svgElem);
      const rect = svgElem.getBoundingClientRect();
      const pointer = Vec2(e.clientX - rect.left, e.clientY - rect.top);
      pointerRef.current = pointer;
      return pointer;
    },
    [svgElem]
  );

  // Animation loop: update dragging and animating states each frame
  useAnimationLoop(
    useCallback(() => {
      const ds = dragStateRef.current;
      if (ds.type === "dragging") {
        const pointer = pointerRef.current;
        if (!pointer) return;
        const frame: DragFrame = { pointer, pointerStart: ds.pointerStart };
        const result = ds.behavior(frame);
        const newState: DragState<T> = { ...ds, result };
        dragStateRef.current = newState;
        setDragState(newState);
      } else if (ds.type === "animating") {
        const now = performance.now();
        const elapsed = now - ds.startTime;
        const progress = Math.min(elapsed / ds.duration, 1);
        const easedProgress = ds.easing(progress);
        if (progress >= 1) {
          const newState: DragState<T> = { type: "idle", state: ds.nextState };
          dragStateRef.current = newState;
          setDragState(newState);
        } else {
          const newState: DragState<T> = { ...ds, easedProgress };
          dragStateRef.current = newState;
          setDragState(newState);
        }
      }
    }, [setDragState])
  );

  // Cursor style
  useEffect(() => {
    document.body.style.cursor =
      dragState.type === "dragging" ? "grabbing" : "default";
  }, [dragState.type]);

  // Document-level pointer listeners during drag
  useEffect(() => {
    if (dragState.type !== "dragging") return;

    const onPointerMove = catchToRenderError(
      (e: globalThis.PointerEvent) => {
        setPointerFromEvent(e);
      }
    );

    const onPointerUp = catchToRenderError(
      (e: globalThis.PointerEvent) => {
        const pointer = setPointerFromEvent(e);
        const ds = dragStateRef.current;
        if (ds.type !== "dragging") return;

        const frame: DragFrame = { pointer, pointerStart: ds.pointerStart };
        const result = ds.behavior(frame);
        const dropState = result.dropState;

        // Animate from current rendered to the idle target
        const targetHoisted = renderReadOnly(manipulable, {
          state: dropState,
          draggedId: null,
          ghostId: null,
        });
        const newState: DragState<T> = {
          type: "animating",
          startHoisted: result.rendered,
          targetHoisted,
          easing: d3Ease.easeCubicInOut,
          startTime: performance.now(),
          duration: 300,
          nextState: dropState,
          easedProgress: 0,
        };
        dragStateRef.current = newState;
        setDragState(newState);
      }
    );

    document.addEventListener("pointermove", onPointerMove);
    document.addEventListener("pointerup", onPointerUp);
    return () => {
      document.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerup", onPointerUp);
    };
  }, [
    catchToRenderError,
    dragState.type,
    manipulable,
    setDragState,
    setPointerFromEvent,
  ]);

  const renderCtx: RenderContext<T> = useMemo(
    () => ({
      manipulable,
      catchToRenderError,
      setPointerFromEvent,
      setDragState: (ds: DragState<T>) => {
        dragStateRef.current = ds;
        setDragState(ds);
      },
    }),
    [catchToRenderError, manipulable, setDragState, setPointerFromEvent]
  );

  return (
    <svg
      ref={setSvgElem}
      width={width}
      height={height}
      xmlns="http://www.w3.org/2000/svg"
      className="overflow-visible select-none touch-none"
    >
      {dragState.type === "idle" ? (
        <DrawIdleMode dragState={dragState} ctx={renderCtx} />
      ) : dragState.type === "dragging" ? (
        <DrawDraggingMode dragState={dragState} />
      ) : dragState.type === "animating" ? (
        <DrawAnimatingMode dragState={dragState} />
      ) : (
        assertNever(dragState)
      )}
    </svg>
  );
}

// # Helpers

function renderReadOnly<T extends object>(
  manipulable: Manipulable<T>,
  props: Omit<ManipulableProps<T>, "drag" | "setState">
): HoistedSvgx {
  return pipe(
    manipulable({ ...props, drag: unsafeDrag, setState: throwError }),
    assignPaths,
    accumulateTransforms,
    hoistSvg
  );
}

// # Render context

type RenderContext<T extends object> = {
  manipulable: Manipulable<T>;
  catchToRenderError: CatchToRenderError;
  setPointerFromEvent: (e: globalThis.PointerEvent) => Vec2;
  setDragState: (ds: DragState<T>) => void;
};

function postProcessForInteraction<T extends object>(
  content: Svgx,
  state: T,
  ctx: RenderContext<T>
): HoistedSvgx {
  return pipe(
    content,
    assignPaths,
    accumulateTransforms,
    (el) =>
      updatePropsDownTree(el, (el) => {
        const dragSpecCallback = getDragSpecCallbackOnElement<T>(el);
        if (!dragSpecCallback) return;
        return {
          style: { cursor: "grab", ...(el.props.style || {}) },
          onPointerDown: ctx.catchToRenderError(
            (e: React.PointerEvent) => {
              e.stopPropagation();
              const pointer = ctx.setPointerFromEvent(e.nativeEvent);

              const dragSpec: DragSpec<T> = dragSpecCallback();
              const draggedId = el.props.id;
              assert(!!draggedId, "Dragged element must have an id");
              const draggedPath = getPath(el);
              assert(!!draggedPath, "Dragged element must have a path");

              const accTransform = getAccumulatedTransform(el);
              const transforms = parseTransform(accTransform || "");
              const pointerLocal = globalToLocal(transforms, pointer);

              // Render the starting state and extract the float element
              const startHoisted = renderReadOnly(ctx.manipulable, {
                state,
                draggedId,
                ghostId: null,
              });
              const { extracted: floatHoisted } = hoistedExtract(
                startHoisted,
                draggedId
              );

              const behaviorCtx: BehaviorContext<T> = {
                manipulable: ctx.manipulable,
                draggedPath,
                draggedId,
                pointerLocal,
                floatHoisted,
              };

              const behavior = dragSpecToBehavior(dragSpec, behaviorCtx);
              const frame: DragFrame = { pointer, pointerStart: pointer };
              const result = behavior(frame);

              ctx.setDragState({
                type: "dragging",
                behavior,
                pointerStart: pointer,
                draggedId,
                result,
              });
            }
          ),
        };
      }),
    hoistSvg
  );
}

// # Render modes

const DrawIdleMode = memoGeneric(
  <T extends object>({
    dragState,
    ctx,
  }: {
    dragState: DragState<T> & { type: "idle" };
    ctx: RenderContext<T>;
  }) => {
    const content = ctx.manipulable({
      state: dragState.state,
      drag: unsafeDrag,
      draggedId: null,
      ghostId: null,
      setState: ctx.catchToRenderError(
        (
          newState: SetStateAction<T>,
          { immediate = false } = {}
        ) => {
          // TODO: animate setState transitions
          void newState;
          void immediate;
        }
      ),
    });

    return drawHoisted(
      postProcessForInteraction(content, dragState.state, ctx)
    );
  }
);

const DrawDraggingMode = memoGeneric(
  <T extends object>({
    dragState,
  }: {
    dragState: DragState<T> & { type: "dragging" };
  }) => {
    return drawHoisted(dragState.result.rendered);
  }
);

const DrawAnimatingMode = memoGeneric(
  <T extends object>({
    dragState,
  }: {
    dragState: DragState<T> & { type: "animating" };
  }) => {
    return drawHoisted(
      lerpHoisted(
        dragState.startHoisted,
        dragState.targetHoisted,
        dragState.easedProgress
      )
    );
  }
);
