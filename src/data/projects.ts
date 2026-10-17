/**
 * The single file to edit when the sites go live (`liveUrl`) and when screenshots are captured.
 * Screenshot presence is detected at build time in `screenshots.server.ts`, so a missing file
 * falls back to a placeholder and never breaks the build.
 */

import { ghPages } from "@/lib/pages";
import { PROJECT_COUNT, type ProjectCard, type Sector } from "./sectors";

export { PROJECT_COUNT, SECTORS, pad2, type ProjectCard, type Sector } from "./sectors";

export type Project = {
  slug: string;              // = GitHub repo name = route segment
  order: number;             // 1–11, display order, shown as "04"
  name: string;              // wordmark exactly as on the live site
  sector: Sector;
  sectorLabel: string;       // short descriptor, e.g. "Specialty coffee house"
  oneLiner: string;          // ≤ 120 chars
  signature: { title: string; body: string };
  tryThis: string;           // one imperative sentence, ≤ 80 chars
  goodFor: string;           // which clients should look at this
  techniques: string[];      // 3 plain-English bullets, each naming the real technique
  tech: string[];            // chips; lead verifies against the repo's package.json
  accent: { swatch: string; textLight: string; textDark: string }; // from that site's palette; text ≥ 4.5:1
  liveUrl: string | null;    // null until deployed — lead fills in
  repoUrl: string;
  screenshots: {
    desktop: string;         // /work/{slug}-desktop.webp  1600×1000
    mobile: string;          // /work/{slug}-mobile.webp   780×1688 (2x of 390×844)
    og: string;              // /work/{slug}-og.jpg        1200×750 JPEG (for OG composition)
    alt: string;
    altMobile: string;
  };
  madeInCode: boolean;       // every 3D asset procedural / code-made
  credits?: string;          // third-party asset note, shown in the case footnote
  year: 2026;
};

const shots = (slug: string, alt: string, altMobile: string) => ({
  desktop: `/work/${slug}-desktop.webp`,
  mobile: `/work/${slug}-mobile.webp`,
  og: `/work/${slug}-og.jpg`,
  alt,
  altMobile,
});

const NEXT_R3F = ["Next.js 16", "React Three Fiber", "Three.js", "GLSL shaders", "TypeScript"];

