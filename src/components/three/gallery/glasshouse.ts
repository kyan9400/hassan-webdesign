import {
  Color,
  DirectionalLight,
  Group,
  HemisphereLight,
  Quaternion,
  Raycaster,
  Vector2,
  Vector3,
  type Intersection,
  type Mesh,
  type Object3D,
  type PerspectiveCamera,
  type Scene,
  type Texture,
  type WebGLRenderer,
} from "three";
import type { ProjectCard as Project, Sector } from "@/data/sectors";
import { work } from "@/data/site";
import type { Quality } from "@/lib/quality";
import { LoopGovernor } from "@/lib/loop-governor";
import { getMotion, subscribeMotion, type Motion } from "@/lib/motion";
import { getTheme, subscribeTheme } from "@/lib/theme";
import { subscribeScrollFrame } from "@/lib/scroll-progress";
import { getGallery, setGalleryHover, subscribeGallery } from "@/lib/gallery-store";
import { clamp, damp } from "@/lib/damp";
import { BirdBrain, type BirdInput, type Vec2, type Vec3 } from "../bird/birdBrain";
import { Hummingbird } from "../bird/Hummingbird";
import { BIRD_SCALE } from "../bird/hummingbird-geometry";
import { createGardenEnvironment } from "../hero/environment";
import { Sparks } from "../hero/Pollen";
import {
  CAMERA_Y,
  FOV,
  HALF_TAN,
  MAX_PANES,
  PANE_H,
  PANE_W,
  PHONE,
  PHONE_RANGE,
  PRESENT_DISTANCE,
  PRESENT_EXTENT,
  R,
  THETA,
  VISIBLE_RANGE,
  cameraDistance,
  walkTarget,
} from "./arrangement";
import { Pane, createPaneGeometries, type PaneGeometries } from "./Pane";
import { Frames } from "./Frames";
import { VineRail, railPoint } from "./VineRail";
import { createPlaceholder, createShadowTexture, disposeShot, loadShot, whenFontsReady } from "./textures";

/**
 * GlasshouseController — the imperative core of "The Glasshouse" (SPEC §6). Plain TypeScript; the
 * React wrapper creates it, hands it the renderer and calls `frame()` from useFrame. Scroll is the
 * single source of truth: s* = progress·(n − 1) is read once per scroll frame and damped HERE, once
 * (s += (s* − s)(1 − e^(−8dt))) — the only smoothing layer. Everything per frame works on
 * preallocated objects and uniforms; nothing re-renders React.
 */

export type GalleryShotFlags = { hasDesktop: boolean; hasMobile: boolean };

export type GlassAttach = {
  renderer: WebGLRenderer;
  scene: Scene;
  camera: PerspectiveCamera;
  invalidate: () => void;
  setDpr: (dpr: number) => void;
  /** the pinned block (scroll range) */
  block: HTMLElement;
  /** the sticky 100svh stage inside it */
  sticky: HTMLElement;
  /** pointer surface (the stage cell) */
  stage: HTMLElement;
  /** the stage cell right of the index column: the wall is centred in it */
  cell: HTMLElement | null;
  onReady: () => void;
  onLost: () => void;
  onOpen: (slug: string) => void;
  /** travel to a slot of the filtered list (scrolls the page) */
  onTravel: (slot: number) => void;
};

const DAY_BG = new Color("#E7EFE3");
const NIGHT_BG = new Color("#13221A");
const DAY_HEMI_SKY = new Color("#FFFFFF").lerp(new Color("#8FD3E8"), 0.25);
const DAY_HEMI_GROUND = new Color("#FFFFFF").lerp(new Color("#2F7D4F"), 0.45);
const NIGHT_HEMI_SKY = new Color("#2E6F86");
const NIGHT_HEMI_GROUND = new Color("#13221A");
const LOOK_Y = -0.12;
/** 0.6 × the hero bird: ~45 px long at the wall on a 1080p screen */
const BIRD_GALLERY_SCALE = BIRD_SCALE * 0.6;
const Y_AXIS = new Vector3(0, 1, 0);

type PaneState = "none" | "loading" | "done" | "missing";

export class GlasshouseController {
  readonly root = new Group();
  private readonly content = new Group();
  /** slot space: rotation.y = s·θ */
  private readonly wall = new Group();
  private readonly quality: Quality;
  private readonly projects: Project[];
  private readonly flags: GalleryShotFlags[];

  // shared uniforms
  private readonly uTime = { value: 0 };
  private readonly uNight = { value: 0 };
  private readonly uBg = { value: DAY_BG.clone() };
  private readonly uScale = { value: 800 };
  /** the walk position (s), for the panes' travelling reflection streak */
  private readonly uWalk = { value: 0 };

  // parts
  private readonly geo: PaneGeometries;
  private readonly panes: Pane[];
  private readonly frames: Frames;
  private readonly vine: VineRail;
  private readonly sparks: Sparks;
  private readonly hemi: HemisphereLight;
  private readonly sun: DirectionalLight;
  private readonly shadowTex: Texture;
  private bird: Hummingbird | null = null;
  private brain: BirdBrain | null = null;
  private env: Texture | null = null;

  // environment
  private a: GlassAttach | null = null;
  private governor: LoopGovernor | null = null;
  private cleanups: (() => void)[] = [];
  private disposed = false;
  private warm = false;
  private readySent = false;
  private t0 = 0;

  // layout
  private W = 1;
  private H = 1;
  private canvasLeft = 0;
  private canvasTop = 0;
  /** stage cell, canvas px */
  private cellLeft = 0;
  private cellRight = 1;
  private dist = 7.2;

