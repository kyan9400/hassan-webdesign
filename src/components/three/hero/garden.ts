import {
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Vector2,
  Vector3,
  type InstancedMesh,
  type PerspectiveCamera,
  type Scene,
  type Texture,
  type WebGLRenderer,
} from "three";
import type { Quality } from "@/lib/quality";
import { LoopGovernor } from "@/lib/loop-governor";
import { getMotion, subscribeMotion, type Motion } from "@/lib/motion";
import { getTheme, subscribeTheme } from "@/lib/theme";
import { exitProgress, subscribeScrollFrame } from "@/lib/scroll-progress";
import { heroFraming, FOV, type HeroFraming } from "@/lib/skyline-fit";
import { damp, smoothstep } from "@/lib/damp";
import { BirdBrain, type BirdInput, type Rect, type Vec2, type Vec3 } from "../bird/birdBrain";
import { Hummingbird } from "../bird/Hummingbird";
import { BIRD_START, PERCH, SIP_OFFSET } from "./layout";
import { DAY, NIGHT } from "./palette";
import { Skyline } from "./Skyline";
import { createCanopies } from "./Canopies";
import { Blossoms } from "./Blossoms";
import { createPollen, Sparks } from "./Pollen";
import { createHill, lawnColor } from "./Hill";
import { createGrounding } from "./Grounding";
import { TowerDetails } from "./TowerDetails";
import { Glows } from "./Glows";
import { createGardenEnvironment } from "./environment";

/**
 * GardenController — the imperative core of "The living skyline". Plain TypeScript; the React
 * component (GardenScene) only creates it, hands it the renderer and calls `frame()` from useFrame.
 * Everything per frame works on preallocated objects and uniforms (no React state, no allocations).
 *
 * The scroll moment, "Golden hour" (full motion, ≥ 768px, live 3D, the tall track): over the
 * damped scroll value pS the hero text fades and lifts, the sun arcs down behind tower 4 while the
 * light turns amber, the windows switch on floor by floor in a ripple from tower 4, the camera
 * dolly-zooms (moves in 30 % while the FOV widens 30° → 42°, skyline width fixed) and the bird
 * leaves for the work section. At night the same track is "Midnight": the windows go out.
 * Intro ("lights on"): the sun ramps up from 0.35 while a light sweep crosses the facades.
 */

export type GardenAttach = {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  invalidate: () => void;
  setDpr: (dpr: number) => void;
  /** the frame rate kept falling with every cheap step taken: drop the expensive effects */
  onDegrade: () => void;
  hero: HTMLElement;
  text: HTMLElement | null;
  onReady: () => void;
  onLost: () => void;
};

const DEFAULT_SUN = new Vector3(2.5, 9, 7);
/** golden hour: the sun ends just behind tower 4, arcing through a high control point */
const DUSK_SUN = new Vector3(-0.6, 2.4, -6);
const DUSK_CTRL = new Vector3(3.2, 8.2, -1.5);
const LOOK_SUN_PLANE_Z = 1.5;
const DEG = Math.PI / 180;
const FOV_DUSK = 42;
const HALF_TAN_FOV = Math.tan((FOV / 2) * DEG);
const AMBER_HEMI = new Color("#F6C9A0");
const AMBER_SUN = new Color("#FFB36B");
const SWEEP_FROM = -3.6;
const SWEEP_TO = 4.4;
const SWEEP_OFF = -10;

export class GardenController {
  /** add with <primitive object={garden.root} /> */
  readonly root = new Group();
  private readonly content = new Group();
  private readonly quality: Quality;

  // shared uniforms
  private readonly uTime = { value: 0 };
  private readonly uNight = { value: 0 };
  private readonly uDusk = { value: 0 };
  private readonly uSweep = { value: SWEEP_OFF };
  private readonly uRise = { value: 0 };
  private readonly uWind = { value: 1 };
  private readonly uSunDir = { value: new Vector3(0.3, 0.8, 0.5).normalize() };
  private readonly uSun = { value: DEFAULT_SUN.clone() };
  private readonly uLightDir = { value: new Vector3(0.3, 0.8, 0.5).normalize() };
  private readonly uScale = { value: 800 };

