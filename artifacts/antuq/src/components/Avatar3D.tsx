import { Component, Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { useGLTF, OrbitControls, Environment } from "@react-three/drei";
import * as THREE from "three";
import { Loader2 } from "lucide-react";
import {
  AVATAR_BG_COLORS,
  AVATAR_GENDERS,
  avatarAccessoryEmojis,
  avatarPetEmoji,
} from "@/lib/avatarPresets";

import boyUrl from "@assets/generated_models/character-boy.glb?url";
import girlUrl from "@assets/generated_models/character-girl.glb?url";
import boyGlassesUrl from "@assets/generated_models/character-boy-glasses.glb?url";
import boyBowUrl from "@assets/generated_models/character-boy-bow.glb?url";
import boyStarUrl from "@assets/generated_models/character-boy-star.glb?url";
import boyCrownUrl from "@assets/generated_models/character-boy-crown.glb?url";
import boyCapUrl from "@assets/generated_models/character-boy-cap.glb?url";
import girlGlassesUrl from "@assets/generated_models/character-girl-glasses.glb?url";
import girlBowUrl from "@assets/generated_models/character-girl-bow.glb?url";
import girlStarUrl from "@assets/generated_models/character-girl-star.glb?url";
import girlCrownUrl from "@assets/generated_models/character-girl-crown.glb?url";
import girlCapUrl from "@assets/generated_models/character-girl-cap.glb?url";
import petCatUrl from "@assets/generated_models/pet-cat.glb?url";
import petDogUrl from "@assets/generated_models/pet-dog.glb?url";
import petRabbitUrl from "@assets/generated_models/pet-rabbit.glb?url";
import petBirdUrl from "@assets/generated_models/pet-bird.glb?url";
import petTurtleUrl from "@assets/generated_models/pet-turtle.glb?url";

// Some browsers/devices (or sandboxed environments) don't expose a usable
// WebGL context. Detect this up front and fall back to a flat 2D preset
// rendering instead of letting three.js throw past an error boundary.
function isWebGLAvailable(): boolean {
  try {
    const canvas = document.createElement("canvas");
    return !!(canvas.getContext("webgl2") || canvas.getContext("webgl"));
  } catch {
    return false;
  }
}

function Avatar2DFallback({
  bgColor,
  gender,
  accessories,
  pet,
  className,
}: {
  bgColor: string;
  gender: string;
  accessories: string[];
  pet: string;
  className: string;
}) {
  const preset = AVATAR_BG_COLORS[bgColor] ?? AVATAR_BG_COLORS.orange;
  const personEmoji = AVATAR_GENDERS[gender]?.emoji ?? AVATAR_GENDERS.male.emoji;
  const accessoryEmojis = avatarAccessoryEmojis(accessories);
  const petEmoji = avatarPetEmoji(pet);
  return (
    <div
      className={`relative flex items-center justify-center ${className}`}
      style={{ backgroundImage: `linear-gradient(to bottom, ${preset.from}, ${preset.to})` }}
    >
      <span className="text-6xl" aria-hidden="true">
        {personEmoji}
      </span>
      {accessoryEmojis.length > 0 && (
        <span className="absolute top-1 flex gap-0.5" aria-hidden="true">
          {accessoryEmojis.map((emoji, index) => (
            <span key={index} className="text-3xl">
              {emoji}
            </span>
          ))}
        </span>
      )}
      {petEmoji && (
        <span className="absolute bottom-1 left-1 text-2xl" aria-hidden="true">
          {petEmoji}
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

// Character is normalized to this height (world units); pet placement below
// is tuned relative to this so it lines up regardless of the raw
// scale/pivot the generated GLB happened to ship with.
const CHARACTER_HEIGHT = 1.7;
const PET_HEIGHT = 0.55;

// Each gender+accessory combo is its own complete, pre-modeled 3D character
// (accessory sculpted onto the body by the model generator itself, not
// composited on top of a generic body at runtime -- see the note in
// avatarPresets.ts). "none" is the bare character with no accessory.
const CHARACTER_URLS: Record<string, Record<string, string>> = {
  male: {
    none: boyUrl,
    glasses: boyGlassesUrl,
    bow: boyBowUrl,
    star: boyStarUrl,
    crown: boyCrownUrl,
    cap: boyCapUrl,
  },
  female: {
    none: girlUrl,
    glasses: girlGlassesUrl,
    bow: girlBowUrl,
    star: girlStarUrl,
    crown: girlCrownUrl,
    cap: girlCapUrl,
  },
};

const PET_URLS: Record<string, string> = {
  cat: petCatUrl,
  dog: petDogUrl,
  rabbit: petRabbitUrl,
  bird: petBirdUrl,
  turtle: petTurtleUrl,
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

function CharacterMesh({ gender, accessory }: { gender: string; accessory: string }) {
  const genderUrls = CHARACTER_URLS[gender] ?? CHARACTER_URLS.male;
  const url = genderUrls[accessory] ?? genderUrls.none;
  const { object, height } = useGroundedScene(url);
  const scale = CHARACTER_HEIGHT / height;
  return (
    <group scale={scale}>
      <primitive object={object} />
    </group>
  );
}

function PetMesh({ pet }: { pet: string }) {
  const url = PET_URLS[pet];
  // eslint-disable-next-line react-hooks/rules-of-hooks -- url is stable per pet key
  const { object, height } = url
    ? useGroundedScene(url)
    : { object: null, height: 1 };
  if (!url || !object) return null;
  const scale = PET_HEIGHT / height;
  return (
    <group position={[0.85, 0, 0.15]} rotation={[0, -0.4, 0]}>
      <group scale={scale}>
        <primitive object={object} />
      </group>
    </group>
  );
}

function Scene({
  gender,
  accessory,
  pet,
  interactive,
  autoRotate,
}: {
  gender: string;
  accessory: string;
  pet: string;
  interactive: boolean;
  autoRotate: boolean;
}) {
  return (
    <>
      <ambientLight intensity={0.9} />
      <directionalLight position={[2, 3, 2]} intensity={1.1} />
      <directionalLight position={[-2, 1, -1]} intensity={0.35} />
      <Environment preset="city" environmentIntensity={0.25} />
      <group position={[pet !== "none" ? -0.35 : 0, -0.85, 0]}>
        <CharacterMesh gender={gender} accessory={accessory} />
        {pet !== "none" && <PetMesh pet={pet} />}
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
  gender,
  accessory = "none",
  pet,
  interactive = false,
  autoRotate = true,
  frontView = false,
  className = "",
}: {
  bgColor: string;
  gender: string;
  /** Which single accessory (if any) this character is wearing. Defaults to "none". */
  accessory?: string;
  pet: string;
  /** When true, the student can drag to rotate the model. */
  interactive?: boolean;
  /** When true (default), the model spins on its own; disabled while dragging. */
  autoRotate?: boolean;
  /** When true, the camera is locked to a front-facing view and auto-rotation is disabled. */
  frontView?: boolean;
  className?: string;
}) {
  const preset = AVATAR_BG_COLORS[bgColor] ?? AVATAR_BG_COLORS.orange;
  const fallback = (
    <Avatar2DFallback
      bgColor={bgColor}
      gender={gender}
      accessories={accessory === "none" ? [] : [accessory]}
      pet={pet}
      className={className}
    />
  );

  // Defer 3D model loading until the page has finished its critical content.
  // This keeps the UI responsive and lets the character appear as the final
  // piece of the page instead of blocking the initial render.
  const [show3D, setShow3D] = useState(false);
  useEffect(() => {
    const handle = window.requestIdleCallback
      ? window.requestIdleCallback(() => setShow3D(true), { timeout: 2000 })
      : window.setTimeout(() => setShow3D(true), 800);
    return () => {
      if (typeof handle === "number" && window.cancelIdleCallback) {
        window.cancelIdleCallback(handle);
      } else {
        window.clearTimeout(handle as number);
      }
    };
  }, []);

  if (!isWebGLAvailable()) {
    return fallback;
  }

  return (
    <Avatar3DErrorBoundary fallback={fallback}>
      <div
        className={`overflow-hidden ${className}`}
        style={{ backgroundImage: `linear-gradient(to bottom, ${preset.from}, ${preset.to})` }}
      >
        {show3D ? (
          <Suspense fallback={fallback}>
            <Canvas
              camera={{
                position: frontView
                  ? [0, 0.15, pet !== "none" ? 3.2 : 2.8]
                  : [0, 0.15, pet !== "none" ? 3.6 : 3.1],
                fov: 32,
              }}
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
              <Scene
                gender={gender}
                accessory={accessory}
                pet={pet}
                interactive={interactive && !frontView}
                autoRotate={autoRotate && !frontView}
              />
            </Canvas>
          </Suspense>
        ) : (
          fallback
        )}
      </div>
    </Avatar3DErrorBoundary>
  );
}

// Models are loaded on-demand by the pages that render the avatar; preloading
// the base character files would download ~24 MB on every app startup.
