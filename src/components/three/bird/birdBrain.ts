/**
 * birdBrain — the hummingbird's behaviour. Pure TypeScript (no React, no three.js), unit-testable:
 * `brain.update(dt, input)` → `brain.pose`.
 *
 * States: perched → takeoff (0.4 s) → hover ↔ dart → sip (1.2 s) → hover … → return → perched.
 * Plus `exit` (scrolling away: it darts out toward the work section).
 *
 * - Target: the blossom nearest the cursor in SCREEN space (positions cached by the scene on
 *   resize/scroll, never per frame), with 15 % hysteresis. If no blossom is within 220 px the bird
 *   hovers 140 px to the side of the cursor and looks at it.
 * - No-fly zone: the hero text block (+24 px). Targets inside it are skipped and the bird is pushed
 *   out of it every frame, so it never covers the headline, paragraph or buttons.
 * - Motion: critically damped spring (ω = 9 darting, 4 hovering), dt clamped to 1/30.
 * - Idle: 4 s → 30 fps; 12 s → returns to its perch; perched + settled → 0 fps.
 * - Touch: after the intro it visits two flowers on its own, then perches. A tap darts it to the
 *   flower nearest the tap; it perches again 6 s later.
 * - Rail mode (the work gallery): no cursor targeting. The scene names the flower to attend
 *   (`input.focus`, the active pane's blossom); the bird hovers near it and only sips when the scene
 *   asks (`input.sipToken` changes — a project panel opened). It perches after `idlePerch` seconds.
 * Every vector is preallocated.
 */

export type BirdMode = "perched" | "takeoff" | "hover" | "dart" | "sip" | "return" | "exit";

export type Vec3 = { x: number; y: number; z: number };
export type Vec2 = { x: number; y: number };
export type Rect = { x0: number; y0: number; x1: number; y1: number };

export interface BirdWorld {
  /** world → screen px (relative to the canvas) */
  project(x: number, y: number, z: number, out: Vec2): void;
  /** screen px → world point on the plane z = zPlane */
  unproject(sx: number, sy: number, zPlane: number, out: Vec3): void;
}

export interface BirdConfig {
  perch: Vec3;
  start: Vec3;
  /** offset of the bird's body centre from a flower it sips (bird on the right, facing left) */
  sipOffset: Vec3;
  /** blossom anchors, xyz per blossom */
  blossoms: Float32Array;
  count: number;
  startBlossom: number;
  touch: boolean;
  /** rail mode (gallery): the scene picks the flower, sips happen on request */
  rail?: boolean;
  /** seconds without input before the bird returns to its perch (default 12, touch 6) */
  idlePerch?: number;
  /** rail mode: where the bird hovers relative to the focused flower while not sipping */
  hoverOffset?: Vec3;
  /** seconds hovering at a flower before a sip starts (default 0.8) */
  sipAfter?: number;
}

export interface BirdInput {
  time: number;
  /** last pointer / touch input time (seconds, same clock as `time`) */
  lastInput: number;
  cursorActive: boolean;
  cursorX: number;
  cursorY: number;
  /** a tap happened this frame (touch) */
  tap: boolean;
  tapX: number;
  tapY: number;
  /** hero scrolled past 15 % */
  exit: boolean;
  /** hero back below 5 % */
  home: boolean;
  reduced: boolean;
  /** cached blossom screen positions, xy px per blossom */
  blossomScreen: Float32Array;
  noFly: Rect | null;
  viewW: number;
  viewH: number;
  /** rail mode: flower to attend (−1 = keep the current one) */
  focus?: number;
  /** rail mode: changes each time the scene wants a sip of the focused flower */
  sipToken?: number;
}

export interface BirdPose {
  x: number;
  y: number;
  z: number;
  yaw: number;
  pitch: number;
  bank: number;
  /** 1 flying (wings blurred), 0 perched (folded) */
  flying: number;
  /** 0..1, bill dipped into the flower */
  billDip: number;
  /** blossom being sipped, or −1 */
  sipIndex: number;
  /** true on the frame a sip starts (spawn pollen sparks) */
  sipStarted: boolean;
  mode: BirdMode;
  settled: boolean;
  /** frame rate the bird needs right now */
  wantFps: 0 | 30 | 60;
}