  // parts
  private readonly hemi: HemisphereLight;
  private readonly sunLight: DirectionalLight;
  private readonly skyline: Skyline;
  private readonly blossoms: Blossoms;
  private readonly pollen;
  private readonly sparks: Sparks;
  private readonly hill;
  private readonly canopies: InstancedMesh;
  private readonly grounding;
  private readonly details: TowerDetails;
  private readonly glows: Glows;
  private bird: Hummingbird | null = null;
  private brain: BirdBrain | null = null;
  private env: Texture | null = null;

  // environment / DOM
  private a: GardenAttach | null = null;
  private governor: LoopGovernor | null = null;
  private cleanups: (() => void)[] = [];
  private disposed = false;
  private warm = false;
  private readySent = false;
  private t0 = 0;
  private dusk: HTMLElement | null = null;
  private caption: HTMLElement | null = null;

  // layout
  private W = 1;
  private H = 1;
  private framing: HeroFraming = heroFraming(1440, 900);
  private canvasLeft = 0;
  private canvasTop = 0;
  private readonly noFly: Rect = { x0: 0, y0: 0, x1: 0, y1: 0 };
  private hasNoFly = false;
  private blossomScreen: Float32Array;

  // state
  private motion: Motion = "reduced";
  private nightTarget = 0;
  private nightFrom = 0;
  private nightProgress = 1;
  private introStart = -1;
  private sweepStart = -1;
  private lightsOn = 1;
  private pTarget = 0;
  private pS = 0;
  /** the golden-hour track is active (tall hero, full motion, ≥ 768px) */
  private golden = false;
  private focusInHero = false;
  private textFade = -1;
  private overlay = -1;
  private captionOn = -1;
  private duskLight = 0;
  private fov = FOV;
  private exited = false;
  private yawP = 0;
  private pitchP = 0;
  private cursorActive = false;
  private cursorX = 0;
  private cursorY = 0;
  private lastInput = 0;
  private tap = false;
  private tapX = 0;
  private tapY = 0;
  private downX = 0;
  private downY = 0;
  private downT = 0;
  private dpr = 1;
  private declines = 0;

  // scratch
  private readonly v = new Vector3();
  private readonly v2 = new Vector3();
  private readonly sunTarget = new Vector3();
  private readonly look = new Vector3();
  private readonly cTmp = new Color();
  private readonly cTmp2 = new Color();
  private readonly bufSize = new Vector2();
  private readonly tmp2: Vec2 = { x: 0, y: 0 };
  private readonly input: BirdInput;

  constructor(quality: Quality) {
    this.quality = quality;
    const tier = quality.tier;

    // tuned for ACES: the tone-mapped parts land on the drawing's colours on their lit side
    this.hemi = new HemisphereLight(DAY.hemiSky.clone(), DAY.hemiGround.clone(), 0.9 * Math.PI);
    this.sunLight = new DirectionalLight(DAY.sunLight.clone(), 0.65 * Math.PI);
    this.sunLight.position.copy(DEFAULT_SUN);
    this.root.add(this.hemi, this.sunLight, this.sunLight.target);

    const glassShared = { uNight: this.uNight, uSunDir: this.uSunDir, uDusk: this.uDusk, uSweep: this.uSweep };
    this.skyline = new Skyline(tier, glassShared);
    const canopies = createCanopies(tier, { uTime: this.uTime, uNight: this.uNight, uWind: this.uWind });
    this.canopies = canopies;
    this.blossoms = new Blossoms(tier, { uTime: this.uTime, uNight: this.uNight, uSun: this.uSun, uLightDir: this.uLightDir });
    this.pollen = createPollen(tier, { uTime: this.uTime, uNight: this.uNight, uRise: this.uRise }, this.uScale);
    this.sparks = new Sparks({ uTime: this.uTime, uNight: this.uNight }, this.uScale);
    this.hill = createHill(tier);
    this.grounding = createGrounding();
    this.details = new TowerDetails(tier, { uTime: this.uTime, uNight: this.uNight, uScale: this.uScale });
    this.glows = new Glows(tier, { uNight: this.uNight, uDusk: this.uDusk, uScale: this.uScale }, this.blossoms.anchors);

    this.content.add(
      this.hill.mesh,
      this.grounding,
      this.skyline.back,
      this.skyline.front,
      this.details.mesh,
      canopies,
      this.blossoms.mesh,
      this.glows.points,
      this.details.beacon,
      this.pollen,
      this.sparks.points,
    );
    if (this.skyline.softProbe) this.content.add(this.skyline.softProbe);
    this.content.visible = false; // shaders compile (compileAsync) before anything is drawn
    this.root.add(this.content);

    this.blossomScreen = new Float32Array(this.blossoms.list.length * 2);
    this.input = {
      time: 0,
      lastInput: 0,
      cursorActive: false,
      cursorX: 0,
      cursorY: 0,
      tap: false,
      tapX: 0,
      tapY: 0,
      exit: false,
      home: false,
      reduced: true,
      blossomScreen: this.blossomScreen,
      noFly: null,
      viewW: 1,
      viewH: 1,
    };
  }

