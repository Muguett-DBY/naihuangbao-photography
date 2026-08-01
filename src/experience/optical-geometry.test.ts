import * as THREE from "three";
import { describe, expect, it } from "vitest";
import {
  applyPresetGeometry,
  createContactSheetGroup,
  createCoordinateMarkerGroup,
  disposeOpticalGroup,
  presetUsesCoordinateMarkers,
  presetUsesFocusRails,
} from "./optical-geometry";
import { SCENE_PRESETS } from "./scene-presets";

function planePositions(group: THREE.Group): THREE.Vector3[] {
  return group.children.map((child) => child.position.clone());
}

function showAllPlanes(group: THREE.Group): THREE.Group {
  group.children.forEach((child) => {
    child.visible = true;
  });
  return group;
}

describe("catalogue optical geometry", () => {
  it("uses focus rails for course scenes and coordinate markers for workshop scenes", () => {
    expect(presetUsesFocusRails(SCENE_PRESETS.courses)).toBe(true);
    expect(presetUsesFocusRails(SCENE_PRESETS["course-detail"])).toBe(true);
    expect(presetUsesCoordinateMarkers(SCENE_PRESETS.workshops)).toBe(true);
    expect(presetUsesCoordinateMarkers(SCENE_PRESETS["workshop-detail"])).toBe(true);
    expect(presetUsesCoordinateMarkers(SCENE_PRESETS.shop)).toBe(false);
  });

  it("builds a disposable line-based workshop date marker rail", () => {
    const markers = createCoordinateMarkerGroup();
    const line = markers.children[0] as THREE.LineSegments;

    expect(markers.name).toBe("coordinate-date-markers");
    expect(line.userData.dateMarkerCount).toBe(7);
    expect(line.geometry.getAttribute("position").count).toBe(18);
    disposeOpticalGroup(markers);
  });

  it("keeps preset chromatic offsets within 0.018 world units", () => {
    const presetGroup = showAllPlanes(createContactSheetGroup(8));
    const neutralGroup = showAllPlanes(createContactSheetGroup(8));
    applyPresetGeometry(presetGroup, SCENE_PRESETS.presets, 0);
    applyPresetGeometry(neutralGroup, SCENE_PRESETS.editor, 0);

    const offsets = planePositions(presetGroup).map((position, index) => (
      Math.abs(position.x - neutralGroup.children[index]!.position.x)
    ));
    expect(Math.max(...offsets)).toBeCloseTo(0.018, 6);
    expect(offsets.some((offset) => offset > 0)).toBe(true);
    disposeOpticalGroup(presetGroup);
    disposeOpticalGroup(neutralGroup);
  });

  it("bounds the high-tier shop product rail to 8.4 world units", () => {
    const group = showAllPlanes(createContactSheetGroup(8));
    applyPresetGeometry(group, SCENE_PRESETS.shop, 0);
    const positions = planePositions(group).map((position) => position.x);

    expect(Math.max(...positions) - Math.min(...positions)).toBeLessThanOrEqual(8.4);
    disposeOpticalGroup(group);
  });

  it("centers a single visible catalogue plane without counting hidden pool capacity", () => {
    const group = createContactSheetGroup(10);
    group.children[0]!.visible = true;
    applyPresetGeometry(group, SCENE_PRESETS.courses, 0);

    expect(group.children[0]!.position.x).toBe(0);
    expect(group.children.slice(1).every((child) => child.position.x === 0)).toBe(true);
    disposeOpticalGroup(group);
  });

  it("builds the home scene as a full-bleed background with portrait slices that scatter on scroll", () => {
    const group = showAllPlanes(createContactSheetGroup(7));
    applyPresetGeometry(group, SCENE_PRESETS.home, 0);

    const background = group.children[0]!;
    const firstPortrait = group.children[1]!;
    const portraitStart = firstPortrait.position.clone();
    expect(background.scale.x).toBeGreaterThan(4);
    expect(background.scale.y).toBeGreaterThan(3.5);
    expect(background.position.z).toBeLessThan(-1);
    expect(firstPortrait.scale.y).toBeGreaterThan(firstPortrait.scale.x);
    expect(firstPortrait.position.z).toBeGreaterThan(background.position.z);

    applyPresetGeometry(group, SCENE_PRESETS.home, 1);
    expect(firstPortrait.position.distanceTo(portraitStart)).toBeGreaterThan(0.5);
    expect(background.scale.x).toBeGreaterThan(4.5);
    disposeOpticalGroup(group);
  });
});
