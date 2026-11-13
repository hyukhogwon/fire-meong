import * as THREE from "three";
import { EffectComposer } from "three/addons/postprocessing/EffectComposer.js";
import { OutputPass } from "three/addons/postprocessing/OutputPass.js";
import { RenderPass } from "three/addons/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/addons/postprocessing/UnrealBloomPass.js";
import type { Identity } from "../core/identity";
import { NAMETAG_Y, createCharacter } from "./character";
import { createDog } from "./dog";
import { HORIZON, createEnvironment } from "./environment";
import { createFire } from "./fire";
import type { Actor } from "./parts";
import { createSky } from "./sky";
import { createMarshmallowStick } from "./marshmallow";
import { toastProgress } from "../core/marshmallow";
import { createNametag } from "./nametag";
import { MeteorShower } from "./meteors";
import { auroraLevel } from "../core/aurora";

const MAX_FPS = 30;
const MAX_PIXEL_RATIO = 1.5;
const BASE_FOV = 42;
const CAMERA_POS = new THREE.Vector3(0.7, 2.6, 7.2);
const CAMERA_TARGET = new THREE.Vector3(0, 1.55, -0.6);
/** The dog lies at the camper's side nearer the camera (seat-local x, z). */
const DOG_OFFSET = { x: -1.45, z: -0.15, turn: 0.35 };
const FRAME_ASPECT = 1.4;
/** Seat: 2.2 from the fire, behind-left as seen from the camera, facing the fire. */
const SEAT = new THREE.Vector3(-1.35, 0, -1.74);

function disposeTree(obj: THREE.Object3D) {
  obj.traverse((o) => {
    const mesh = o as THREE.Mesh;
    mesh.geometry?.dispose();
    const m = mesh.material;
    (Array.isArray(m) ? m : m ? [m] : []).forEach((x) => {
      (x as THREE.SpriteMaterial).map?.dispose();
      x.dispose();
    });
  });
}

export class Stage {
  private readonly renderer: THREE.WebGLRenderer;
  private readonly composer: EffectComposer;
  private readonly scene = new THREE.Scene();
  private readonly camera = new THREE.PerspectiveCamera(BASE_FOV, 1, 0.1, 200);
  private readonly fire = createFire();
  private readonly environment = createEnvironment();
  private readonly dog = createDog();
  private self: Actor | null = null;
  private readonly seat = new THREE.Group();
  private readonly marshmallow = createMarshmallowStick();
  private toastStartedAt: number | null = null;
  private readonly timer = new THREE.Timer();
  private sinceRender = 0;
  private sky: THREE.Group | null = null;
  private readonly meteors = new MeteorShower();
  private aurora: { startedAt: number; colors: readonly string[] } | null =
    null;