  // ───────────────────────── lifecycle ─────────────────────────

  attach(a: GardenAttach): () => void {
    this.a = a;
    this.disposed = false;
    this.t0 = performance.now();
    const { renderer, scene, camera } = a;

    this.fov = FOV;
    camera.fov = FOV;
    camera.near = 0.1;
    camera.far = 140;
    camera.updateProjectionMatrix();

    // code-made environment for the metal details, the glass and the gorget, built BEFORE
    // compileAsync so every program compiles once with it (128px on high, 64px on medium)
    try {
      this.env = createGardenEnvironment(renderer, this.quality.tier === "high" ? 128 : 64);
    } catch {
      this.env = null;
    }
    if (this.env) scene.environment = this.env;

    this.bird = new Hummingbird(this.env);
    this.content.add(this.bird.group);
    const world = {
      project: (x: number, y: number, z: number, out: Vec2) => this.project(x, y, z, out),
      unproject: (sx: number, sy: number, zp: number, out: Vec3) => this.unproject(sx, sy, zp, out),
    };
    this.brain = new BirdBrain(
      {
        perch: PERCH,
        start: BIRD_START,
        sipOffset: SIP_OFFSET,
        blossoms: this.blossoms.anchors,
        count: this.blossoms.list.length,
        startBlossom: this.blossoms.startIndex,
        touch: this.quality.touch,
      },
      world,
    );

    this.governor = new LoopGovernor(a.invalidate, a.hero);
    this.dpr = Math.min(window.devicePixelRatio || 1, this.quality.dprCap);
    this.governor.onDecline = () => this.onDecline();
    this.dusk = a.hero.querySelector<HTMLElement>("[data-hero-dusk]");
    this.caption = a.hero.querySelector<HTMLElement>("[data-hero-caption]");

    // motion & theme
    this.motion = getMotion();
    this.nightTarget = getTheme() === "dark" ? 1 : 0;
    this.uNight.value = this.nightTarget;
    this.nightProgress = 1;
    this.lightsOn = this.motion === "full" ? 0.35 : 1;
    this.applyNight(this.nightTarget);
    this.applyMotion(true);

    this.cleanups.push(
      subscribeMotion(() => {
        const m = getMotion();
        if (m !== this.motion) {
          this.motion = m;
          this.applyMotion(false);
        }
      }),
      subscribeTheme(() => {
        const target = getTheme() === "dark" ? 1 : 0;
        if (target === this.nightTarget) return;
        this.nightFrom = this.uNight.value;
        this.nightTarget = target;
        this.nightProgress = this.motion === "full" ? 0 : 1;
        if (this.motion !== "full") this.applyNight(target);
        else this.startSweep();
        this.kick();
      }),
      subscribeScrollFrame(() => this.onScroll()),
    );

    // pointer input on the hero element (passive)
    const hero = a.hero;
    const onMove = (e: PointerEvent) => this.onPointerMove(e);
    const onLeave = () => {
      this.cursorActive = false;
    };
    const onDown = (e: PointerEvent) => {
      this.downX = e.clientX;
      this.downY = e.clientY;
      this.downT = performance.now();
      this.lastInput = this.now();
    };
    const onUp = (e: PointerEvent) => {
      if (e.pointerType === "mouse") return;
      const moved = Math.hypot(e.clientX - this.downX, e.clientY - this.downY);
      if (moved < 12 && performance.now() - this.downT < 450) {
        this.tap = true;
        this.tapX = e.clientX - this.canvasLeft;
        this.tapY = e.clientY - this.canvasTop;
        this.lastInput = this.now();
        this.kick();
      }
    };
    // focus inside the hero cancels the text fade (keyboard users always see what is focused)
    const onFocusIn = () => {
      this.focusInHero = true;
      this.governor?.poke();
    };
    const onFocusOut = (e: FocusEvent) => {
      this.focusInHero = hero.contains(e.relatedTarget as Node | null);
      this.governor?.poke();
    };
    hero.addEventListener("pointermove", onMove, { passive: true });
    hero.addEventListener("pointerleave", onLeave, { passive: true });
    hero.addEventListener("pointerdown", onDown, { passive: true });
    hero.addEventListener("pointerup", onUp, { passive: true });
    hero.addEventListener("focusin", onFocusIn);
    hero.addEventListener("focusout", onFocusOut);
    const canvas = renderer.domElement;
    const onLost = () => a.onLost();
    canvas.addEventListener("webglcontextlost", onLost);
    this.cleanups.push(() => {
      hero.removeEventListener("pointermove", onMove);
      hero.removeEventListener("pointerleave", onLeave);
      hero.removeEventListener("pointerdown", onDown);
      hero.removeEventListener("pointerup", onUp);
      hero.removeEventListener("focusin", onFocusIn);
      hero.removeEventListener("focusout", onFocusOut);
      canvas.removeEventListener("webglcontextlost", onLost);
    });

    this.lastInput = 0;
    this.onScroll();
    this.updateCamera();

    // warm-up behind the poster: compile every program, then reveal. compile() only gathers
    // VISIBLE objects, so the content is visible just for the synchronous traversal inside the
    // call and hidden again until the programs are ready (no frame can draw it half-compiled).
    this.content.visible = true;
    this.sparks.points.visible = true;
    this.glows.points.visible = true;
    this.details.beacon.visible = true;
    if (this.skyline.softProbe) this.skyline.softProbe.visible = true; // the fallback glass, cached before any swap
    const compiling = renderer.compileAsync(scene, camera);
    this.sparks.points.visible = false;
    this.glows.update(this.uNight.value, this.uDusk.value);
    this.details.setNight(this.uNight.value);
    if (this.skyline.softProbe) this.skyline.softProbe.visible = false;
    this.content.visible = false;
    compiling
      .catch(() => undefined)
      .then(() => {
        if (this.disposed) return;
        this.warm = true;
        this.content.visible = true;
        // "lights on": the blossoms open, the sun comes up and a light sweep crosses the glass
        if (this.motion === "full") {
          this.introStart = this.now();
          this.startSweep();
        }
        this.kick();
        a.invalidate();
      });

    return () => this.detach();
  }

