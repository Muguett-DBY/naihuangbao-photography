import { useEffect, useRef, type RefObject } from "react";
import type * as THREE from "three";

export function useSwiperDistortion(containerRef: RefObject<HTMLDivElement | null>) {
  const rafRef = useRef(0);
  const texCache = useRef<Map<string, THREE.Texture>>(new Map());
  const cleanupRef = useRef<(() => void) | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let cancelled = false;
    let scene: THREE.Scene | null = null;
    let camera: THREE.OrthographicCamera | null = null;
    let renderer: THREE.WebGLRenderer | null = null;
    let material: THREE.ShaderMaterial | null = null;
    let geometry: THREE.BufferGeometry | null = null;
    let hoverX = 0.5, hoverY = 0.5, intensity = 0, active = false;

    (async () => {
      const THREE = await import("three");
      if (cancelled) return;

      const loader = new THREE.TextureLoader();
      const disp = loader.load("/images/displacement.png");

      material = new THREE.ShaderMaterial({
        uniforms: {
          uTexture: { value: null },
          uDisplacement: { value: disp },
          uIntensity: { value: 0 },
          uAngle: { value: 0 },
          uHoverX: { value: 0.5 },
          uHoverY: { value: 0.5 },
        },
        vertexShader: `varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}`,
        fragmentShader: `
          precision highp float;
          varying vec2 vUv;
          uniform sampler2D uTexture;
          uniform sampler2D uDisplacement;
          uniform float uIntensity;
          uniform float uAngle;
          uniform float uHoverX;
          uniform float uHoverY;
          void main() {
            vec2 uv = vUv;
            vec2 hv = vec2(uHoverX, uHoverY);
            vec2 dir = uv - hv;
            float dist = length(dir);
            vec2 dn = normalize(dir);
            vec4 d = texture2D(uDisplacement, uv + dn * dist * 0.3);
            vec2 off = vec2(cos(uAngle), sin(uAngle)) * d.r * uIntensity * 0.12;
            float f = 1.0 - smoothstep(0.0, 0.8, dist);
            gl_FragColor = texture2D(uTexture, uv + off * f);
          }
        `,
      });

      scene = new THREE.Scene();
      camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 10);
      camera.position.z = 1;
      geometry = new THREE.PlaneGeometry(2, 2);
      const mesh = new THREE.Mesh(geometry, material);
      scene.add(mesh);

      renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
      renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
      renderer.domElement.style.cssText = "position:absolute;inset:0;pointer-events:none;z-index:2;border-radius:14px;";

      const resize = () => {
        if (!container || !renderer) return;
        renderer.setSize(container.clientWidth || 400, container.clientHeight || 533);
      };

      container.style.position = "relative";
      container.appendChild(renderer.domElement);
      resize();

      const ro = new ResizeObserver(() => resize());
      ro.observe(container);

      const onMove = (e: MouseEvent) => {
        const card = (e.target as HTMLElement).closest("[data-disp-img]") as HTMLElement | null;
        if (!card || !material) { active = false; return; }
        const src = card.getAttribute("data-disp-img");
        if (src && !texCache.current.has(src)) {
          const t = loader.load(src);
          texCache.current.set(src, t);
        }
        if (src && texCache.current.has(src)) {
          material.uniforms.uTexture.value = texCache.current.get(src);
        }
        const r = card.getBoundingClientRect();
        hoverX = (e.clientX - r.left) / r.width;
        hoverY = 1 - (e.clientY - r.top) / r.height;
        active = true;
      };
      const onLeave = () => { active = false; };

      container.addEventListener("mousemove", onMove);
      container.addEventListener("mouseleave", onLeave);

      let angle = Math.PI / 4;
      const loop = () => {
        if (!material || !renderer || !scene || !camera) return;
        if (active) { intensity += (1 - intensity) * 0.08; angle += 0.02; }
        else { intensity += (0 - intensity) * 0.05; }
        material.uniforms.uIntensity.value = intensity;
        material.uniforms.uAngle.value = angle;
        material.uniforms.uHoverX.value = hoverX;
        material.uniforms.uHoverY.value = hoverY;
        renderer.render(scene, camera);
        rafRef.current = requestAnimationFrame(loop);
      };
      rafRef.current = requestAnimationFrame(loop);

      cleanupRef.current = () => {
        cancelAnimationFrame(rafRef.current);
        container.removeEventListener("mousemove", onMove);
        container.removeEventListener("mouseleave", onLeave);
        ro.disconnect();
      };
    })();

    return () => {
      cancelled = true;
      cleanupRef.current?.();
      cancelAnimationFrame(rafRef.current);
      if (renderer) {
        geometry?.dispose();
        material?.dispose();
        renderer.dispose();
        if (container.contains(renderer.domElement)) {
          container.removeChild(renderer.domElement);
        }
      }
    };
  }, [containerRef]);
}
