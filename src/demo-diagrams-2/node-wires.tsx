import { produce } from "immer";
import { closest, just, vary, withBackground } from "../DragSpec2";
import { Manipulable } from "../manipulable2";
import { translate } from "../svgx/helpers";

export namespace NodeWires {
  const NODE_W = 90;
  const NODE_HEADER = 20;
  const PORT_SPACING = 22;
  const PORT_R = 5;

  const NODE_DEFS: Record<
    string,
    { label: string; inputs: string[]; outputs: string[] }
  > = {
    A: { label: "Mix", inputs: ["a", "b"], outputs: ["out"] },
    B: { label: "Filter", inputs: ["in"], outputs: ["out"] },
    C: { label: "Output", inputs: ["in"], outputs: [] },
  };

  function nodeHeight(nodeId: string) {
    const def = NODE_DEFS[nodeId];
    const maxPorts = Math.max(def.inputs.length, def.outputs.length, 1);
    return NODE_HEADER + maxPorts * PORT_SPACING + 6;
  }

  function portY(count: number, idx: number, h: number) {
    const startY =
      NODE_HEADER + (h - NODE_HEADER - count * PORT_SPACING) / 2 + PORT_SPACING / 2;
    return startY + idx * PORT_SPACING;
  }

  function portPos(
    nodes: State["nodes"],
    nodeId: string,
    port: string
  ): [number, number] {
    const n = nodes[nodeId];
    const def = NODE_DEFS[nodeId];
    const h = nodeHeight(nodeId);
    const outIdx = def.outputs.indexOf(port);
    if (outIdx >= 0) {
      return [n.x + NODE_W, n.y + portY(def.outputs.length, outIdx, h)];
    }
    const inIdx = def.inputs.indexOf(port);
    return [n.x, n.y + portY(def.inputs.length, inIdx, h)];
  }

  type WireEnd =
    | { type: "on-port"; nodeId: string; port: string }
    | { type: "free"; x: number; y: number };

  export type State = {
    nodes: Record<string, { x: number; y: number }>;
    wires: Record<string, { from: WireEnd; to: WireEnd }>;
  };

  function endPos(nodes: State["nodes"], end: WireEnd): [number, number] {
    if (end.type === "on-port") {
      return portPos(nodes, end.nodeId, end.port);
    }
    return [end.x, end.y];
  }

  function allPorts(side: "in" | "out") {
    const result: { nodeId: string; port: string }[] = [];
    for (const [nodeId, def] of Object.entries(NODE_DEFS)) {
      for (const p of side === "in" ? def.inputs : def.outputs) {
        result.push({ nodeId, port: p });
      }
    }
    return result;
  }

  export const state1: State = {
    nodes: {
      A: { x: 20, y: 30 },
      B: { x: 200, y: 10 },
      C: { x: 380, y: 40 },
    },
    wires: {
      w1: {
        from: { type: "on-port", nodeId: "A", port: "out" },
        to: { type: "on-port", nodeId: "B", port: "in" },
      },
      w2: {
        from: { type: "on-port", nodeId: "B", port: "out" },
        to: { type: "free", x: 340, y: 130 },
      },
    },
  };