  private detach() {
    this.disposed = true;
    for (const c of this.cleanups) c();
    this.cleanups = [];
    this.governor?.dispose();
    this.governor = null;
    this.clearDom();
    if (this.a && this.a.scene.environment === this.env) this.a.scene.environment = null;
    if (this.bird) {
      this.content.remove(this.bird.group);
      this.bird.dispose();
    }
    this.bird = null;
    this.env?.dispose();
    this.env = null;
    this.a = null;
  }

  dispose() {
    this.skyline.dispose();
    this.blossoms.dispose();
    this.sparks.dispose();
    this.details.dispose();
    this.glows.dispose();
    this.pollen.geometry.dispose();
    (this.pollen.material as { dispose(): void }).dispose();
    this.hill.mesh.geometry.dispose();
    (this.hill.mesh.material as { dispose(): void }).dispose();
    this.grounding.geometry.dispose();
    const gm = this.grounding.material as { map?: { dispose(): void } | null; dispose(): void };
    gm.map?.dispose();
    gm.dispose();
    this.canopies.geometry.dispose();
    (this.canopies.material as { dispose(): void }).dispose();
  }

  // ───────────────────────── layout ─────────────────────────

  resize(width: number, height: number) {
    this.W = Math.max(1, width);
    this.H = Math.max(1, height);
    this.framing = heroFraming(this.W, this.H);
    this.updatePointScale();
    this.updateCamera();
    this.measure();
    this.kick();
  }

  /** gl_PointSize scale: drawing-buffer height / (2·tan(fov/2)). */
  private updatePointScale() {
    const h = this.a ? this.a.renderer.getDrawingBufferSize(this.bufSize).y : this.H;
    this.uScale.value = h / (2 * Math.tan((this.fov / 2) * DEG));
  }