  // arrangement state
  private motion: Motion = "reduced";
  private filter: Sector | "all" = "all";
  private order: number[] = [];
  private n = MAX_PANES;
  private nDamped = MAX_PANES;
  private s = 0;
  private sTarget = 0;
  private growMax = 0;
  private settleT = -10;
  private presentIdx = -1;
  private presentAmount = 0;
  private sipToken = 0;
  private lastInput = -10;
  private visited: readonly string[] = [];
  private readonly openTarget: Float32Array;
  private readonly openValue: Float32Array;
  private dirtyBlossoms = true;

  // theme
  private nightTarget = 0;
  private nightFrom = 0;
  private nightProgress = 1;

  // pointer
  private hoverIdx = -1;
  private readonly hoverUv = new Vector2(0.5, 0.5);
  private pointerDown = false;
  private downX = 0;
  private downY = 0;
  private downT = 0;
  private lastDragX = 0;
  private dragMoved = 0;
  private dpr = 1;

  // textures
  private readonly desktopWidth: number;
  private anisotropy = 4;
  private loadSlot = -1;

  // bird
  private readonly perch: Vec3 = { x: 0, y: 0, z: 0 };
  private readonly anchors: Float32Array;
  private readonly input: BirdInput;

  // scratch
  private readonly v = new Vector3();
  private readonly v2 = new Vector3();
  private readonly arcPos = new Vector3();
  private readonly arcQuat = new Quaternion();
  private readonly presPos = new Vector3();
  private readonly presQuat = new Quaternion();
  private presScale = 1;
  private readonly look = new Vector3();
  private readonly ray = new Raycaster();
  private readonly ndc = new Vector2();
  private readonly hits: Intersection<Object3D>[] = [];
  private readonly targets: Mesh[] = [];
  private readonly cTmp = new Color();
  private readonly bufSize = new Vector2();

  constructor(quality: Quality, projects: Project[], flags: GalleryShotFlags[]) {
    this.quality = quality;
    this.projects = projects;
    this.flags = flags;
    this.desktopWidth = quality.tier === "high" ? 1080 : 828;

    // tuned for ACES tone mapping (as the hero)
    this.hemi = new HemisphereLight(DAY_HEMI_SKY.clone(), DAY_HEMI_GROUND.clone(), 0.9 * Math.PI);
    this.sun = new DirectionalLight(new Color("#FFF4E0"), 0.65 * Math.PI);
    this.sun.position.set(2, 6, 4);
    this.root.add(this.hemi, this.sun);

    this.geo = createPaneGeometries();
    const shared = { uBg: this.uBg, uNight: this.uNight, uWalk: this.uWalk };
    this.panes = projects.map((p, i) => {
      const f = flags[i];
      const place = createPlaceholder(p, "desktop", f.hasDesktop ? work.screenshotLoading : work.screenshotSoon);
      const phonePlace = createPlaceholder(p, "mobile", "");
      const pane = new Pane(i, p, this.geo, place, phonePlace, shared);
      pane.desktopState = f.hasDesktop ? "none" : "missing";
      pane.mobileState = f.hasMobile ? "none" : "missing";
      this.content.add(pane.group);
      return pane;
    });

    this.shadowTex = createShadowTexture();
    this.frames = new Frames(this.shadowTex);
    this.vine = new VineRail(projects, quality.tier === "high" ? 120 : 80, { uTime: this.uTime, uNight: this.uNight, uScale: this.uScale });
    this.sparks = new Sparks({ uTime: this.uTime, uNight: this.uNight }, this.uScale);
    this.wall.add(this.vine.group);
    this.content.add(this.frames.shadows, this.frames.mullions, this.frames.ribs, this.wall, this.sparks.points);
    this.content.visible = false;
    this.root.add(this.content);

    this.openTarget = new Float32Array(projects.length);
    this.openValue = new Float32Array(projects.length);
    this.anchors = new Float32Array(projects.length * 3);
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
      blossomScreen: new Float32Array(projects.length * 2),
      noFly: null,
      viewW: 1,
      viewH: 1,
      focus: -1,
      sipToken: 0,
    };

