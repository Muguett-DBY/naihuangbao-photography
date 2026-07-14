import * as THREE from "three";
import { ResourceRegistry } from "./resource-registry";
import type { ScenePreset } from "./scene-presets";

type OwnedGroup = THREE.Group & {
  userData: {
    disposeResources?: () => void;
  };
};

const INK = 0x171a18;
const PAPER = 0xe9e4d8;

function createOwnedGroup(): { group: OwnedGroup; resources: ResourceRegistry } {
  const group = new THREE.Group() as OwnedGroup;
  const resources = new ResourceRegistry();
  group.userData.disposeResources = () => resources.dispose();
  return { group, resources };
}

function clampProgress(progress: number): number {
  if (!Number.isFinite(progress)) return 0;
  return Math.min(1, Math.max(0, progress));
}

export function disposeOpticalGroup(group: THREE.Group): void {
  (group as OwnedGroup).userData.disposeResources?.();
}

export function createContactSheetGroup(planeCount: number): THREE.Group {
  const { group, resources } = createOwnedGroup();
  group.name = "contact-sheet";
  const count = Math.min(10, Math.max(0, Math.floor(planeCount)));

  for (let index = 0; index < count; index += 1) {
    const geometry = resources.register(new THREE.PlaneGeometry(2.4, 1.6));
    const material = resources.register(new THREE.MeshBasicMaterial({
      color: PAPER,
      side: THREE.DoubleSide,
      toneMapped: false,
    }));
    const plane = new THREE.Mesh(geometry, material);
    plane.name = `contact-plane-${index}`;
    plane.userData.opticalKind = "contact-plane";
    plane.visible = false;
    group.add(plane);
  }

  return group;
}

export function createFocusRailGroup(): THREE.Group {
  const { group, resources } = createOwnedGroup();
  group.name = "focus-rails";
  const geometry = resources.register(new THREE.BufferGeometry());
  geometry.setAttribute("position", new THREE.Float32BufferAttribute([
    -4, 0, 0, 4, 0, 0,
    0, -2.5, 0, 0, 2.5, 0,
    -3.2, -1.8, 0, 3.2, -1.8, 0,
    -3.2, 1.8, 0, 3.2, 1.8, 0,
  ], 3));
  const material = resources.register(new THREE.LineBasicMaterial({ color: PAPER, transparent: true, opacity: 0.42 }));
  const rails = new THREE.LineSegments(geometry, material);
  rails.userData.opticalKind = "focus-rails";
  group.add(rails);
  return group;
}

export function createShutterGroup(bladeCount = 8): THREE.Group {
  const { group, resources } = createOwnedGroup();
  group.name = "shutter";
  const count = Math.min(12, Math.max(1, Math.floor(bladeCount)));

  for (let index = 0; index < count; index += 1) {
    const geometry = resources.register(new THREE.PlaneGeometry(2.1, 0.46));
    geometry.translate(0.8, 0, 0);
    const material = resources.register(new THREE.MeshBasicMaterial({
      color: INK,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.74,
      toneMapped: false,
    }));
    const blade = new THREE.Mesh(geometry, material);
    blade.rotation.z = (index / count) * Math.PI * 2;
    blade.userData.opticalKind = "shutter-blade";
    group.add(blade);
  }

  return group;
}

export function applyPresetGeometry(group: THREE.Group, preset: ScenePreset, progress: number): void {
  const amount = clampProgress(progress);
  const planes: THREE.Object3D[] = [];
  group.traverse((object) => {
    if (object.userData.opticalKind === "contact-plane") planes.push(object);
  });

  planes.forEach((plane, index) => {
    const centered = index - (planes.length - 1) / 2;
    const column = index % 3;
    const row = Math.floor(index / 3);

    switch (preset.composition) {
      case "tunnel":
        plane.position.set(centered * 0.56, Math.sin(index * 1.4) * 0.52, -index * preset.depth * 0.08);
        plane.rotation.set(0, centered * -0.07, centered * 0.015);
        break;
      case "archive":
        plane.position.set((column - 1) * 2.55, (1 - row) * 1.78, -row * 0.42);
        plane.rotation.set(0, 0, (column - 1) * 0.012);
        break;
      case "coordinates":
        plane.position.set(centered * 1.35, Math.sin(index * 2.1) * 0.7, -index * 0.3);
        plane.rotation.set(0, centered * -0.035, 0);
        break;
      case "machine":
        plane.position.set(centered * 1.72, index % 2 === 0 ? 0.32 : -0.32, -Math.abs(centered) * 0.34);
        plane.rotation.set(0, centered * -0.04, 0);
        break;
      case "shutter":
        plane.position.set(centered * 0.72, centered * 0.16, -Math.abs(centered) * 0.2);
        plane.rotation.set(0, 0, centered * 0.025);
        break;
      case "calibration":
        plane.position.set(centered * 1.1 + ((index % 3) - 1) * 0.018, Math.sin(index) * 0.12, -index * 0.16);
        plane.rotation.set(0, 0, 0);
        break;
      case "boundary":
        plane.position.set(centered * 1.25, centered % 2 === 0 ? 0.2 : -0.2, -index * 0.18);
        plane.rotation.set(0, centered * -0.03, centered * 0.01);
        break;
      case "focus":
        plane.position.set(centered * 0.92, centered === 0 ? 0 : -0.42, -Math.abs(centered) * 0.55);
        plane.rotation.set(0, centered * -0.055, 0);
        break;
    }

    plane.position.y += (amount - 0.5) * centered * 0.08;
  });

  group.rotation.y = (amount - 0.5) * 0.06;
}