  /** Cache DOM rects: canvas offset (pointer mapping), the text no-fly zone, blossom screen positions. */
  private measure() {
    const a = this.a;
    if (!a) return;
    const cr = a.renderer.domElement.getBoundingClientRect();
    this.canvasLeft = cr.left;
    this.canvasTop = cr.top;
    if (a.text) {
      const tr = a.text.getBoundingClientRect();
      this.noFly.x0 = tr.left - cr.left - 24;
      this.noFly.y0 = tr.top - cr.top - 24;
      this.noFly.x1 = tr.right - cr.left + 24;
      this.noFly.y1 = tr.bottom - cr.top + 24;
      this.hasNoFly = tr.width > 0;
    }
    const s = this.tmp2;
    const anchors = this.blossoms.anchors;
    for (let i = 0; i < this.blossoms.list.length; i++) {
      this.project(anchors[i * 3], anchors[i * 3 + 1], anchors[i * 3 + 2], s);
      this.blossomScreen[i * 2] = s.x;
      this.blossomScreen[i * 2 + 1] = s.y;
    }
  }

  private project(x: number, y: number, z: number, out: Vec2) {
    const a = this.a;
    if (!a) return;
    this.v.set(x, y, z).project(a.camera);
    out.x = (this.v.x * 0.5 + 0.5) * this.W;
    out.y = (-this.v.y * 0.5 + 0.5) * this.H;
  }

  private unproject(sx: number, sy: number, zPlane: number, out: Vec3) {
    const a = this.a;
    if (!a) return;
    const cam = a.camera;
    this.v.set((sx / this.W) * 2 - 1, -(sy / this.H) * 2 + 1, 0.5).unproject(cam);
    this.v.sub(cam.position).normalize();
    const dz = this.v.z;
    const t = Math.abs(dz) < 1e-5 ? 0 : (zPlane - cam.position.z) / dz;
    out.x = cam.position.x + this.v.x * t;
    out.y = cam.position.y + this.v.y * t;
    out.z = cam.position.z + this.v.z * t;
  }

  private updateCamera() {
    const a = this.a;
    if (!a) return;
    const f = this.framing;
    const cam = a.camera;
    const full = this.motion === "full";
    let d = f.d;
    if (full && this.golden) {
      // dolly zoom: widen the FOV and move in so the skyline's width at z = 0 stays fixed
      const z = smoothstep(0, 1, this.pS);
      const fov = FOV + (FOV_DUSK - FOV) * z;
      if (Math.abs(fov - this.fov) > 0.01) {
        this.fov = fov;
        cam.fov = fov;
        cam.updateProjectionMatrix();
        this.updatePointScale();
      }
      d = (f.d * HALF_TAN_FOV) / Math.tan((this.fov / 2) * DEG);
      this.look.set(0, f.y, 0);
    } else {
      if (this.fov !== FOV) {
        this.fov = FOV;
        cam.fov = FOV;
        cam.updateProjectionMatrix();
        this.updatePointScale();
      }
      const lean = full ? this.pS : 0;
      this.look.set(0, f.y - 0.4 * lean, -1.5 * lean);
    }
    const cp = Math.cos(this.pitchP);
    cam.position.set(
      this.look.x + d * Math.sin(this.yawP) * cp,
      this.look.y + d * Math.sin(this.pitchP),
      this.look.z + d * Math.cos(this.yawP) * cp,
    );
    cam.lookAt(this.look);
    cam.updateMatrixWorld();
  }

  // ───────────────────────── input ─────────────────────────

  private now(): number {
    return (performance.now() - this.t0) / 1000;
  }

  private kick() {
    if (!this.governor || !this.warm) return;
    if (this.motion === "full") this.governor.setRate(60);
    else this.governor.poke();
  }

  private startSweep() {
    if (this.motion !== "full") return;
    this.sweepStart = this.now();
  }

  private onPointerMove(e: PointerEvent) {
    if (e.pointerType !== "mouse" && e.pointerType !== "pen") return;
    this.cursorX = e.clientX - this.canvasLeft;
    this.cursorY = e.clientY - this.canvasTop;
    this.cursorActive = true;
    this.lastInput = this.now();
    if (this.motion !== "full") return;
    this.brain?.wake(this.now());
    this.governor?.setRate(60);
  }

  /** The tall golden-hour track: live 3D, full motion, ≥ 768px, and the hero switched to it. */
  private trackActive(hero: HTMLElement): boolean {
    return (
      this.motion === "full" &&
      hero.getAttribute("data-track") === "tall" &&
      hero.getAttribute("data-hero") === "live" &&
      window.innerWidth >= 768
    );
  }