  export const manipulable: Manipulable<State> = ({ state, drag, draggedId }) => {
    function endDrag(wireId: string, endKey: "from" | "to") {
      return drag(() => {
        const [px, py] = endPos(state.nodes, state.wires[wireId][endKey]);

        const freeState = produce(state, (d) => {
          d.wires[wireId][endKey] = { type: "free", x: px, y: py };
        });

        const varySpec = vary(
          freeState,
          ["wires", wireId, endKey, "x"],
          ["wires", wireId, endKey, "y"]
        );

        const side = endKey === "to" ? "in" : "out";
        const snapSpecs = allPorts(side).map(({ nodeId, port }) =>
          just(
            produce(state, (d) => {
              d.wires[wireId][endKey] = { type: "on-port", nodeId, port };
            })
          )
        );

        if (snapSpecs.length > 0) {
          return withBackground(closest(snapSpecs), varySpec, { radius: 20 });
        }
        return varySpec;
      });
    }

    return (
      <g>
        {/* wires */}
        {Object.entries(state.wires).map(([wid, wire]) => {
          const [fx, fy] = endPos(state.nodes, wire.from);
          const [tx, ty] = endPos(state.nodes, wire.to);
          const dx = Math.max(Math.abs(tx - fx) * 0.4, 30);

          return (
            <g id={`wire-${wid}`}>
              <path
                id={`wire-path-${wid}`}
                d={`M${fx},${fy} C${fx + dx},${fy} ${tx - dx},${ty} ${tx},${ty}`}
                fill="none"
                stroke="#aaa"
                strokeWidth={2}
              />
              <circle
                id={`wire-${wid}-from`}
                transform={translate(fx, fy)}
                r={wire.from.type === "free" ? 6 : PORT_R}
                fill={wire.from.type === "free" ? "#ccc" : "transparent"}
                stroke={wire.from.type === "free" ? "#999" : "none"}
                strokeWidth={wire.from.type === "free" ? 1 : 0}
                data-z-index={3}
                data-on-drag={endDrag(wid, "from")}
              />
              <circle
                id={`wire-${wid}-to`}
                transform={translate(tx, ty)}
                r={wire.to.type === "free" ? 6 : PORT_R}
                fill={wire.to.type === "free" ? "#ccc" : "transparent"}
                stroke={wire.to.type === "free" ? "#999" : "none"}
                strokeWidth={wire.to.type === "free" ? 1 : 0}
                data-z-index={3}
                data-on-drag={endDrag(wid, "to")}
              />
            </g>
          );
        })}

        {/* nodes */}
        {Object.entries(state.nodes).map(([nid, node]) => {
          const def = NODE_DEFS[nid];
          const h = nodeHeight(nid);

          return (
            <g
              id={`node-${nid}`}
              transform={translate(node.x, node.y)}
              data-z-index={draggedId === `node-${nid}` ? 5 : 1}
              data-on-drag={drag(
                vary(state, ["nodes", nid, "x"], ["nodes", nid, "y"])
              )}
            >
              <rect
                width={NODE_W}
                height={h}
                rx={5}
                fill="#fdfdfd"
                stroke="#bbb"
                strokeWidth={1.2}
              />
              <line
                x1={0}
                y1={NODE_HEADER}
                x2={NODE_W}
                y2={NODE_HEADER}
                stroke="#ddd"
              />
              <text
                x={NODE_W / 2}
                y={NODE_HEADER / 2 + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize={11}
                fontWeight="600"
                fill="#444"
              >
                {def.label}
              </text>

              {/* input ports */}
              {def.inputs.map((port, i) => {
                const py = portY(def.inputs.length, i, h);
                const connected = Object.values(state.wires).some(
                  (w) =>
                    w.to.type === "on-port" &&
                    w.to.nodeId === nid &&
                    w.to.port === port
                );
                return (
                  <g id={`port-${nid}-${port}`}>
                    <circle
                      cx={0}
                      cy={py}
                      r={PORT_R}
                      fill={connected ? "#4a9eff" : "#c0d8f0"}
                      stroke="white"
                      strokeWidth={1.5}
                    />
                    <text
                      x={PORT_R + 4}
                      y={py}
                      dominantBaseline="middle"
                      fontSize={9}
                      fill="#999"
                    >
                      {port}
                    </text>
                  </g>
                );
              })}

              {/* output ports */}
              {def.outputs.map((port, i) => {
                const py = portY(def.outputs.length, i, h);
                const connected = Object.values(state.wires).some(
                  (w) =>
                    w.from.type === "on-port" &&
                    w.from.nodeId === nid &&
                    w.from.port === port
                );
                return (
                  <g id={`oport-${nid}-${port}`}>
                    <circle
                      cx={NODE_W}
                      cy={py}
                      r={PORT_R}
                      fill={connected ? "#ff6b4a" : "#f0c8c0"}
                      stroke="white"
                      strokeWidth={1.5}
                    />
                    <text
                      x={NODE_W - PORT_R - 4}
                      y={py}
                      dominantBaseline="middle"
                      textAnchor="end"
                      fontSize={9}
                      fill="#999"
                    >
                      {port}
                    </text>
                  </g>
                );
              })}
            </g>
          );
        })}
      </g>
    );
  };
}