const TAKEOFF_TIME = 0.4;
const SIP_TIME = 1.2;
const SIP_AFTER = 0.8;
const IDLE_SLOW = 4;
const IDLE_PERCH = 12;
const TOUCH_PERCH = 6;
const NEAR_PX = 220;
const SIDE_PX = 140;
const BIRD_PLANE_Z = 1.0;
const BIRD_RADIUS_PX = 34;

export class BirdBrain {
  readonly pose: BirdPose;
  private readonly cfg: BirdConfig;
  private readonly world: BirdWorld;

  private mode: BirdMode = "hover";
  private modeTime = 0;
  private readonly pos: Vec3;
  private readonly vel: Vec3 = { x: 0, y: 0, z: 0 };
  private readonly prevVel: Vec3 = { x: 0, y: 0, z: 0 };
  private readonly target: Vec3 = { x: 0, y: 0, z: 0 };
  private readonly tmp3: Vec3 = { x: 0, y: 0, z: 0 };
  private readonly tmp2: Vec2 = { x: 0, y: 0 };

  private flower = -1; // current target flower
  private side = 1; // +1 bird to the right of the flower (faces left)
  private facing = -1;
  private atFlowerTime = 0;
  private lastSipped = -1;
  private lastSipTime = -10;
  private perchedSince = 0;
  private autoVisits = 0;
  private autoQueue: number[] = [];
  private tapTime = -100;
  private lastSipToken = 0;

  constructor(cfg: BirdConfig, world: BirdWorld) {
    this.cfg = cfg;
    this.world = world;
    this.pos = { ...cfg.start };
    this.target.x = cfg.start.x;
    this.target.y = cfg.start.y;
    this.target.z = cfg.start.z;
    this.flower = cfg.startBlossom;
    this.side = 1;
    this.facing = -1;
    // intro: the first sip lands at +1.6 s
    this.atFlowerTime = -(1.6 - SIP_AFTER);
    this.pose = {
      x: this.pos.x,
      y: this.pos.y,
      z: this.pos.z,
      yaw: Math.PI + 0.35,
      pitch: 0.5,
      bank: 0,
      flying: 1,
      billDip: 0,
      sipIndex: -1,
      sipStarted: false,
      mode: "hover",
      settled: false,
      wantFps: 60,
    };
    if (cfg.touch) this.queueAutoVisits();
  }

  /** Put the bird on its perch immediately (reduced motion, scroll return, first render). */
  snapToPerch(time: number) {
    const p = this.cfg.perch;
    this.pos.x = p.x;
    this.pos.y = p.y;
    this.pos.z = p.z;
    this.vel.x = this.vel.y = this.vel.z = 0;
    this.mode = "perched";
    this.modeTime = 0;
    this.perchedSince = time;
    this.flower = -1;
    this.facing = 1;
    this.side = -1;
    this.pose.yaw = -0.35;
    this.pose.pitch = 0.22;
    this.pose.bank = 0;
    this.writePose(time);
  }

  /** Rail mode: the last sip token the bird acted on (pass it back when no sip is wanted). */
  get lastSip(): number {
    return this.lastSipToken;
  }

  /** Wake from the perch (pointer moved, or full motion switched on). */
  wake(time: number) {
    if (this.mode === "perched") this.setMode("takeoff", time);
  }