    whenFontsReady(() => {
      if (this.disposed) return;
      for (const p of this.panes) {
        p.place.redraw();
        p.phonePlace.redraw();
      }
      this.governor?.poke();
    });
  }

  // ───────────────────────── lifecycle ─────────────────────────

  attach(a: GlassAttach): () => void {
    this.a = a;
    this.disposed = false;
    this.t0 = performance.now();
    const { renderer, scene, camera } = a;
    camera.fov = FOV;
    camera.near = 0.1;
    camera.far = 60;
    this.anisotropy = Math.min(this.quality.tier === "high" ? 8 : 4, renderer.capabilities.getMaxAnisotropy());

    // the same code-made environment as the hero (64px on medium): metal mullions and the gorget
    try {
      this.env = createGardenEnvironment(renderer, this.quality.tier === "high" ? 128 : 64);
    } catch {
      this.env = null;
    }
    if (this.env) scene.environment = this.env;
    this.bird = new Hummingbird(this.env);
    this.bird.group.scale.setScalar(BIRD_GALLERY_SCALE);
    this.content.add(this.bird.group);
    const world = {
      project: (x: number, y: number, z: number, out: Vec2) => this.project(x, y, z, out),
      unproject: (sx: number, sy: number, zp: number, out: Vec3) => this.unproject(sx, sy, zp, out),
    };
    this.brain = new BirdBrain(
      {
        perch: this.perch,
        start: { x: 0, y: -1, z: -R + 0.6 },
        // like the hero (scaled 0.6): below-right of the flower, the bill angled up into it
        sipOffset: { x: 0.19, y: -0.12, z: 0.1 },
        // waiting beside the active pane's blossom, under the glass so it never covers a screenshot
        hoverOffset: { x: 0.4, y: 0.04, z: 0.3 },
        blossoms: this.anchors,
        count: this.projects.length,
        startBlossom: 0,
        touch: false,
        rail: true,
        idlePerch: 4,
        sipAfter: 0.3,
      },
      world,
    );

    this.governor = new LoopGovernor(a.invalidate, a.sticky);
    this.dpr = Math.min(window.devicePixelRatio || 1, this.quality.dprCap);
    this.governor.onDecline = () => this.onDecline();

    this.motion = getMotion();
    this.nightTarget = getTheme() === "dark" ? 1 : 0;
    this.nightProgress = 1;
    this.applyNight(this.nightTarget);

    const g = getGallery();
    this.visited = g.visited;
    this.applyFilter(g.filter, true);
    this.applyVisited(true);

    this.cleanups.push(
      subscribeMotion(() => {
        const m = getMotion();
        if (m === this.motion) return;
        this.motion = m;
        this.lastInput = this.now();
        if (m !== "full") this.cutAll();
        this.kick();
      }),
      subscribeTheme(() => {
        const target = getTheme() === "dark" ? 1 : 0;
        if (target === this.nightTarget) return;
        this.nightFrom = this.uNight.value;
        this.nightTarget = target;
        this.nightProgress = this.motion === "full" ? 0 : 1;
        if (this.motion !== "full") this.applyNight(target);
        this.kick();
      }),
      subscribeGallery(() => {
        const st = getGallery();
        if (st.filter !== this.filter) {
          this.applyFilter(st.filter, this.motion !== "full");
          this.lastInput = this.now();
          this.onScroll();
          this.kick();
        }
        if (st.visited !== this.visited) {
          this.visited = st.visited;
          this.applyVisited(this.motion !== "full");
          this.kick();
        }
      }),
      subscribeScrollFrame(() => this.onScroll()),
    );

    // pointer input on the stage cell (passive; the canvas itself ignores pointer events)
    const stage = a.stage;
    const onMove = (e: PointerEvent) => this.onPointerMove(e);
    const onLeave = () => this.setHover(-1);
    const onDown = (e: PointerEvent) => this.onPointerDown(e);
    const onUp = (e: PointerEvent) => this.onPointerUp(e);
    stage.addEventListener("pointermove", onMove, { passive: true });
    stage.addEventListener("pointerleave", onLeave, { passive: true });
    stage.addEventListener("pointerdown", onDown);
    stage.addEventListener("pointerup", onUp);
    stage.addEventListener("pointercancel", onUp);
    const canvas = renderer.domElement;
    const onLost = () => a.onLost();
    canvas.addEventListener("webglcontextlost", onLost);
    this.cleanups.push(() => {
      stage.removeEventListener("pointermove", onMove);
      stage.removeEventListener("pointerleave", onLeave);
      stage.removeEventListener("pointerdown", onDown);
      stage.removeEventListener("pointerup", onUp);
      stage.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("webglcontextlost", onLost);
      stage.style.cursor = "";
    });

    this.measure();
    this.onScroll();
    this.s = this.motion === "full" ? this.sTarget : Math.round(this.sTarget);
    this.growMax = this.s + 1;
    this.updateCamera();
    this.layout(0, true);
    this.brain.snapToPerch(0);

    // warm-up behind the poster: the first panes' screenshots + every program, then reveal
    const first = Math.round(this.sTarget);
    const firstLoads: Promise<void>[] = [];
    for (let k = first - 1; k <= first + 1; k++) {
      const i = this.order[k];
      if (i !== undefined) firstLoads.push(this.loadDesktop(i));
    }
    const i0 = this.order[first];
    if (i0 !== undefined) firstLoads.push(this.loadMobile(i0));
    const timeout = new Promise<void>((resolve) => setTimeout(resolve, 2500));
    Promise.race([Promise.all(firstLoads).then(() => undefined), timeout])
      .then(() => {
        if (this.disposed) return undefined;
        // compile() only gathers visible objects: visible for the synchronous traversal only
        this.content.visible = true;
        this.sparks.points.visible = true;
        for (const p of this.panes) p.group.visible = true;
        const compiling = renderer.compileAsync(scene, camera);
        this.sparks.points.visible = false;
        this.content.visible = false;
        return compiling;
      })
      .catch(() => undefined)
      .then(() => {
        if (this.disposed) return;
        this.warm = true;
        this.content.visible = true;
        this.layout(0, true);
        this.loadAround(true);
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
    if (this.hoverIdx !== -1) setGalleryHover(-1);
    if (this.bird) {
      this.content.remove(this.bird.group);
      this.bird.dispose();
    }
    this.bird = null;
    this.brain = null;
    if (this.a && this.a.scene.environment === this.env) this.a.scene.environment = null;
    this.env?.dispose();
    this.env = null;
    this.a = null;
  }

  dispose() {
    this.disposed = true;
    // GPU copies only: the decoded bitmaps stay with the panes (React may remount this controller in
    // development, and three re-uploads from them); they are released with the controller
    for (const p of this.panes) {
      p.desktop?.dispose();
      p.mobile?.dispose();
      p.dispose();
    }
    this.geo.pane.dispose();
    this.geo.phone.dispose();
    this.frames.dispose();
    this.vine.dispose();
    this.sparks.dispose();
    this.shadowTex.dispose();
  }

  // ───────────────────────── layout ─────────────────────────

  resize(width: number, height: number) {
    this.W = Math.max(1, width);
    this.H = Math.max(1, height);
    this.measure();
    this.updatePointScale();
    this.updateCamera();
    this.kick();
  }

  private updatePointScale() {
    const h = this.a ? this.a.renderer.getDrawingBufferSize(this.bufSize).y : this.H;
    this.uScale.value = h / (2 * HALF_TAN);
  }

  private measure() {
    const a = this.a;
    if (!a) return;
    const cr = a.renderer.domElement.getBoundingClientRect();
    this.canvasLeft = cr.left;
    this.canvasTop = cr.top;
    if (a.cell && a.cell.offsetWidth > 0) {
      const r = a.cell.getBoundingClientRect();
      this.cellLeft = clamp(r.left - cr.left, 0, this.W * 0.6);
      this.cellRight = clamp(r.right - cr.left, this.cellLeft + 1, this.W);
    } else {
      this.cellLeft = 0;
      this.cellRight = this.W;
    }
    const cellAspect = (this.cellRight - this.cellLeft) / this.H;
    this.dist = cameraDistance(cellAspect);
  }

  private updateCamera() {
    const a = this.a;
    if (!a) return;
    const cam = a.camera;
    cam.aspect = this.W / this.H;
    // shift the principal point so the wall is centred in the stage cell right of the index column
    const shift = (this.cellLeft + this.cellRight) / 2 - this.W / 2;
    cam.setViewOffset(this.W, this.H, -shift, 0, this.W, this.H);
    cam.position.set(0, CAMERA_Y, -R + this.dist);
    this.look.set(0, LOOK_Y, -R);
    cam.lookAt(this.look);
    cam.updateProjectionMatrix();
    cam.updateMatrixWorld();
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
    const t = Math.abs(this.v.z) < 1e-5 ? 0 : (zPlane - cam.position.z) / this.v.z;
    out.x = cam.position.x + this.v.x * t;
    out.y = cam.position.y + this.v.y * t;
    out.z = cam.position.z + this.v.z * t;
  }

  /** Where the presented pane goes: left of the panel, squared up to the camera, ~52 % wide. */
  private computePresent() {
    const a = this.a;
    if (!a) return;
    const cam = a.camera;
    const vw = window.innerWidth;
    const panelW = clamp(vw * 0.44, 420, 640);
    const freeRight = clamp(vw - panelW - this.canvasLeft, this.W * 0.3, this.W);
    const visH = 2 * PRESENT_DISTANCE * HALF_TAN;
    const wpp = visH / this.H; // world units per px at that depth
    const combined = PRESENT_EXTENT.right - PRESENT_EXTENT.left;
    let k = Math.min(0.88 * freeRight, 0.6 * this.W) * wpp / combined;
    k = Math.min(k, (0.6 * visH) / PANE_H);
    // centre of the pane+phone group in the free region, then back to the pane centre
    const groupCentre = (PRESENT_EXTENT.left + PRESENT_EXTENT.right) / 2;
    const sx = freeRight / 2 - (groupCentre * k) / wpp;
    const sy = this.H * 0.48;
    this.v.set((sx / this.W) * 2 - 1, -(sy / this.H) * 2 + 1, 0.5).unproject(cam).sub(cam.position).normalize();
    cam.getWorldDirection(this.v2);
    const t = PRESENT_DISTANCE / Math.max(this.v.dot(this.v2), 0.2);
    this.presPos.copy(cam.position).addScaledVector(this.v, t);
    this.presQuat.copy(cam.quaternion);
    this.presScale = k;
  }

  // ───────────────────────── state changes ─────────────────────────

  private now(): number {
    return (performance.now() - this.t0) / 1000;
  }

  private kick() {
    if (!this.governor || !this.warm) return;
    if (this.motion === "full") this.governor.setRate(60);
    else this.governor.poke();
  }

  private applyFilter(filter: Sector | "all", instant: boolean) {
    this.filter = filter;
    this.order = [];
    this.projects.forEach((p, i) => {
      if (filter === "all" || p.sector === filter) this.order.push(i);
    });
    this.n = Math.max(1, this.order.length);
    for (const p of this.panes) {
      const slot = this.order.indexOf(p.index);
      p.inFilter = slot >= 0;
      if (slot >= 0) p.slotTarget = slot;
      p.visTarget = slot >= 0 ? 1 : 0;
      if (instant) {
        p.slot = p.slotTarget;
        p.vis = p.visTarget;
      }
    }
    if (instant) this.nDamped = this.n;
    this.growMax = 0;
    this.loadSlot = -1;
    this.dirtyBlossoms = true;
  }

  private applyVisited(instant: boolean) {
    this.projects.forEach((p, i) => {
      this.openTarget[i] = this.visited.includes(p.slug) ? 1 : 0;
      if (instant) {
        this.openValue[i] = this.openTarget[i];
        this.vine.setOpen(i, this.openValue[i]);
      }
    });
  }

  /** Open / close the presented pane (null = panel closed). */
  setPresent(slug: string | null) {
    const idx = slug ? this.projects.findIndex((p) => p.slug === slug) : -1;
    if (idx === this.presentIdx) return;
    this.presentIdx = idx;
    for (const p of this.panes) p.presTarget = p.index === idx ? 1 : 0;
    if (idx >= 0) {
      this.sipToken++;
      void this.loadDesktop(idx);
      void this.loadMobile(idx);
      this.setHover(-1);
    }
    this.lastInput = this.now();
    if (this.motion !== "full") this.cutAll();
    this.kick();
  }

  /** Reduced motion: every change is a cut. */
  private cutAll() {
    this.s = Math.round(this.sTarget);
    this.nDamped = this.n;
    this.presentAmount = this.presentIdx >= 0 ? 1 : 0;
    for (const p of this.panes) {
      p.slot = p.slotTarget;
      p.vis = p.visTarget;
      p.pres = p.presTarget;
      p.tiltX = p.tiltY = p.lift = p.hover = p.phoneOut = 0;
      if (p.desktop) p.reveal = 1;
      if (p.mobile) p.phoneReveal = 1;
    }
    for (let i = 0; i < this.openValue.length; i++) {
      this.openValue[i] = this.openTarget[i];
      this.vine.setOpen(i, this.openValue[i]);
    }
    this.settleT = -10;
    this.dirtyBlossoms = true;
  }

  private onScroll() {
    const a = this.a;
    if (!a) return;
    const r = a.block.getBoundingClientRect();
    const range = r.height - a.sticky.offsetHeight;
    const progress = range > 1 ? clamp(-r.top / range, 0, 1) : 0;
    const target = walkTarget(progress, this.n);
    this.measureCanvasOnly();
    if (Math.abs(target - this.sTarget) > 1e-4) {
      const slotChanged = Math.round(target) !== Math.round(this.sTarget);
      this.sTarget = target;
      this.lastInput = this.now();
      // reduced motion cuts to whole panes: only a slot change needs a frame
      if (this.motion === "full" || slotChanged) this.kick();
    }
  }

  private measureCanvasOnly() {
    const a = this.a;
    if (!a) return;
    const cr = a.renderer.domElement.getBoundingClientRect();
    this.canvasLeft = cr.left;
    this.canvasTop = cr.top;
  }

  private onDecline() {
    if (!this.a) return;
    if (this.dpr > 1) {
      this.dpr = this.quality.tier === "high" ? Math.max(1, this.dpr - 0.25) : 1;
      this.a.setDpr(this.dpr);
    } else if (this.vine.motes.visible) {
      this.vine.motes.visible = false;
    }
  }

  private applyNight(n: number) {
    this.uNight.value = n;
    this.uBg.value.copy(DAY_BG).lerp(NIGHT_BG, n);
    this.hemi.color.copy(DAY_HEMI_SKY).lerp(NIGHT_HEMI_SKY, n);
    this.hemi.groundColor.copy(DAY_HEMI_GROUND).lerp(NIGHT_HEMI_GROUND, n);
    this.hemi.intensity = (0.9 - 0.42 * n) * Math.PI;
    this.sun.intensity = (0.65 - 0.39 * n) * Math.PI;
    this.frames.setNight(n);
    this.vine.setNight(n);
    this.bird?.setNight(n);
  }

  // ───────────────────────── textures ─────────────────────────

  private loadDesktop(i: number): Promise<void> {
    const pane = this.panes[i];
    if (!pane || pane.desktopState !== "none") return Promise.resolve();
    pane.desktopState = "loading";
    return loadShot(pane.project.screenshots.desktop, this.desktopWidth, this.anisotropy).then((tex) => {
      if (this.disposed) {
        disposeShot(tex);
        return;
      }
      if (!tex) {
        pane.desktopState = "missing";
        pane.place.setStatus(work.screenshotSoon);
        this.governor?.poke();
        return;
      }
      const r = this.a?.renderer;
      if (r) {
        r.initTexture(tex);
        // the GPU has its copy and nothing re-uploads in production: free the decoded bitmap
        if (process.env.NODE_ENV === "production") (tex.source.data as ImageBitmap | null)?.close?.();
      }
      pane.setDesktop(tex);
      pane.desktopState = "done";
      pane.reveal = this.motion === "full" && this.warm ? 0 : 1;
      this.kick();
    });
  }

  private loadMobile(i: number): Promise<void> {
    const pane = this.panes[i];
    if (!pane || pane.mobileState !== "none") return Promise.resolve();
    pane.mobileState = "loading";
    return loadShot(pane.project.screenshots.mobile, 384, this.anisotropy).then((tex) => {
      if (this.disposed || pane.mobileState !== "loading") {
        disposeShot(tex);
        return;
      }
      if (!tex) {
        pane.mobileState = "missing";
        return;
      }
      const r = this.a?.renderer;
      if (r) {
        r.initTexture(tex);
        // the GPU has its copy and nothing re-uploads in production: free the decoded bitmap
        if (process.env.NODE_ENV === "production") (tex.source.data as ImageBitmap | null)?.close?.();
      }
      pane.setMobile(tex);
      pane.mobileState = "done";
      pane.phoneReveal = this.motion === "full" && this.warm ? 0 : 1;
      this.kick();
    });
  }

  /** Desktop shots within ±3 of the walk (idle time), phone shots for active ±1; far phones are freed. */
  private loadAround(force = false) {
    const centre = Math.round(this.s);
    if (!force && centre === this.loadSlot) return;
    this.loadSlot = centre;
    const w = window as Window & { requestIdleCallback?: (cb: () => void, o?: { timeout: number }) => number };
    const idle = (cb: () => void) => (w.requestIdleCallback ? w.requestIdleCallback(cb, { timeout: 1200 }) : setTimeout(cb, 120));
    for (let k = centre - 3; k <= centre + 3; k++) {
      const i = this.order[k];
      if (i === undefined) continue;
      if (Math.abs(k - centre) <= 1) void this.loadDesktop(i);
      else idle(() => void this.loadDesktop(i));
    }
    for (const p of this.panes) {
      const d = p.inFilter ? Math.abs(p.slotTarget - centre) : Infinity;
      if (d <= 1 || p.index === this.presentIdx) void this.loadMobile(p.index);
      else if (d > 2.5 && p.mobileState !== "missing" && p.mobileState !== "none") {
        disposeShot(p.mobile);
        p.setMobile(null);
        p.mobileState = "none";
      }
    }
  }

  // ───────────────────────── pointer ─────────────────────────

  private toNdc(e: PointerEvent) {
    this.ndc.set(((e.clientX - this.canvasLeft) / this.W) * 2 - 1, -((e.clientY - this.canvasTop) / this.H) * 2 + 1);
  }

  private pick(e: PointerEvent): { index: number; u: number; v: number } | null {
    const a = this.a;
    if (!a || !this.warm) return null;
    this.toNdc(e);
    this.ray.setFromCamera(this.ndc, a.camera);
    this.targets.length = 0;
    for (const p of this.panes) if (p.group.visible && p.inFilter && p.vis > 0.5) this.targets.push(p.mesh);
    this.hits.length = 0;
    this.ray.intersectObjects(this.targets, false, this.hits);
    const h = this.hits[0];
    if (!h || !h.uv) return null;
    const pane = this.panes.find((p) => p.mesh === h.object);
    return pane ? { index: pane.index, u: h.uv.x, v: h.uv.y } : null;
  }

  private setHover(i: number) {
    if (i === this.hoverIdx) return;
    this.hoverIdx = i;
    setGalleryHover(i);
    if (this.a) this.a.stage.style.cursor = i >= 0 ? "pointer" : "";
    this.kick();
  }

  private onPointerMove(e: PointerEvent) {
    if (e.pointerType === "touch" || this.presentIdx >= 0) return;
    this.lastInput = this.now();
    if (this.pointerDown) {
      const dx = e.clientX - this.lastDragX;
      this.lastDragX = e.clientX;
      this.dragMoved += Math.abs(dx);
      if (this.dragMoved > 6 && dx !== 0) this.dragBy(dx);
      return;
    }
    const hit = this.pick(e);
    this.setHover(hit ? hit.index : -1);
    if (hit) this.hoverUv.set(hit.u, hit.v);
    if (this.motion === "full") this.kick();
  }

  /** Drag → window.scrollBy: Δs = −Δx / (paneWidthPx · 0.9). Scroll stays the single source of truth. */
  private dragBy(dx: number) {
    const a = this.a;
    if (!a || this.n < 2) return;
    const paneWidthPx = (PANE_W * this.H) / (2 * this.dist * HALF_TAN);
    const ds = -dx / (paneWidthPx * 0.9);
    const range = a.block.offsetHeight - a.sticky.offsetHeight;
    const pxPerSlot = range / (this.n - 1);
    window.scrollBy({ top: ds * pxPerSlot, behavior: "instant" });
  }

  private onPointerDown(e: PointerEvent) {
    if (e.button !== 0 || e.pointerType === "touch" || this.presentIdx >= 0) return;
    this.pointerDown = true;
    this.downX = this.lastDragX = e.clientX;
    this.downY = e.clientY;
    this.downT = performance.now();
    this.dragMoved = 0;
    try {
      (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  private onPointerUp(e: PointerEvent) {
    if (!this.pointerDown) return;
    this.pointerDown = false;
    try {
      (e.currentTarget as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (e.type === "pointercancel") return;
    const moved = Math.hypot(e.clientX - this.downX, e.clientY - this.downY);
    if (moved > 6 || performance.now() - this.downT > 600) return;
    const hit = this.pick(e);
    if (!hit || !this.a) return;
    const pane = this.panes[hit.index];
    const activeSlot = Math.round(this.s);
    if (Math.round(pane.slotTarget) === activeSlot) this.a.onOpen(pane.project.slug);
    else this.a.onTravel(pane.slotTarget);
  }

  // ───────────────────────── per frame ─────────────────────────

  /** Pose every pane, frame, rib and blossom for the current state. Returns true while moving. */
  private layout(dt: number, instant = false): boolean {
    const a = this.a;
    if (!a) return false;
    const full = this.motion === "full" && !instant;
    const t = this.now();
    let busy = false;

    // the walk: s damped toward s* (λ = 8) — under reduced motion it cuts to whole panes
    const sGoal = this.motion === "full" ? this.sTarget : Math.round(this.sTarget);
    if (full) {
      if (Math.abs(this.s - sGoal) > 1e-4) {
        this.s = damp(this.s, sGoal, 8, dt);
        busy = true;
      } else this.s = sGoal;
    } else this.s = sGoal;
    this.uWalk.value = this.s;

    // filter re-flow (600 ms) and scale in / out (400 ms)
    let reflow = false;
    for (const p of this.panes) {
      if (full) {
        if (Math.abs(p.slot - p.slotTarget) > 1e-3) {
          p.slot = damp(p.slot, p.slotTarget, 8, dt);
          reflow = true;
        } else p.slot = p.slotTarget;
        if (Math.abs(p.vis - p.visTarget) > 1e-3) {
          p.vis = damp(p.vis, p.visTarget, 11, dt);
          reflow = true;
        } else p.vis = p.visTarget;
      } else {
        p.slot = p.slotTarget;
        p.vis = p.visTarget;
      }
    }
    if (full && Math.abs(this.nDamped - this.n) > 1e-3) {
      this.nDamped = damp(this.nDamped, this.n, 8, dt);
      reflow = true;
    } else this.nDamped = this.n;
    if (reflow) {
      busy = true;
      this.dirtyBlossoms = true;
    }

    // gentle life: the arc breathes ±0.02 rad for 2 s after a move, then settles (full motion only)
    const movingNow = busy;
    if (movingNow) this.settleT = t;
    let breathe = 0;
    if (this.motion === "full" && !movingNow && this.settleT > 0) {
      const e = t - this.settleT;
      if (e < 2) {
        breathe = 0.02 * Math.sin(Math.PI * e) * (1 - e / 2);
        busy = true;
      }
    }

    // present (900 ms, critically damped feel) and the others' fade
    const presGoal = this.presentIdx >= 0 ? 1 : 0;
    if (full && Math.abs(this.presentAmount - presGoal) > 1e-3) {
      this.presentAmount = damp(this.presentAmount, presGoal, 5, dt);
      busy = true;
    } else this.presentAmount = presGoal;
    let presenting = this.presentAmount > 0;
    for (let i = 0; !presenting && i < this.panes.length; i++) presenting = this.panes[i].pres > 0;
    if (presenting) this.computePresent();

    const activeSlot = Math.round(this.s);
    const tiltOn = this.motion === "full" && this.presentIdx < 0;

    for (const p of this.panes) {
      // present amount for this pane
      if (full && Math.abs(p.pres - p.presTarget) > 1e-3) {
        p.pres = damp(p.pres, p.presTarget, 5, dt);
        busy = true;
      } else p.pres = p.presTarget;
      const pe = p.pres * p.pres * (3 - 2 * p.pres);

      // hover: tilt toward the pointer on the active pane, lift neighbours (λ = 10)
      const hovered = this.hoverIdx === p.index;
      const isActive = p.inFilter && Math.round(p.slotTarget) === activeSlot;
      const tX = tiltOn && hovered && isActive ? -(this.hoverUv.y - 0.5) * 0.1 : 0;
      const tY = tiltOn && hovered && isActive ? (this.hoverUv.x - 0.5) * 0.14 : 0;
      const lift = tiltOn && hovered ? (isActive ? 0.12 : 0.06) : 0;
      const hov = hovered && this.presentIdx < 0 ? 1 : 0;
      if (full) {
        const before = p.tiltX + p.tiltY + p.lift + p.hover + p.phoneOut;
        p.tiltX = damp(p.tiltX, tX, 10, dt);
        p.tiltY = damp(p.tiltY, tY, 10, dt);
        p.lift = damp(p.lift, lift, 10, dt);
        p.hover = damp(p.hover, hov, 10, dt);
        p.phoneOut = damp(p.phoneOut, hov, 10, dt);
        const after = p.tiltX + p.tiltY + p.lift + p.hover + p.phoneOut;
        if (Math.abs(after - before) > 1e-4) busy = true;
      } else {
        p.tiltX = tX;
        p.tiltY = tY;
        p.lift = lift;
        p.hover = hov;
        p.phoneOut = 0;
      }

      // arc transform
      const rel = p.slot - this.s;
      const phi = rel * THETA + breathe;
      this.arcPos.set(R * Math.sin(phi), 0, -R * Math.cos(phi));
      this.arcQuat.setFromAxisAngle(Y_AXIS, -phi);
      const arcScale = p.vis;
      if (pe > 0) {
        p.group.position.lerpVectors(this.arcPos, this.presPos, pe);
        p.group.quaternion.slerpQuaternions(this.arcQuat, this.presQuat, pe);
        p.group.scale.setScalar(arcScale + (this.presScale - arcScale) * pe);
      } else {
        p.group.position.copy(this.arcPos);
        p.group.quaternion.copy(this.arcQuat);
        p.group.scale.setScalar(arcScale);
      }
      const shown = (arcScale > 0.002 && Math.abs(rel) <= VISIBLE_RANGE) || p.pres > 0.002;
      p.group.visible = shown;
      p.tilt.rotation.set(p.tiltX, p.tiltY, 0);
      p.tilt.position.z = p.lift;

      // phone: floats at the lower right; slides out on hover; beside the pane when presented
      const phoneShown = shown && (Math.abs(rel) < PHONE_RANGE || p.pres > 0.002);
      p.phone.visible = phoneShown;
      p.phone.position.set(
        PHONE.x + PHONE.hoverX * p.phoneOut + (PHONE.presentX - PHONE.x) * pe,
        PHONE.y + (PHONE.presentY - PHONE.y) * pe,
        PHONE.z + (PHONE.presentZ - PHONE.z) * pe,
      );
      p.phone.rotation.y = PHONE.rotY * (1 - pe);

      // material: frost (mip bias) away from the active slot, fade while another pane is presented
      const arcFrost = p.inFilter ? clamp(Math.abs(rel), 0, 1) : 1;
      const isPresented = p.index === this.presentIdx;
      const others = isPresented ? 0 : this.presentAmount;
      p.mat.uniforms.uFrost.value = Math.max(arcFrost * (1 - pe), others);
      p.dim = others * 0.85;
      p.mat.uniforms.uDim.value = p.dim;
      p.phoneMat.uniforms.uDim.value = p.dim;
      p.mat.uniforms.uHover.value = p.hover;
      if (hovered) {
        const ptr = p.mat.uniforms.uPointer.value;
        ptr.x = full ? damp(ptr.x, this.hoverUv.x, 10, dt) : this.hoverUv.x;
        ptr.y = full ? damp(ptr.y, this.hoverUv.y, 10, dt) : this.hoverUv.y;
      }

      // reveal wipes (500 ms)
      if (p.desktop && p.reveal < 1) {
        p.reveal = full ? Math.min(1, p.reveal + dt / 0.5) : 1;
        busy = true;
      }
      p.mat.uniforms.uReveal.value = p.desktop ? p.reveal : 0;
      if (p.mobile && p.phoneReveal < 1) {
        p.phoneReveal = full ? Math.min(1, p.phoneReveal + dt / 0.5) : 1;
        busy = true;
      }
      p.phoneMat.uniforms.uReveal.value = p.mobile ? p.phoneReveal : 0;

      p.group.updateMatrixWorld(true);
      this.frames.setPane(p.index, shown ? p.tilt.matrixWorld : null, shown && p.pres < 0.5 ? p.group.matrixWorld : null);
    }

    // ribs at the joints of the filtered slots (n + 1 joints)
    const joints = Math.round(this.nDamped) + 1;
    for (let j = 0; j < MAX_PANES + 1; j++) {
      const rel = j - 0.5 - this.s;
      this.frames.setRib(j, j < joints && Math.abs(rel) < 4 ? rel * THETA + breathe : null);
    }
    this.frames.commit();

    // the vine group follows the walk; it grows with s (a running max, so it records the walk)
    this.wall.rotation.y = this.s * THETA - breathe;
    this.wall.updateMatrixWorld(true);
    this.growMax = Math.max(this.growMax, this.s + 1);
    this.vine.uGrow.value = this.growMax;
    this.vine.setLength(this.nDamped);

    // blossoms: positions follow the slots; they open once their project has been opened
    for (let i = 0; i < this.panes.length; i++) {
      const goal = this.openTarget[i];
      const cur = this.openValue[i];
      if (cur !== goal) {
        const next = full ? damp(cur, goal, 5, dt) : goal;
        this.openValue[i] = Math.abs(next - goal) < 1e-3 ? goal : next;
        this.vine.setOpen(i, this.openValue[i]);
        busy = true;
      }
    }
    if (this.dirtyBlossoms || instant) {
      for (const p of this.panes) this.vine.setBlossom(p.index, p.slot, p.vis);
      this.vine.commitBlossoms();
      this.dirtyBlossoms = reflow;
    }
    // world anchors for the bird (the wall rotates with s)
    for (let i = 0; i < this.panes.length; i++) {
      this.v.copy(this.vine.anchorsLocal[i]).applyMatrix4(this.wall.matrixWorld);
      this.anchors[i * 3] = this.v.x;
      this.anchors[i * 3 + 1] = this.v.y;
      this.anchors[i * 3 + 2] = this.v.z;
    }
    // the perch: on the rail just right of the active pane's blossom
    railPoint(activeSlot + 0.42, -0.03, 0.075, this.v).applyMatrix4(this.wall.matrixWorld);
    this.perch.x = this.v.x;
    this.perch.y = this.v.y;
    this.perch.z = this.v.z;

    if (!instant) this.loadAround();
    return busy;
  }

  frame(delta: number) {
    const a = this.a;
    const brain = this.brain;
    const bird = this.bird;
    if (!a || !brain || !bird || !this.governor || !this.warm) return;
    const dt = Math.min(Math.max(delta, 0), 1 / 30);
    const t = this.now();
    const full = this.motion === "full";
    let busy = false;

    // theme: uNight animates over 900 ms
    if (this.nightProgress < 1) {
      this.nightProgress = Math.min(1, this.nightProgress + dt / 0.9);
      const e = this.nightProgress * this.nightProgress * (3 - 2 * this.nightProgress);
      this.applyNight(this.nightFrom + (this.nightTarget - this.nightFrom) * e);
      busy = true;
    }

    if (this.layout(dt)) busy = true;

    // the visiting bird (rail mode): hovers by the active pane's blossom, sips when a panel opens
    const presentInFilter = this.presentIdx >= 0 && this.panes[this.presentIdx].inFilter;
    const activeIdx = this.order[clamp(Math.round(this.s), 0, this.order.length - 1)] ?? 0;
    const inp = this.input;
    inp.time = t;
    inp.lastInput = this.lastInput;
    inp.reduced = !full;
    inp.viewW = this.W;
    inp.viewH = this.H;
    inp.focus = presentInFilter ? this.presentIdx : activeIdx;
    inp.sipToken = presentInFilter ? this.sipToken : brain.lastSip;
    brain.update(dt, inp);
    const pose = brain.pose;
    if (bird.apply(pose, t, dt, !full)) busy = true;
    if (pose.sipStarted && pose.sipIndex >= 0) {
      const an = this.anchors;
      const i = pose.sipIndex;
      this.sparks.burst(an[i * 3], an[i * 3 + 1] + 0.03, an[i * 3 + 2] + 0.03);
    }
    if (pose.sipIndex >= 0) this.vine.setBob(pose.sipIndex, Math.max(this.vine.getBob(pose.sipIndex), 0.8 * pose.billDip + 0.2));
    for (let i = 0; i < this.panes.length; i++) {
      const b = this.vine.getBob(i);
      if (b > 0) {
        const nb = b * Math.exp(-3.2 * dt);
        this.vine.setBob(i, nb < 0.01 ? 0 : nb);
        busy = true;
      }
    }
    if (this.sparks.update(dt)) busy = true;

    // shader time only advances while awake
    if (full) this.uTime.value += dt;

    if (!full) this.governor.setRate(0);
    else this.governor.setRate(busy ? 60 : pose.wantFps);

    if (!this.readySent) {
      this.readySent = true;
      requestAnimationFrame(() => {
        if (!this.disposed) a.onReady();
      });
    }
  }
}
