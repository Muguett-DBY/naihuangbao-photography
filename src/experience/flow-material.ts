import * as THREE from "three";

type FlowUniforms = {
  time: { value: number };
  pointer: { value: THREE.Vector2 };
  velocity: { value: THREE.Vector2 };
  strength: { value: number };
  scroll: { value: number };
  imageAspect: { value: number };
  planeAspect: { value: number };
};

const FLOW_UNIFORM_KEY = "nhbFlowUniforms";
const FLOW_PROGRAM_KEY = "nhb-flow-v2";

const FLOW_MAP_FRAGMENT = /* glsl */`
#ifdef USE_MAP
  float nhbPlaneAspect = max(uNHBPlaneAspect, 0.001);
  float nhbImageAspect = max(uNHBImageAspect, 0.001);
  vec2 nhbCoverScale = vec2(
    min(nhbPlaneAspect / nhbImageAspect, 1.0),
    min(nhbImageAspect / nhbPlaneAspect, 1.0)
  );
  vec2 nhbUv = vMapUv * nhbCoverScale + (1.0 - nhbCoverScale) * 0.5;
  vec2 nhbDelta = nhbUv - uNHBPointer;
  float nhbDistance = max(length(nhbDelta), 0.0001);
  vec2 nhbDirection = nhbDelta / nhbDistance;
  vec2 nhbTangent = vec2(-nhbDirection.y, nhbDirection.x);
  vec2 nhbVelocity = clamp(uNHBVelocity, vec2(-0.28), vec2(0.28));
  float nhbActivity = min(1.6, max(0.0, uNHBStrength - 0.22));
  float nhbInfluence = smoothstep(0.66, 0.0, nhbDistance) * min(uNHBStrength, 1.8);
  float nhbWave = sin(nhbDistance * 38.0 - uNHBTime * 5.2 + uNHBScroll * 8.0);
  float nhbVortex = cos(nhbDistance * 26.0 + uNHBTime * 3.4) * 0.009 * nhbInfluence;
  vec2 nhbFlow = nhbDirection * nhbWave * 0.019 * nhbInfluence
    + nhbTangent * nhbVortex
    + nhbVelocity * (0.08 + nhbInfluence * 0.14);
  float nhbSlice = sin(floor(nhbUv.y * 18.0) * 1.47 + uNHBTime * 0.72)
    * (uNHBScroll * 0.008 + nhbActivity * length(nhbVelocity) * 0.018);
  nhbUv = clamp(nhbUv + nhbFlow + vec2(nhbSlice, 0.0), 0.001, 0.999);

  float nhbChromatic = min(
    0.034,
    (length(nhbVelocity) * 0.38 + 0.0028) * nhbInfluence
  );
  vec2 nhbChromaticVector = nhbDirection * nhbChromatic
    + nhbVelocity * nhbChromatic * 1.2;
  vec4 nhbCenter = texture2D(map, nhbUv);
  vec4 sampledDiffuseColor = vec4(
    texture2D(map, clamp(nhbUv + nhbChromaticVector * 1.65, 0.001, 0.999)).r,
    nhbCenter.g,
    texture2D(map, clamp(nhbUv - nhbChromaticVector * 2.05, 0.001, 0.999)).b,
    nhbCenter.a
  );
  float nhbGrain = fract(sin(dot(gl_FragCoord.xy + uNHBTime, vec2(12.9898, 78.233))) * 43758.5453) - 0.5;
  sampledDiffuseColor.rgb += nhbGrain * 0.012 * min(uNHBStrength, 1.0);

  #ifdef DECODE_VIDEO_TEXTURE
    sampledDiffuseColor = sRGBTransferEOTF(sampledDiffuseColor);
  #endif

  diffuseColor *= sampledDiffuseColor;
#endif
`;

export function resolveFlowEnergy(pointerDeltaX: number, pointerDeltaY: number, scrollDelta: number): number {
  const pointerSpeed = Math.hypot(pointerDeltaX, pointerDeltaY);
  return Math.min(1.35, pointerSpeed * 5.5 + Math.abs(scrollDelta) * 8);
}

function createFlowUniforms(): FlowUniforms {
  return {
    time: { value: 0 },
    pointer: { value: new THREE.Vector2(0.5, 0.5) },
    velocity: { value: new THREE.Vector2() },
    strength: { value: 0 },
    scroll: { value: 0 },
    imageAspect: { value: 1 },
    planeAspect: { value: 1.5 },
  };
}

export function configureFlowMaterial(material: THREE.MeshBasicMaterial): void {
  const uniforms = createFlowUniforms();
  material.userData[FLOW_UNIFORM_KEY] = uniforms;
  material.onBeforeCompile = (shader) => {
    shader.uniforms.uNHBTime = uniforms.time;
    shader.uniforms.uNHBPointer = uniforms.pointer;
    shader.uniforms.uNHBVelocity = uniforms.velocity;
    shader.uniforms.uNHBStrength = uniforms.strength;
    shader.uniforms.uNHBScroll = uniforms.scroll;
    shader.uniforms.uNHBImageAspect = uniforms.imageAspect;
    shader.uniforms.uNHBPlaneAspect = uniforms.planeAspect;
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", `#include <common>
uniform float uNHBTime;
uniform vec2 uNHBPointer;
uniform vec2 uNHBVelocity;
uniform float uNHBStrength;
uniform float uNHBScroll;
uniform float uNHBImageAspect;
uniform float uNHBPlaneAspect;`)
      .replace("#include <map_fragment>", FLOW_MAP_FRAGMENT);
  };
  material.customProgramCacheKey = () => FLOW_PROGRAM_KEY;
}

export function getFlowUniforms(material: THREE.MeshBasicMaterial): FlowUniforms | null {
  return (material.userData[FLOW_UNIFORM_KEY] as FlowUniforms | undefined) ?? null;
}