  update(dtRaw: number, input: BirdInput) {
    const dt = Math.min(Math.max(dtRaw, 0), 1 / 30);
    const t = input.time;
    this.pose.sipStarted = false;

    if (input.reduced) {
      if (this.mode !== "perched" || this.cfg.rail) this.snapToPerch(t);
      this.pose.wantFps = 0;
      this.pose.settled = true;
      return;
    }

    // scroll exit / return home
    if (input.exit && this.mode !== "exit") {
      this.setMode("exit", t);
      this.world.unproject(input.viewW + 160, input.viewH + 120, BIRD_PLANE_Z, this.target);
      this.facing = 1;
    } else if (this.mode === "exit" && input.home) {
      this.snapToPerch(t);
      return;
    }

    if (input.tap) {
      this.tapTime = t;
      this.autoQueue.length = 0;
      const f = this.nearestFlower(input.tapX, input.tapY, input, Infinity);
      if (f >= 0) {
        this.flower = f;
        if (this.mode === "perched") this.setMode("takeoff", t);
      }
    }

    const idle = t - input.lastInput;
    this.modeTime += dt;

    switch (this.mode) {
      case "perched": {
        if (!this.cfg.touch && input.lastInput > this.perchedSince + 0.05 && idle < 0.5) this.setMode("takeoff", t);
        break;
      }
      case "takeoff": {
        const p = this.cfg.perch;
        this.target.x = p.x + 0.12 * this.side;
        this.target.y = p.y + 0.32;
        this.target.z = p.z + 0.25;
        if (this.modeTime >= TAKEOFF_TIME) this.setMode("hover", t);
        break;
      }
      case "hover":
      case "dart":
      case "sip": {
        const perchAfter = this.cfg.idlePerch ?? (this.cfg.touch ? TOUCH_PERCH : IDLE_PERCH);
        const touchDone = this.cfg.touch && this.autoQueue.length === 0 && t - this.tapTime > TOUCH_PERCH && this.autoVisits >= 2;
        if (this.mode !== "sip" && ((!this.cfg.touch && idle > perchAfter) || touchDone)) {
          this.setMode("return", t);
          break;
        }
        if (this.mode !== "sip") this.chooseTarget(input, t);
        const sipWanted = !this.cfg.rail || (input.sipToken ?? 0) !== this.lastSipToken;
        this.updateFlowerTarget(sipWanted);
        const dist = this.distToTarget();
        if (this.mode === "dart" && dist < 0.08) this.setMode("hover", t);
        else if (this.mode === "hover" && dist > 0.6) this.setMode("dart", t);

        if (this.mode === "hover" && this.flower >= 0 && dist < 0.07) {
          this.atFlowerTime += dt;
          const fresh = this.cfg.rail ? sipWanted : this.flower !== this.lastSipped || t - this.lastSipTime > 3;
          if (this.atFlowerTime >= (this.cfg.sipAfter ?? SIP_AFTER) && fresh) {
            this.setMode("sip", t);
            this.pose.sipStarted = true;
            this.lastSipped = this.flower;
            this.lastSipTime = t;
            this.lastSipToken = input.sipToken ?? 0;
          }
        } else if (this.mode !== "sip") {
          this.atFlowerTime = Math.min(this.atFlowerTime, 0);
          if (this.atFlowerTime < 0) this.atFlowerTime += dt; // intro delay counts down while approaching
        }
        if (this.mode === "sip" && this.modeTime >= SIP_TIME) {
          this.atFlowerTime = 0;
          if (this.cfg.touch && this.autoQueue.length) {
            this.autoVisits++;
            this.flower = this.autoQueue.shift() ?? this.flower;
          } else if (this.cfg.touch) {
            this.autoVisits = Math.max(this.autoVisits, 2);
          }
          this.setMode("hover", t);
        }
        break;
      }
      case "return": {
        const p = this.cfg.perch;
        this.target.x = p.x;
        this.target.y = p.y;
        this.target.z = p.z;
        this.facing = p.x >= this.pos.x ? 1 : -1;
        if (input.lastInput > t - 0.3 && !this.cfg.touch) {
          this.setMode("hover", t);
          break;
        }
        if (this.distToTarget() < 0.03 && this.speed() < 0.08) {
          this.snapToPerch(t);
          return;
        }
        break;
      }
      case "exit":
        break;
    }

    // spring integration
    const omega = this.mode === "dart" || this.mode === "return" || this.mode === "exit" ? 9 : this.mode === "takeoff" ? 6 : 4;
    if (this.mode !== "perched") this.integrate(omega, dt);

    // keep out of the text block
    if (input.noFly && this.mode !== "exit" && this.mode !== "perched") this.avoid(input.noFly);

    this.orient(dt);
    this.writePose(t);

    // frame rate the bird needs
    let fps: 0 | 30 | 60 = 60;
    if (this.mode === "perched") fps = 0;
    else if (this.mode === "exit" && this.distToTarget() < 0.25) fps = 0; // out of frame: stop
    else if (this.mode === "hover" && idle > IDLE_SLOW && this.atFlowerTime >= 0) fps = 30;
    this.pose.wantFps = fps;
    this.pose.settled = this.mode === "perched";
  }

  // ───────────────────────── internals ─────────────────────────

  private setMode(mode: BirdMode, time: number) {
    this.mode = mode;
    this.modeTime = 0;
    if (mode === "perched") this.perchedSince = time;
    if (mode === "takeoff" && this.cfg.touch && this.autoQueue.length === 0 && this.flower < 0) this.queueAutoVisits();
  }

