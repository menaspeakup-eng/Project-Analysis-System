import { Component, Suspense, useMemo, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { useGLTF, OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import { Loader2 } from "lucide-react";
import { AVATAR_BG_COLORS, avatarAccessoryEmoji } from "@/lib/avatarPresets";
import avatarMascotImg from "@assets/generated_images/avatar-mascot.png";

import mascotUrl from "@assets/generated_models/mascot-owl.glb?url";
import glassesUrl from "@assets/generated_models/accessory-glasses.glb?url";
import crownUrl from "@assets/generated_models/accessory-crown.glb?url";
import bowUrl from "@assets/generated_models/accessory-bow.glb?url";
import starUrl from "@assets/generated_models/accessory-star.glb?url";
import capUrl from "@assets/generated_models/accessory-cap.glb?url";

// Some browsers/devices (or sandboxed environments) don't expose a usable
// WebGL context. Detect this up front and fall back to the flat 2D preset
// rendering instead of letting three.js throw past an error boundary.
function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function Avatar2DFallback({ bgColor, accessory, className }: { bgColor: string; accessory: string; className: string }) {
  const preset = AVATAR_BG_COLORS[bgColor] ?? AVATAR_BG_COLORS.orange;
  const emoji = avatarAccessoryEmoji(accessory);
  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ backgroundImage: `linear-gradient(to bottom, ${preset.from}, ${preset.to})` }}
    >
      <img src={avatarMascotImg} alt="شخصية الطالب" className="w-full h-full object-cover" />
      {emoji && (
        <span className="absolute top-1 text-3xl" aria-hidden="true">
          {emoji}
        </span>
      )}
    </div>
  );
}

class Avatar3DErrorBoundary extends Component<
  { fallback: ReactNode; children: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(error: unknown) {
    console.warn("Avatar3D failed to render, falling back to 2D preview:", error);
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

// Mascot is normalized to this height (world units); accessory placement below
// is tuned relative to this so it lines up with the owl's head regardless of
// the raw scale/pivot the generated GLB happened to ship with.
const MASCOT_HEIGHT = 1.6;

const ACCESSORY_URLS: Record<string, string> = {
  glasses: glassesUrl,
  crown: crownUrl,
  bow: bowUrl,
  star: starUrl,
  cap: capUrl,
};

// Per-accessory placement tuned by eye near the owl's head/face, since each
// generated GLB has its own scale and pivot.
const ACCESSORY_PLACEMENT: Record<
  string,
  { position: [number, number, number]; scale: number; rotation?: [number, number, number] }
> = {
  glasses: { position: [0, 1.08, 0.42], scale: 0.4 },
  crown: { position: [0, 1.62, 0], scale: 0.42 },
  bow: { position: [0.35, 1.5, 0.25], scale: 0.32 },
  star: { position: [0.6, 1.35, 0.1], scale: 0.3 },
  cap: { position: [0, 1.58, -0.02], scale: 0.5 },
};

// Loads a GLTF and re-centers/grounds it so arbitrarily-scaled generated
// models line up consistently: centered on X/Z, sitting on Y=0.
function useGroundedScene(url: string) {
  const { scene } = useGLTF(url);
  return useMemo(() => {
    const cloned = scene.clone(true);
    const box = new THREE.Box3().setFromObject(cloned);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    cloned.position.x -= center.x;
    cloned.position.z -= center.z;
    cloned.position.y -= box.min.y;
    return { object: cloned, height: size.y || 1 };
  }, [scene]);
}

function MascotMesh() {
  const { object, height } = useGroundedScene(mascotUrl);
  const scale = MASCOT_HEIGHT / height;
  return (
    <group scale={scale}>
      <primitive object={object} />
    </group>
  );
}

function AccessoryMesh({ accessory }: { accessory: string }) {
  const url = ACCESSORY_URLS[accessory];
  const placement = ACCESSORY_PLACEMENT[accessory];
  // eslint-disable-next-line react-hooks/rules-of-hooks -- url/placement are stable per accessory key
  const { object, height } = url ? useGroundedScene(url) : { object: null, height: 1 };
  if (!url || !placement || !object) return null;
  const scale = (placement.scale * MASCOT_HEIGHT) / height;
  return (
    <group position={placement.position} rotation={placement.rotation}>
      <group scale={scale}>
        <primitive object={object} />
      </group>
    </group>
  );
}

function Scene({ accessory, interactive, autoRotate }: { accessory: string; interactive: boolean; autoRotate: boolean }) {
  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[2, 3, 2]} intensity={1.1} />
      <directionalLight position={[-2, 1, -1]} intensity={0.35} />
      <Environment preset="city" environmentIntensity={0.25} />
      <group position={[0, -0.8, 0]}>
        <MascotMesh />
        {accessory !== "none" && <AccessoryMesh accessory={accessory} />}
      </group>
      {interactive ? (
        <OrbitControls
          enablePan={false}
          enableZoom={false}
          minPolarAngle={Math.PI / 2.6}
          maxPolarAngle={Math.PI / 1.8}
          autoRotate={autoRotate}
          autoRotateSpeed={2.2}
        />
      ) : null}
    </>
  );
}

function CanvasFallback() {
  return (
    <div className="w-full h-full flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-white/70" />
    </div>
  );
}

export function Avatar3D({
  bgColor,
  accessory,
  interactive = false,
  autoRotate = true,
  className = "",
}: {
  bgColor: string;
  accessory: string;
  /** When true, the student can drag to rotate the model. */
  interactive?: boolean;
  /** When true (default), the model spins on its own; disabled while dragging. */
  autoRotate?: boolean;
  className?: string;
}) {
  const preset = AVATAR_BG_COLORS[bgColor] ?? AVATAR_BG_COLORS.orange;
  const fallback = <Avatar2DFallback bgColor={bgColor} accessory={accessory} className={className} />;

  if (!isWebGLAvailable()) {
    return fallback;
  }

  return (
    <Avatar3DErrorBoundary fallback={fallback}>
      <div
        className={`overflow-hidden ${className}`}
        style={{ backgroundImage: `linear-gradient(to bottom, ${preset.from}, ${preset.to})` }}
      >
        <Suspense fallback={<CanvasFallback />}>
          <Canvas
            camera={{ position: [0, 0.15, 3.1], fov: 32 }}
            gl={{ antialias: true, alpha: true }}
            dpr={[1, 1.5]}
            onCreated={({ gl }) => {
              gl.domElement.addEventListener(
                "webglcontextlost",
                (event) => event.preventDefault(),
                false,
              );
            }}
          >
            <Scene accessory={accessory} interactive={interactive} autoRotate={autoRotate} />
          </Canvas>
        </Suspense>
      </div>
    </Avatar3DErrorBoundary>
  );
}

useGLTF.preload(mascotUrl);
