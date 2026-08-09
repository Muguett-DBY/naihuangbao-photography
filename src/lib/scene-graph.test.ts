import { describe, expect, it } from "vitest";
import { premiereSceneGraphs } from "../data/premiere-scene-graphs";
import { createSceneGraph, getSceneIndexForProgress, normalizeSceneMotion } from "./scene-graph";

describe("SceneGraph director", () => {
  it("normalizes unsafe motion values into a stable render budget", () => {
    expect(normalizeSceneMotion({ durationMs: 8_000, intensity: 4, depth: -1, focusX: 2, focusY: -2 })).toMatchObject({
      durationMs: 4_000,
      intensity: 1,
      depth: 0,
      focusX: 1,
      focusY: 0,
    });
  });

  it("maps scroll progress deterministically without overflowing the graph", () => {
    expect(getSceneIndexForProgress(-1, 6)).toBe(0);
    expect(getSceneIndexForProgress(0.5, 6)).toBe(3);
    expect(getSceneIndexForProgress(1, 6)).toBe(5);
  });

  it("rejects duplicate node identifiers", () => {
    const node = { id: "one", assetId: "asset", imageUrl: "/one.webp", labelKey: "one", altKey: "one" };
    expect(() => createSceneGraph("duplicate", [node, node])).toThrow("Invalid SceneGraph node");
  });

  it("ships three six-node premiere graphs with varied transitions", () => {
    const graphs = Object.values(premiereSceneGraphs);
    expect(graphs).toHaveLength(3);
    expect(graphs.every((graph) => graph.nodes.length === 6)).toBe(true);
    expect(new Set(graphs.flatMap((graph) => graph.nodes.map((node) => node.transition))).size).toBe(5);
    expect(graphs.flatMap((graph) => graph.nodes).every((node) => node.assetId.startsWith("visual-os-v7-"))).toBe(true);
  });
});