  private queueAutoVisits() {
    // two flowers near the perch, chosen deterministically
    const b = this.cfg.blossoms;
    const p = this.cfg.perch;
    const order: { i: number; d: number }[] = [];
    for (let i = 0; i < this.cfg.count; i++) {
      const d = Math.hypot(b[i * 3] - p.x, b[i * 3 + 1] - p.y);
      if (d > 0.4) order.push({ i, d });
    }
    order.sort((u, v) => u.d - v.d);
    this.autoQueue = order.slice(0, 2).map((o) => o.i);
    this.autoVisits = 0;
    if (this.flower < 0 && this.autoQueue.length) this.flower = this.autoQueue.shift()!;
  }

  private nearestFlower(sx: number, sy: number, input: BirdInput, maxPx: number): number {
    const s = input.blossomScreen;
    let best = -1;
    let bestD = maxPx;
    for (let i = 0; i < this.cfg.count; i++) {
      const x = s[i * 2];
      const y = s[i * 2 + 1];
      if (input.noFly && this.inRect(x, y, input.noFly, BIRD_RADIUS_PX)) continue;
      let d = Math.hypot(x - sx, y - sy);
      if (i === this.flower) d *= 0.85; // hysteresis
      if (d < bestD) {
        bestD = d;
        best = i;
      }
    }
    return best;
  }

  private chooseTarget(input: BirdInput, t: number) {
    if (this.cfg.rail) {
      const f = input.focus ?? -1;
      if (f >= 0 && f !== this.flower) {
        this.flower = f;
        this.atFlowerTime = 0;
        const fx = this.cfg.blossoms[f * 3];
        this.side = this.pos.x >= fx ? 1 : -1;
      }
      return;
    }
    if (this.cfg.touch) {
      // touch: autonomous visits / tapped flower; flower already set
      if (this.flower < 0 && this.autoQueue.length) this.flower = this.autoQueue.shift()!;
      return;
    }
    if (!input.cursorActive) return; // keep the current target
    if (t - input.lastInput > IDLE_SLOW && this.flower >= 0) return;
    const f = this.nearestFlower(input.cursorX, input.cursorY, input, NEAR_PX);
    if (f >= 0) {
      if (f !== this.flower) {
        this.flower = f;
        this.atFlowerTime = 0;
        // approach from the side the bird is already on
        const fx = this.cfg.blossoms[f * 3];
        this.side = this.pos.x >= fx ? 1 : -1;
      }
      return;
    }
    // curious: hover 140 px beside the cursor and look at it
    this.flower = -1;
    this.world.project(this.pos.x, this.pos.y, this.pos.z, this.tmp2);
    let side = this.tmp2.x >= input.cursorX ? 1 : -1;
    let sx = input.cursorX + side * SIDE_PX;
    const sy = Math.min(Math.max(input.cursorY + 10, 90), input.viewH - 40);
    if (input.noFly && this.inRect(sx, sy, input.noFly, BIRD_RADIUS_PX)) {
      side = -side;
      sx = input.cursorX + side * SIDE_PX;
    }
    sx = Math.min(Math.max(sx, 40), input.viewW - 40);
    this.world.unproject(sx, sy, BIRD_PLANE_Z, this.target);
    this.facing = -side;
    this.side = side;
  }

  private updateFlowerTarget(sipWanted = true) {
    if (this.flower < 0) return;
    const b = this.cfg.blossoms;
    const o = !sipWanted && this.cfg.hoverOffset ? this.cfg.hoverOffset : this.cfg.sipOffset;
    this.target.x = b[this.flower * 3] + o.x * this.side;
    this.target.y = b[this.flower * 3 + 1] + o.y;
    this.target.z = b[this.flower * 3 + 2] + o.z;
    this.facing = -this.side;
  }

  private distToTarget(): number {
    return Math.hypot(this.target.x - this.pos.x, this.target.y - this.pos.y, this.target.z - this.pos.z);
  }

  private speed(): number {
    return Math.hypot(this.vel.x, this.vel.y, this.vel.z);
  }