const list: Project[] = [
  {
    slug: "skybloom-3d", order: 1, name: "Skybloom", sector: "real-estate", sectorLabel: "Eco-city developer",
    oneLiner: "A developer's site that opens on a green city at golden hour, then sinks it and grows it again as you read.",
    signature: { title: "The district grows",
      body: "The finished district greets you from the air. Scroll and it sinks back into the ground, then rises again in a ripple — drums, stepped towers and masts — while gardens climb every facade, a canal mirrors the sky and the windows glow at dusk." },
    tryThis: "Scroll slowly through the four chapters and watch the light change.",
    goodFor: "Developers, architects, city and sustainability projects.",
    techniques: [
      "Every tower is one instanced mesh — the whole skyline grows from a single shader value",
      "Windows, vertical gardens and dusk lights are drawn in the shader, not modelled",
      "Morning-to-dusk lighting driven by one time-of-day number",
    ],
    tech: NEXT_R3F, accent: { swatch: "#8FC79A", textLight: "#2F6B45", textDark: "#8FC79A" },
    liveUrl: "https://skybloom-3d.vercel.app", repoUrl: "https://github.com/kyan9400/skybloom-3d",
    screenshots: shots("skybloom-3d", "Skybloom website: a green city of garden towers at golden hour, ringed by a canal", "Skybloom on a phone: a garden-covered landmark tower rising above the headline “Cities that grow back.”"),
    madeInCode: true, year: 2026,
  },
  {
    slug: "qahwa-house-3d", order: 2, name: "Qahwa House", sector: "food", sectorLabel: "Specialty coffee house",
    oneLiner: "A warm, low-lit café site where every drink on the menu is poured live in 3D.",
    signature: { title: "The turning tray",
      body: "A brass tray turns on a walnut table as you scroll the menu, lit by late sun through a lattice window. Each drink rotates to the front and is poured on the spot, among spilled beans, cardamom and dates — and every drink gets its own light." },
    tryThis: "Scroll through the menu and watch each cup being poured.",
    goodFor: "Cafés, restaurants, bakeries and food brands.",
    techniques: [
      "Cups, glasses and the finjan are lathe-turned from hand-drawn profiles",
      "The pour is a shader stream and the fill level follows the cup's inner curve",
      "Steam is a particle shader; the latte art is painted on a canvas at runtime",
    ],
    tech: NEXT_R3F, accent: { swatch: "#E3A53C", textLight: "#9A3D1C", textDark: "#E3A53C" },
    liveUrl: "https://qahwa-house-3d.vercel.app", repoUrl: "https://github.com/kyan9400/qahwa-house-3d",
    screenshots: shots("qahwa-house-3d", "Qahwa House website: a coffee cup and brass dallah on a walnut table in warm window light", "Qahwa House on a phone: a red coffee cup with latte art and falling beans above the headline “Poured slowly. Shared generously.”"),
    madeInCode: true, year: 2026,
  },
  {
    slug: "bloom-studio-3d", order: 3, name: "Bloom Studio", sector: "beauty-health", sectorLabel: "Beauty & nail studio",
    oneLiner: "A nail studio site built around a shade lab: pick a colour and the bottle and swatches repaint in real time.",
    signature: { title: "The shade lab",
      body: "A glass polish bottle stands on a pastel plinth inside ribbons of liquid polish. Pick a shade and the bottle, ribbons and swatches repaint with an iridescent finish; scroll and the brush lifts out and paints a stroke — the shade carries straight into booking." },
    tryThis: "Choose the Aurora finish, then try a few shades.",
    goodFor: "Salons, beauty brands, cosmetics and fashion.",
    techniques: [
      "A thin-film interference shader computed for red, green and blue light — no textures",
      "Bottle and swatches are lathe and extruded shapes; the swatches are instanced",
      "A four-step booking flow that remembers the chosen shade",
    ],
    tech: NEXT_R3F, accent: { swatch: "#D9668F", textLight: "#8C2457", textDark: "#E98BAE" },
    liveUrl: "https://bloom-studio-3d.vercel.app", repoUrl: "https://github.com/kyan9400/bloom-studio-3d",
    screenshots: shots("bloom-studio-3d", "Bloom Studio website: an iridescent polish bottle on a pastel plinth wrapped in ribbons of polish", "Bloom Studio on a phone: the headline “Colour, mixed for your hands.” above an iridescent pink nail polish bottle"),
    madeInCode: true, year: 2026,
  },
  {
    slug: "nova-ai-3d", order: 4, name: "Nova", sector: "tech", sectorLabel: "AI assistant SaaS",
    oneLiner: "A launch site for a team assistant whose 'mind', a glass core in a gold particle shell, listens while you type.",
    signature: { title: "The glass mind",
      body: "A dark glass core with gold light veins sits in a shell of particles, light trails and sound rings. It leans toward your cursor, ripples with every key in the demo chat, turns ice-blue while thinking and burns amber as it answers." },
    tryThis: "Type a question in the demo chat and watch the orb react to each key.",
    goodFor: "SaaS, AI products, apps and tech startups.",
    techniques: [
      "One draw call: all particle motion runs on the GPU in the vertex shader",
      "Cursor, keystrokes, thinking and speaking are just shader inputs",
      "Pricing with a monthly/yearly switch and a scripted demo chat",
    ],
    tech: NEXT_R3F,
    accent: { swatch: "#A68BFF", textLight: "#5B3FC4", textDark: "#A68BFF" },
    liveUrl: "https://nova-ai-3d-xi.vercel.app", repoUrl: "https://github.com/kyan9400/nova-ai-3d",
    screenshots: shots("nova-ai-3d", "Nova website: a dark glass orb in a gold particle shell with light trails", "Nova on a phone: a glass orb in gold particles and light rings above the headline “A mind that listens before it speaks.”"),
    madeInCode: true, year: 2026,
  },
  {
    slug: "dubai-horizon-3d", order: 5, name: "Horizon Residences", sector: "real-estate", sectorLabel: "Luxury tower, Dubai",
    oneLiner: "A sales gallery in the browser: explore a 72-level twisting tower, pick a floor and drag the sun across the sky.",
    signature: { title: "The tower explorer",
      body: "The tower rises beside the Gulf at sunset, over a city of marinas, a creek and desert dunes. Every floor turns 1.25° from the one below: pick a level, highlight a residence and slide the time of day — the glass reflects the real sky, and at night the city lights up." },
    tryThis: "Choose a level, then drag the time-of-day slider to night.",
    goodFor: "Real-estate developers, agencies, hotels and architects.",
    techniques: [
      "72 floors drawn in two draw calls with instancing",
      "Facade pattern and lit windows added to the standard material in the shader",
      "Sun position computed from the time-of-day slider",
    ],
    tech: NEXT_R3F, accent: { swatch: "#5CC2BE", textLight: "#1F6F6B", textDark: "#5CC2BE" },
    liveUrl: "https://dubai-horizon-3d.vercel.app", repoUrl: "https://github.com/kyan9400/dubai-horizon-3d",
    screenshots: shots("dubai-horizon-3d", "Horizon Residences website: a twisting tower beside the sea at sunset with a floor selector", "Horizon Residences on a phone: the headline “Seventy-two levels. One turning horizon.” above the tower and the setting sun"),
    madeInCode: true, year: 2026,
  },
  {
    slug: "aurum-watch-3d", order: 6, name: "Aurum", sector: "products", sectorLabel: "Independent watchmaker",
    oneLiner: "A watch configurator where the hands show your real time and the whole watch comes apart as you scroll.",
    signature: { title: "The exploded view",
      body: "Through an open-heart window the balance wheel swings in real time. Choose the case, dial and strap and the watch changes live; keep scrolling and it separates layer by layer — crystal, hands, dial, case, movement, caseback — under cool steel light." },
    tryThis: "Change the dial, then scroll to take the watch apart.",
    goodFor: "Product brands, jewellery, luxury goods and online shops.",
    techniques: [
      "Case, bezel and crystal are lathe-turned; the lugs are extruded shapes",
      "The dial is painted on a canvas at runtime, with today's date in the window",
      "A scroll-linked exploded view of six layers",
    ],
    tech: NEXT_R3F, accent: { swatch: "#D2AE6D", textLight: "#80612B", textDark: "#D2AE6D" },
    liveUrl: "https://aurum-watch-3d.vercel.app", repoUrl: "https://github.com/kyan9400/aurum-watch-3d",
    screenshots: shots("aurum-watch-3d", "Aurum website: a gold watch with an open-heart dial before a faint gold clock ring", "Aurum on a phone: a gold watch with a blue dial and tan strap above the headline “Time, turned by hand.”"),
    madeInCode: true, year: 2026,
  },
  {
    slug: "orbit-voyages-3d", order: 7, name: "Orbit Voyages", sector: "travel-events", sectorLabel: "Space tourism line",
    oneLiner: "One long scroll that is the voyage itself: from low Earth orbit, past the Moon, to Mars.",
    signature: { title: "Earth to Mars in one scroll",
      body: "It opens on a sunrise over Earth's night side, the ship parked in orbit. Each section is a leg of the trip: a close flyby of the cratered Moon, the coast through a nebula sky beside the ship, and arrival in orbit around Mars." },
    tryThis: "Scroll from top to bottom without stopping.",
    goodFor: "Tourism, experiences, launches and storytelling brands.",
    techniques: [
      "Planet surfaces are generated on the GPU at load — no image maps",
      "Day and night sides, city lights, clouds and atmosphere glow are all shaders",
      "A scroll-driven camera path through six shots",
    ],
    tech: NEXT_R3F, accent: { swatch: "#FF7A45", textLight: "#B2431A", textDark: "#FF7A45" },
    liveUrl: "https://orbit-voyages-3d.vercel.app", repoUrl: "https://github.com/kyan9400/orbit-voyages-3d",
    screenshots: shots("orbit-voyages-3d", "Orbit Voyages website: a sunrise breaking over Earth's night side with a spacecraft in orbit", "Orbit Voyages on a phone: the headline “Leave the planet. Keep the view.” over Earth at sunrise with flight stats below"),
    madeInCode: true, year: 2026,
  },
  {
    slug: "terra-trek-3d", order: 8, name: "Terra Trek", sector: "travel-events", sectorLabel: "Slow-travel agency",
    oneLiner: "A travel agency site where you fly a 42-day route around a living Earth and dive down to every stop.",
    signature: { title: "The route globe",
      body: "Glowing arcs link six cities on an Earth with relief, clouds and sun on the oceans. Scroll and the camera flies each leg, then drops low over each destination — ice, desert, dusk city lights — before the globe unrolls into a paper map." },
    tryThis: "Scroll through the six cities and follow the arcs.",
    goodFor: "Travel agencies, tours, airlines and global brands.",
    techniques: [
      "Land, climate colours and mountains generated in code from hand-made outlines",
      "Flight arcs follow real great-circle paths",
      "Camera flights between destinations tied to scroll",
    ],
    tech: NEXT_R3F, accent: { swatch: "#FF9F43", textLight: "#9C4A0E", textDark: "#FF9F43" },
    liveUrl: "https://terra-trek-3d.vercel.app", repoUrl: "https://github.com/kyan9400/terra-trek-3d",
    screenshots: shots("terra-trek-3d", "Terra Trek website: a realistic Earth with clouds and glowing flight arcs", "Terra Trek on a phone: a cloudy blue Earth behind the headline “Travel the long way round.” and journey stats"),
    madeInCode: true, year: 2026,
  },
  {
    slug: "echo-fest-3d", order: 9, name: "Echo Fest", sector: "travel-events", sectorLabel: "Music festival",
    oneLiner: "A festival site that puts you in the crowd: a light show on the beat, then a flight into a tunnel that listens.",
    signature: { title: "The stage and the tunnel",
      body: "A headline stage seen from a crowd of thousands — LED wall, beams, lasers and phone lights — pulses on the beat. Scroll and you fly into the tunnel of light, which bulges with the bass of a synth set built in the browser, or listens to your room." },
    tryThis: "Turn your sound on and press Play the demo set.",
    goodFor: "Festivals, events, clubs, music and entertainment.",
    techniques: [
      "A 64-band spectrum from the Web Audio API is sent to the GPU every frame",
      "The tunnel walls are pushed in and out by the shader",
      "Light gates are instanced and the music is synthesised live — no audio files",
    ],
    tech: [...NEXT_R3F, "Web Audio API"], accent: { swatch: "#C8FF3D", textLight: "#4F6B00", textDark: "#C8FF3D" },
    liveUrl: "https://echo-fest-3d.vercel.app", repoUrl: "https://github.com/kyan9400/echo-fest-3d",
    screenshots: shots("echo-fest-3d", "Echo Fest website: a festival stage with an LED wall, lasers and a crowd", "Echo Fest on a phone: a glowing stage tunnel above the ECHO FEST title and a “Play the demo set” button"),
    madeInCode: true, year: 2026,
  },
  {
    slug: "helix-labs-3d", order: 10, name: "Helix Labs", sector: "beauty-health", sectorLabel: "Genomic medicine clinic",
    oneLiner: "A calm, editorial clinic site with one living object: a DNA helix that unwinds into each service.",
    signature: { title: "The unwinding",
      body: "A glowing glass helix lies on a dark microscope slide, light running along its strands. As you scroll the services it unzips into a replication fork, rolls up into a cell, closes into a ring and winds back — the slide changing tint each time." },
    tryThis: "Scroll through the four services and watch the helix change shape.",
    goodFor: "Clinics, labs, healthcare, science and education.",
    techniques: [
      "64 base pairs in three instanced meshes — three draw calls for the whole molecule",
      "Every pair morphs between five computed shapes",
      "An appointment request form with friendly validation",
    ],
    tech: NEXT_R3F, accent: { swatch: "#3446B8", textLight: "#3446B8", textDark: "#8D9BF0" },
    liveUrl: "https://helix-labs-3d.vercel.app", repoUrl: "https://github.com/kyan9400/helix-labs-3d",
    screenshots: shots("helix-labs-3d", "Helix Labs website: a glowing glass DNA helix on a dark teal microscope slide", "Helix Labs on a phone: a glass DNA helix on a teal slide above the headline “Read the code you were born with.”"),
    madeInCode: true, year: 2026,
  },
  {
    slug: "apex-3d-site", order: 11, name: "Apex Motors", sector: "products", sectorLabel: "Performance car showcase",
    oneLiner: "A car launch site where scrolling is the throttle: 0 to 100 km/h, a dolly zoom and a glossy studio floor.",
    signature: { title: "Launch control",
      body: "Scroll into the launch section and the speedometer climbs to 100 km/h at the pace of a real launch, the road streams past and the camera pulls a dolly zoom." },
    tryThis: "Pick a paint colour, then scroll into launch control.",
    goodFor: "Automotive, product launches and premium brands.",
    techniques: [
      "Camera shots orbit the car as you scroll",
      "Clear-coat paint, and the whole interface follows the chosen colour",
      "Speed streaks drawn as one instanced mesh",
    ],
    tech: ["Three.js", "GSAP ScrollTrigger", "Lenis", "Vite", "JavaScript"],
    accent: { swatch: "#B3121F", textLight: "#B3121F", textDark: "#FF6B73" },
    liveUrl: "https://apex-3d-site.vercel.app", repoUrl: "https://github.com/kyan9400/apex-3d-site",
    screenshots: shots("apex-3d-site", "Apex Motors website: a glossy red sports car in a dark studio", "Apex Motors on a phone: a red open-top sports car in a dark studio above the headline “Built for control.”"),
    madeInCode: false, credits: "Car model: third-party asset, credited on the live site.", year: 2026,
  },
];