  private onScroll() {
    const a = this.a;
    if (!a) return;
    const hero = a.hero;
    const golden = this.trackActive(hero);
    let p: number;
    if (golden) {
      const r = hero.getBoundingClientRect();
      const range = r.height - window.innerHeight;
      p = range > 1 ? Math.min(1, Math.max(0, -r.top / range)) : 0;
    } else {
      p = exitProgress(hero);
    }
    if (golden !== this.golden) {
      this.golden = golden;
      if (!golden) this.clearDom();
    }
    const prevTarget = this.pTarget;
    this.pTarget = p;
    this.measure();
    if (this.motion === "full") {
      if (Math.abs(p - prevTarget) > 1e-4) this.governor?.setRate(60);
    } else if ((prevTarget > 0.15) !== (p > 0.15)) {
      this.governor?.poke();
    }
  }

  private onDecline() {
    if (!this.a) return;
    this.declines++;
    // high tier: trim DPR to 1.5, then drop the costliest pass (transmission glass) before going
    // lower; medium has no such pass, so it goes straight to DPR 1
    const high = this.quality.tier === "high";
    if (high && this.dpr > 1.5) {
      this.dpr = Math.max(1.5, this.dpr - 0.5);
      this.a.setDpr(this.dpr);
    } else if (this.skyline.switchToSoftGlass()) {
      this.a.onDegrade();
    } else if (this.dpr > 1) {
      this.dpr = 1;
      this.a.setDpr(1);
    } else if (this.pollen.visible) {
      this.pollen.visible = false;
    }
  }

  // ───────────────────────── theme, light & motion ─────────────────────────

  private applyNight(n: number) {
    this.uNight.value = n;
    this.hill.color.copy(DAY.hill).lerp(NIGHT.hill, n);
    lawnColor(this.hill.lawn, n);
    this.skyline.setNight(n);
    this.cTmp.copy(DAY.bloom).lerp(NIGHT.bloom, n);
    this.cTmp2.copy(DAY.sun).lerp(NIGHT.sun, n);
    this.blossoms.setColors(this.cTmp, this.cTmp2);
    this.bird?.setNight(n);
    this.details.setNight(n);
    this.applyLights();
  }

  /** Hemisphere + sun from the night amount, the golden-hour light and the intro "lights on". */
  private applyLights() {
    const n = this.uNight.value;
    const amber = this.duskLight * (1 - n);
    const quiet = this.duskLight * n;
    this.hemi.color.copy(DAY.hemiSky).lerp(NIGHT.hemiSky, n).lerp(AMBER_HEMI, amber * 0.7);
    this.hemi.groundColor.copy(DAY.hemiGround).lerp(NIGHT.hemiGround, n);
    this.hemi.intensity = (0.9 - 0.42 * n) * Math.PI * (1 - 0.18 * quiet);
    this.sunLight.color.copy(DAY.sunLight).lerp(NIGHT.sunLight, n).lerp(AMBER_SUN, amber);
    this.sunLight.intensity = (0.65 - 0.39 * n) * Math.PI * this.lightsOn * (1 - 0.3 * quiet);
    this.glows.update(n, this.uDusk.value);
  }

  private applyMotion(initial: boolean) {
    const full = this.motion === "full";
    this.blossoms.uHelio.value = full ? 1 : 0;
    this.uWind.value = full ? 1 : 0;
    const t = this.now();
    if (!full) {
      this.blossoms.uOpen.value = 1.6;
      this.introStart = -1;
      this.sweepStart = -1;
      this.uSweep.value = SWEEP_OFF;
      this.lightsOn = 1;
      this.brain?.snapToPerch(t);
      this.yawP = this.pitchP = 0;
      this.pS = 0;
      this.setDusk(0, 0);
      this.golden = false;
      this.clearDom();
      this.governor?.setRate(0);
      this.updateCamera();
      this.applyLights();
      this.governor?.poke();
    } else {
      if (initial) {
        this.blossoms.uOpen.value = 0;
      } else {
        this.blossoms.uOpen.value = 1.6; // already open; wake everything immediately
        this.lastInput = t;
        this.brain?.wake(t);
      }
      if (this.a) this.onScroll();
      if (this.warm) this.governor?.setRate(60);
    }
  }