  private integrate(w: number, dt: number) {
    this.prevVel.x = this.vel.x;
    this.prevVel.y = this.vel.y;
    this.prevVel.z = this.vel.z;
    const w2 = w * w;
    const ax = w2 * (this.target.x - this.pos.x) - 2 * w * this.vel.x;
    const ay = w2 * (this.target.y - this.pos.y) - 2 * w * this.vel.y;
    const az = w2 * (this.target.z - this.pos.z) - 2 * w * this.vel.z;
    this.vel.x += ax * dt;
    this.vel.y += ay * dt;
    this.vel.z += az * dt;
    this.pos.x += this.vel.x * dt;
    this.pos.y += this.vel.y * dt;
    this.pos.z += this.vel.z * dt;
  }

  private inRect(x: number, y: number, r: Rect, pad: number): boolean {
    return x > r.x0 - pad && x < r.x1 + pad && y > r.y0 - pad && y < r.y1 + pad;
  }

  private avoid(r: Rect) {
    const s = this.tmp2;
    this.world.project(this.pos.x, this.pos.y, this.pos.z, s);
    const pad = BIRD_RADIUS_PX;
    if (!this.inRect(s.x, s.y, r, pad)) return;
    const dl = s.x - (r.x0 - pad);
    const dr = r.x1 + pad - s.x;
    const dt = s.y - (r.y0 - pad);
    const db = r.y1 + pad - s.y;
    const m = Math.min(dl, dr, dt, db);
    let nx = s.x;
    let ny = s.y;
    if (m === dr) nx = r.x1 + pad;
    else if (m === db) ny = r.y1 + pad;
    else if (m === dl) nx = r.x0 - pad;
    else ny = r.y0 - pad;
    this.world.unproject(nx, ny, this.pos.z, this.tmp3);
    this.pos.x = this.tmp3.x;
    this.pos.y = this.tmp3.y;
    this.vel.x *= 0.5;
    this.vel.y *= 0.5;
  }

  private orient(dt: number) {
    const moving = Math.abs(this.vel.x) > 0.9;
    const face = this.mode === "perched" ? this.facing : moving && this.mode !== "sip" ? Math.sign(this.vel.x) : this.facing;
    const yawTarget = face > 0 ? -0.35 : Math.PI + 0.35;
    this.pose.yaw = dampAngle(this.pose.yaw, yawTarget, this.mode === "dart" ? 10 : 6, dt);

    const hs = Math.hypot(this.vel.x, this.vel.z);
    const base = this.mode === "perched" ? 0.22 : 0.55;
    const pitchTarget = base - Math.min(hs * 0.12, 0.45) + clampN(this.vel.y * 0.15, -0.25, 0.25);
    this.pose.pitch = dampN(this.pose.pitch, pitchTarget, 10, dt);

    // bank from lateral acceleration (acceleration along the bird's side axis)
    const ax = dt > 0 ? (this.vel.x - this.prevVel.x) / dt : 0;
    const az = dt > 0 ? (this.vel.z - this.prevVel.z) / dt : 0;
    const lat = ax * Math.sin(this.pose.yaw) + az * Math.cos(this.pose.yaw);
    this.pose.bank = dampN(this.pose.bank, clampN(lat * 0.03, -0.6, 0.6), 8, dt);
  }

  private writePose(t: number) {
    const flying = this.mode === "perched" ? 0 : 1;
    const bob = flying ? Math.sin(2 * Math.PI * 2.1 * t) * 0.03 : 0;
    let dip = 0;
    if (this.mode === "sip") dip = Math.sin(Math.PI * Math.min(1, this.modeTime / SIP_TIME));
    this.pose.x = this.pos.x + this.facing * 0.07 * dip;
    this.pose.y = this.pos.y + bob * (1 - dip);
    this.pose.z = this.pos.z;
    this.pose.flying = flying;
    this.pose.billDip = dip;
    this.pose.sipIndex = this.mode === "sip" ? this.flower : -1;
    this.pose.mode = this.mode;
  }
}

function clampN(v: number, a: number, b: number) {
  return v < a ? a : v > b ? b : v;
}

function dampN(c: number, target: number, l: number, dt: number) {
  return c + (target - c) * (1 - Math.exp(-l * dt));
}

function dampAngle(c: number, target: number, l: number, dt: number) {
  let d = (target - c) % (Math.PI * 2);
  if (d > Math.PI) d -= Math.PI * 2;
  if (d < -Math.PI) d += Math.PI * 2;
  return c + d * (1 - Math.exp(-l * dt));
}