// the GitHub Pages mirror links each site's own Pages copy (repo name = slug): vercel.app is blocked by some providers
export const projects: Project[] = ghPages
  ? list.map((p) => ({ ...p, liveUrl: p.liveUrl && `https://kyan9400.github.io/${p.slug}/` }))
  : list;

// the client copy ("04 / 11") uses a constant: keep it in step with the list
if (projects.length !== PROJECT_COUNT) throw new Error(`PROJECT_COUNT is ${PROJECT_COUNT}, but there are ${projects.length} projects`);

/** The slim shape sent to the client gallery (smaller RSC payload, no long texts in the bundle). */
export function toCard(p: Project): ProjectCard {
  const { desktop, mobile, alt, altMobile } = p.screenshots;
  return {
    slug: p.slug,
    order: p.order,
    name: p.name,
    sector: p.sector,
    sectorLabel: p.sectorLabel,
    oneLiner: p.oneLiner,
    tryThis: p.tryThis,
    accent: p.accent,
    liveUrl: p.liveUrl,
    screenshots: { desktop, mobile, alt, altMobile },
  };
}

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}

export function projectsBySector(sector: Sector | "all"): Project[] {
  return sector === "all" ? projects : projects.filter((p) => p.sector === sector);
}

export function sectorCount(sector: Sector): number {
  return projects.filter((p) => p.sector === sector).length;
}

/** Previous / next project in display order (wraps around). */
export function neighbours(slug: string): { prev: Project; next: Project } {
  const i = projects.findIndex((p) => p.slug === slug);
  const n = projects.length;
  const idx = i < 0 ? 0 : i;
  return { prev: projects[(idx - 1 + n) % n], next: projects[(idx + 1) % n] };
}