  /** Golden-hour amounts: uDusk drives the shaders (windows ripple), duskLight the lights. */
  private setDusk(dusk: number, light: number) {
    if (Math.abs(dusk - this.uDusk.value) < 1e-4 && Math.abs(light - this.duskLight) < 1e-4) return;
    this.uDusk.value = dusk;
    this.duskLight = light;
    this.uRise.value = light;
    this.applyLights();
  }

  /** Text fade, the amber overlay and the caption — style writes only when a value changes. */
  private writeDom(textFade: number, overlay: number, caption: number) {
    const text = this.a?.text;
    if (text && Math.abs(textFade - this.textFade) > 0.002) {
      this.textFade = textFade;
      if (textFade <= 0.002) {
        text.style.opacity = "";
        text.style.transform = "";
        text.style.pointerEvents = "";
      } else {
        text.style.opacity = (1 - textFade).toFixed(3);
        text.style.transform = `translate3d(0, ${(-40 * textFade).toFixed(1)}px, 0)`;
        // nearly invisible links must not catch clicks (keyboard focus still cancels the fade)
        text.style.pointerEvents = textFade > 0.85 ? "none" : "";
      }
    }
    if (this.dusk && Math.abs(overlay - this.overlay) > 0.002) {
      this.overlay = overlay;
      this.dusk.style.opacity = overlay.toFixed(3);
    }
    if (this.caption && Math.abs(caption - this.captionOn) > 0.002) {
      this.captionOn = caption;
      this.caption.style.opacity = caption.toFixed(3);
    }
  }

  private clearDom() {
    const text = this.a?.text;
    if (text) {
      text.style.opacity = "";
      text.style.transform = "";
      text.style.pointerEvents = "";
    }
    if (this.dusk) this.dusk.style.opacity = "";
    if (this.caption) this.caption.style.opacity = "";
    this.textFade = this.overlay = this.captionOn = -1;
  }

  // ───────────────────────── per frame ─────────────────────────

