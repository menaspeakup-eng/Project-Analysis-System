import { Component, Suspense, useMemo, type ReactNode } from "react";
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
import glassesUrl from "@assets/generated_models/accessory-glasses.glb?url";
import crownUrl from "@assets/generated_models/accessory-crown.glb?url";
import bowUrl from "@assets/generated_models/accessory-bow.glb?url";
import starUrl from "@assets/generated_models/accessory-star.glb?url";
import capUrl from "@assets/generated_models/accessory-cap.glb?url";
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

// Character is normalized to this height (world units); accessory/pet
// placement below is tuned relative to this so it lines up regardless of the
// raw scale/pivot the generated GLB happened to ship with.
const CHARACTER_HEIGHT = 1.7;
const PET_HEIGHT = 0.55;

const CHARACTER_URLS: Record<string, string> = {
  male: boyUrl,
  female: girlUrl,
};

const ACCESSORY_URLS: Record<string, string> = {
  glasses: glassesUrl,
  crown: crownUrl,
  bow: bowUrl,
  star: starUrl,
  cap: capUrl,
};

const PET_URLS: Record<string, string> = {
  cat: petCatUrl,
  dog: petDogUrl,
  rabbit: petRabbitUrl,
  bird: petBirdUrl,
  turtle: petTurtleUrl,
};

// Per-accessory placement tuned against the human character's actual head
// geometry and each accessory's real bounding box (checked with
// `gltf-transform inspect` against the generated GLBs, since the preview
// tools available in this environment can't render WebGL for a visual
// check). The head occupies roughly the top quarter of CHARACTER_HEIGHT
// (from ~75% up to 100%), and is about 0.75-0.8 world units wide.
//
// `scale` is the accessory's target on-screen size (its larger raw X or Y
// dimension -- see `useGroundedScene`'s `maxXY`) as a fraction of
// CHARACTER_HEIGHT. Some of these generated props are much deeper
// (front-to-back) than they are wide or tall -- e.g. the bow's raw Z extent
// is ~4x its raw X width -- so sizing off the single largest raw dimension
// (old behavior) made them either huge or tiny depending on which axis won.
// X/Y is what the camera actually sees, so it's the right thing to size by.
const ACCESSORY_PLACEMENT: Record<
  string,
  { position: [number, number, number]; scale: number; rotation?: [number, number, number] }
> = {
  // Raw maxXY=0.937 (X, lens-to-lens width). Target ~0.45 world units across
  // the face, resting at eye level.
  glasses: { position: [0, 1.41, 0.24], scale: 0.265 },
  // Raw maxXY=0.871 (X, diameter). Target ~0.5 world units, resting on the
  // scalp just above the head-top.
  crown: { position: [0, 1.62, 0], scale: 0.294 },
  // Raw maxXY=0.754 (Y -- this model is taller than wide). Target ~0.25
  // world units, tucked to the side near the hairline.
  bow: { position: [0.22, 1.5, 0.05], scale: 0.147 },
  // Raw maxXY=0.911 (Y). Target ~0.28 world units, held out to the side.
  star: { position: [0.4, 0.85, 0.28], scale: 0.165 },
  // Raw maxXY=0.9998 (X, brim width). Target ~0.75 world units, sitting
  // lower over the head than the crown.
  cap: { position: [0, 1.52, -0.02], scale: 0.441 },
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
    // Some generated assets (glasses, bows, stars, ...) are wide/flat rather
    // than tall, so their Y-height can be much smaller than their width or
    // depth. Scaling those purely by height blew them up to several times
    // the intended size. The camera looks down the Z axis, so only X
    // (left/right) and Y (up/down) are visually apparent -- Z is depth and,
    // for several of these generated props, happens to be the largest raw
    // dimension for reasons unrelated to how big the object actually looks
    // (e.g. a bow's "front-to-back" extent from its generation pose). Use
    // the larger of X/Y as the normalization target instead, so accessories
    // are sized by how big they actually appear on screen.
    const maxXY = Math.max(size.x, size.y) || 1;
    return { object: cloned, height: size.y || 1, maxXY };
  }, [scene]);
}

function CharacterMesh({ gender }: { gender: string }) {
  const url = CHARACTER_URLS[gender] ?? CHARACTER_URLS.male;
  const { object, height } = useGroundedScene(url);
  const scale = CHARACTER_HEIGHT / height;
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
  const { object, maxXY } = url ? useGroundedScene(url) : { object: null, maxXY: 1 };
  if (!url || !placement || !object) return null;
  // Normalize by the accessory's largest on-screen dimension (X or Y, not
  // raw depth) so flat/wide props like glasses or a bow don't balloon or
  // shrink just because of an incidental front-to-back extent.
  const scale = (placement.scale * CHARACTER_HEIGHT) / maxXY;
  return (
    <group position={placement.position} rotation={placement.rotation}>
      <group scale={scale}>
        <primitive object={object} />
      </group>
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
  accessories,
  pet,
  interactive,
  autoRotate,
}: {
  gender: string;
  accessories: string[];
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
        <CharacterMesh gender={gender} />
        {accessories.map((accessory) => (
          <AccessoryMesh key={accessory} accessory={accessory} />
        ))}
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
  accessories,
  pet,
  interactive = false,
  autoRotate = true,
  className = "",
}: {
  bgColor: string;
  gender: string;
  accessories: string[];
  pet: string;
  /** When true, the student can drag to rotate the model. */
  interactive?: boolean;
  /** When true (default), the model spins on its own; disabled while dragging. */
  autoRotate?: boolean;
  className?: string;
}) {
  const preset = AVATAR_BG_COLORS[bgColor] ?? AVATAR_BG_COLORS.orange;
  const fallback = (
    <Avatar2DFallback bgColor={bgColor} gender={gender} accessories={accessories} pet={pet} className={className} />
  );

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
            camera={{ position: [0, 0.15, pet !== "none" ? 3.6 : 3.1], fov: 32 }}
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
              accessories={accessories}
              pet={pet}
              interactive={interactive}
              autoRotate={autoRotate}
            />
          </Canvas>
        </Suspense>
      </div>
    </Avatar3DErrorBoundary>
  );
}

useGLTF.preload(boyUrl);
useGLTF.preload(girlUrl);