  constructor(private readonly canvas: HTMLCanvasElement) {
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: "low-power",
    });
    this.renderer.setPixelRatio(
      Math.min(window.devicePixelRatio, MAX_PIXEL_RATIO),
    );
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.shadowMap.enabled = true;

    // HDR pipeline: scene → bloom (only the fire's over-bright parts) → tone mapping.
    const target = new THREE.WebGLRenderTarget(1, 1, {
      type: THREE.HalfFloatType,
      samples: 4,
    });
    this.composer = new EffectComposer(this.renderer, target);
    this.composer.addPass(new RenderPass(this.scene, this.camera));
    this.composer.addPass(
      new UnrealBloomPass(new THREE.Vector2(1, 1), 0.32, 0.6, 1.0),
    );
    this.composer.addPass(new OutputPass());

    this.scene.background = HORIZON;
    this.scene.fog = new THREE.Fog(HORIZON, 9, 24);

    // Pulled back and tilted up a little so more of the night sky shows.
    this.camera.position.set(CAMERA_POS.x, CAMERA_POS.y, CAMERA_POS.z);
    this.camera.lookAt(CAMERA_TARGET);

    this.scene.add(new THREE.HemisphereLight(0x4a5f8a, 0x0e140e, 0.55));
    const moon = new THREE.DirectionalLight(0x8fa6d6, 0.35);
    moon.position.set(-6, 10, -4);
    this.scene.add(moon);

    this.scene.add(this.environment.group);
    this.updateSky(new Date());
    this.scene.add(this.fire.group);
    this.scene.add(this.meteors.mesh);

    this.seat.position.copy(SEAT);
    this.seat.rotation.y = Math.atan2(-SEAT.x, -SEAT.z);
    this.scene.add(this.seat);
    // Separate rig with the seat's transform so rerolling the character keeps it.
    this.marshmallow.group.position.copy(SEAT);
    this.marshmallow.group.rotation.y = this.seat.rotation.y;
    this.scene.add(this.marshmallow.group);

    // The dog lies beside the seat, nose toward the fire.
    const turn = this.seat.rotation.y;
    this.dog.group.position.set(
      SEAT.x + DOG_OFFSET.x * Math.cos(turn) + DOG_OFFSET.z * Math.sin(turn),
      0,
      SEAT.z - DOG_OFFSET.x * Math.sin(turn) + DOG_OFFSET.z * Math.cos(turn),
    );
    const d = this.dog.group.position;
    this.dog.group.rotation.y = Math.atan2(-d.x, -d.z) + DOG_OFFSET.turn;
    this.dog.group.traverse((o) => {
      o.castShadow = true;
      o.receiveShadow = true;
    });
    this.scene.add(this.dog.group);
    this.marshmallow.group.traverse((o) => (o.castShadow = true));

    this.timer.connect(document);
    this.resize();
    window.addEventListener("resize", this.resize);
    // rAF-backed: pauses automatically while the tab is hidden.
    this.renderer.setAnimationLoop(this.tick);
  }

  setSelf(identity: Identity): void {
    this.seat.children.slice().forEach((c) => {
      this.seat.remove(c);
      disposeTree(c);
    });
    this.self = createCharacter(identity.appearance);
    this.self.group.traverse((o) => {
      o.castShadow = true;
      o.receiveShadow = true;
    });
    this.seat.add(this.self.group);
    const tag = createNametag(identity.name);
    tag.position.y = NAMETAG_Y;
    this.seat.add(tag);
  }

  /** Rebuilds the star field for the night that `now` belongs to. */
  updateSky(now: Date): void {
    if (this.sky) {
      this.scene.remove(this.sky);
      disposeTree(this.sky);
    }
    this.sky = createSky(now);
    this.scene.add(this.sky);
  }

  flare(): void {
    this.fire.flare();
  }

  /** Starts toasting; progress follows wall-clock time so a hidden tab catches up. */
  startToast(startedAt: number): void {
    this.toastStartedAt = startedAt;
  }

  /** Starts a short meteor shower; timed by wall clock like the marshmallow. */
  startWish(startedAt: number): void {
    this.meteors.start(startedAt, Math.random);
  }

  /** Throws aurora powder on the fire: coloured flames for a while, by wall clock. */
  startAurora(startedAt: number, colors: readonly string[]): void {
    this.aurora = { startedAt, colors };
  }

  dispose(): void {
    this.renderer.setAnimationLoop(null);
    this.timer.dispose();
    window.removeEventListener("resize", this.resize);
    disposeTree(this.scene);
    this.composer.dispose();
    this.renderer.dispose();
  }

  private readonly resize = () => {
    const w = this.canvas.clientWidth || window.innerWidth;
    const h = this.canvas.clientHeight || window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.composer.setPixelRatio(this.renderer.getPixelRatio());
    this.composer.setSize(w, h);
    const aspect = w / h;
    this.camera.aspect = aspect;
    // Keep the fire and the seat in frame on narrow/portrait windows by
    // holding the horizontal field of view at what BASE_FOV gives at FRAME_ASPECT.
    const half = THREE.MathUtils.degToRad(BASE_FOV / 2);
    this.camera.fov =
      aspect >= FRAME_ASPECT
        ? BASE_FOV
        : Math.min(
            100,
            THREE.MathUtils.radToDeg(
              2 * Math.atan((Math.tan(half) * FRAME_ASPECT) / aspect),
            ),
          );
    this.camera.updateProjectionMatrix();
    const bufferH = h * this.renderer.getPixelRatio();
    const pxPerUnit =
      bufferH / (2 * Math.tan(THREE.MathUtils.degToRad(this.camera.fov / 2)));
    this.fire.setPointScale(pxPerUnit);
    this.environment.setPointScale(pxPerUnit);
  };

  private readonly tick = (timestamp: number) => {
    this.timer.update(timestamp);
    // Clamp so returning from a hidden tab doesn't jump the simulation.
    const dt = Math.min(this.timer.getDelta(), 0.1);
    this.sinceRender += dt;
    if (this.sinceRender < 1 / MAX_FPS - 0.002) return;
    this.fire.update(this.sinceRender);
    const elapsed = this.timer.getElapsed();
    this.environment.update(elapsed, this.fire.light);
    this.self?.update(elapsed);
    this.dog.update(elapsed);
    const p = toastProgress(this.toastStartedAt, Date.now());
    if (p === null) this.toastStartedAt = null;
    this.marshmallow.setProgress(p);
    if (this.aurora) {
      const level = auroraLevel(this.aurora.startedAt, Date.now());
      this.fire.setAurora(this.aurora.colors, level);
      // Keep it through the first frame (level 0 at the very start), drop it once burnt out.
      if (level === 0 && Date.now() > this.aurora.startedAt) this.aurora = null;
    }
    this.meteors.update(
      Date.now(),
      this.camera,
      this.canvas.clientHeight || window.innerHeight,
    );
    this.sinceRender = 0;
    this.composer.render();
  };
}