  frame(delta: number) {
    const a = this.a;
    const brain = this.brain;
    const bird = this.bird;
    if (!a || !brain || !bird || !this.governor || !this.warm) return;
    const dt = Math.min(Math.max(delta, 0), 1 / 30);
    const t = this.now();
    const full = this.motion === "full";
    let busy = false;

    // intro: blossoms open in a ripple from tower 4 (uOpen 0 → 1.6 over 1.4 s) while the sun
    // comes up from 0.35 ("lights on")
    if (this.introStart >= 0 && this.warm) {
      const u = Math.min(1, (t - this.introStart) / 1.4);
      this.blossoms.uOpen.value = 1.6 * u;
      this.lightsOn = 0.35 + 0.65 * smoothstep(0, 1, u);
      this.applyLights();
      if (u >= 1) this.introStart = -1;
      else busy = true;
    }

    // light sweep across the facades (1.2 s), on reveal and on every theme switch
    if (this.sweepStart >= 0) {
      const u = (t - this.sweepStart) / 1.2;
      if (u >= 1) {
        this.sweepStart = -1;
        this.uSweep.value = SWEEP_OFF;
      } else {
        this.uSweep.value = SWEEP_FROM + (SWEEP_TO - SWEEP_FROM) * u;
        busy = true;
      }
    }

    // theme: uNight animates over 900 ms
    if (this.nightProgress < 1) {
      this.nightProgress = Math.min(1, this.nightProgress + dt / 0.9);
      const e = this.nightProgress * this.nightProgress * (3 - 2 * this.nightProgress);
      this.applyNight(this.nightFrom + (this.nightTarget - this.nightFrom) * e);
      busy = true;
    }

    // scroll (damped once, here) and cursor parallax (±2° yaw, ±1° pitch)
    if (full) {
      if (Math.abs(this.pS - this.pTarget) > 1e-4) {
        this.pS = damp(this.pS, this.pTarget, 10, dt);
        busy = true;
      } else this.pS = this.pTarget;
      const nx = this.cursorActive ? (this.cursorX / this.W - 0.5) * 2 : 0;
      const ny = this.cursorActive ? (this.cursorY / this.H - 0.5) * 2 : 0;
      const yT = 2 * DEG * Math.max(-1, Math.min(1, nx));
      const pT = -1 * DEG * Math.max(-1, Math.min(1, ny));
      if (Math.abs(this.yawP - yT) + Math.abs(this.pitchP - pT) > 1e-5) {
        this.yawP = damp(this.yawP, yT, 4, dt);
        this.pitchP = damp(this.pitchP, pT, 4, dt);
        busy = true;
      }
    }

    // golden hour / midnight
    const golden = full && this.golden;
    const pS = golden ? this.pS : 0;
    if (golden) {
      const light = smoothstep(0.1, 0.8, pS);
      this.setDusk(Math.min(1, Math.max(0, (pS - 0.25) / 0.65)) * 1.12, light);
      const fade = this.focusInHero ? 0 : smoothstep(0, 0.35, pS);
      this.writeDom(fade, 0.85 * light, smoothstep(0.55, 0.85, pS));
    } else if (this.uDusk.value !== 0 || this.duskLight !== 0) {
      this.setDusk(0, 0);
    }

    // the sun: the scroll owns it past 5 % of the track; otherwise the cursor (z = 1.5, λ = 6)
    if (golden && pS > 0.05) {
      const u = smoothstep(0.1, 0.8, pS);
      const iu = 1 - u;
      // quadratic Bézier: default → control → behind tower 4
      this.sunTarget
        .copy(DEFAULT_SUN)
        .multiplyScalar(iu * iu)
        .addScaledVector(DUSK_CTRL, 2 * iu * u)
        .addScaledVector(DUSK_SUN, u * u);
    } else if (full && this.cursorActive && !this.quality.touch) {
      this.unproject(this.cursorX, this.cursorY, LOOK_SUN_PLANE_Z, this.sunTarget);
      this.sunTarget.y += 0.6;
    } else {
      this.sunTarget.copy(DEFAULT_SUN);
    }
    const sun = this.uSun.value;
    if (sun.distanceToSquared(this.sunTarget) > 1e-5) {
      sun.x = damp(sun.x, this.sunTarget.x, 6, dt);
      sun.y = damp(sun.y, this.sunTarget.y, 6, dt);
      sun.z = damp(sun.z, this.sunTarget.z, 6, dt);
      if (sun.distanceToSquared(this.sunTarget) > 4e-4) busy = true;
    }
    this.v2.set(sun.x, sun.y - 2, sun.z).normalize();
    this.uSunDir.value.copy(this.v2);
    this.uLightDir.value.copy(this.v2);
    this.sunLight.position.copy(this.v2).multiplyScalar(12);

    this.updateCamera();

    // the bird: on the golden-hour track it leaves for #work at 85 %; otherwise at 15 % exit
    const inp = this.input;
    inp.time = t;
    inp.lastInput = this.lastInput;
    inp.cursorActive = this.cursorActive && !this.quality.touch;
    inp.cursorX = this.cursorX;
    inp.cursorY = this.cursorY;
    inp.tap = this.tap;
    inp.tapX = this.tapX;
    inp.tapY = this.tapY;
    this.tap = false;
    const exitNow = golden ? this.pTarget > 0.85 : this.pTarget > 0.15;
    if (exitNow) this.exited = true;
    inp.exit = exitNow;
    inp.home = this.exited && this.pTarget < 0.05;
    if (inp.home) this.exited = false;
    inp.reduced = !full;
    inp.noFly = this.hasNoFly && this.textFade < 0.5 ? this.noFly : null;
    inp.viewW = this.W;
    inp.viewH = this.H;
    brain.update(dt, inp);
    const pose = brain.pose;
    if (bird.apply(pose, t, dt, !full)) busy = true;

    if (pose.sipStarted && pose.sipIndex >= 0) {
      const an = this.blossoms.anchors;
      const i = pose.sipIndex;
      this.sparks.burst(an[i * 3], an[i * 3 + 1] + 0.05, an[i * 3 + 2] + 0.05);
    }
    if (pose.sipIndex >= 0) this.blossoms.bobAt(pose.sipIndex, 0.8 * pose.billDip + 0.2);
    if (this.blossoms.decay(dt)) busy = true;
    if (this.sparks.update(dt)) busy = true;

    // shader time only advances while awake
    if (full) this.uTime.value += dt;

    // render governor: 60 while anything moves, 30 hovering idle, 0 when perched and settled
    if (!full) this.governor.setRate(0);
    else this.governor.setRate(busy ? 60 : pose.wantFps);

    if (this.warm && !this.readySent) {
      this.readySent = true;
      requestAnimationFrame(() => {
        if (!this.disposed) a.onReady();
      });
    }
  }
}
