/**
 * The single file to edit when the sites go live (`liveUrl`) and when screenshots are captured.
 * Screenshot presence is detected at build time in `screenshots.server.ts`, so a missing file
 * falls back to a placeholder and never breaks the build.
 */

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

export const projects: Project[] = [
  {
    slug: "skybloom-3d", order: 1, name: "Skybloom", sector: "real-estate", sectorLabel: "Eco-city developer",
    oneLiner: "A developer's site where the city grows as you read: glass towers rise from an empty plot and gardens climb their walls.",
    signature: { title: "The district grows",
      body: "Scroll and a whole district rises out of the ground in a ripple, planting spreads up every facade, and the light turns from morning to dusk until the windows glow." },
    tryThis: "Scroll slowly through the four chapters and watch the light change.",
    goodFor: "Developers, architects, city and sustainability projects.",
    techniques: [
      "Every tower is one instanced mesh — the whole skyline grows from a single shader value",
      "Windows, vertical gardens and dusk lights are drawn in the shader, not modelled",
      "Morning-to-dusk lighting driven by one time-of-day number",
    ],
    tech: NEXT_R3F, accent: { swatch: "#8FC79A", textLight: "#2F6B45", textDark: "#8FC79A" },
    liveUrl: "https://skybloom-3d.vercel.app", repoUrl: "https://github.com/kyan9400/skybloom-3d",
    screenshots: shots("skybloom-3d", "Skybloom website: glass towers covered in gardens rising over a green plot", "Skybloom on a phone: the headline “Cities that grow back.” over a misty green plot where the first garden towers will rise"),
    madeInCode: true, year: 2026,
  },
  {
    slug: "qahwa-house-3d", order: 2, name: "Qahwa House", sector: "food", sectorLabel: "Specialty coffee house",
    oneLiner: "A warm, low-lit café site where every drink on the menu is poured live in 3D.",
    signature: { title: "The turning tray",
      body: "A walnut tray turns as you scroll the menu. Each drink rotates to the front and is poured on the spot — the stream falls, the cup fills, steam rises and beans drift around it." },
    tryThis: "Scroll through the menu and watch each cup being poured.",
    goodFor: "Cafés, restaurants, bakeries and food brands.",
    techniques: [
      "Cups, glasses and the finjan are lathe-turned from hand-drawn profiles",
      "The pour is a shader stream and the fill level follows the cup's inner curve",
      "Steam is a particle shader; the latte art is painted on a canvas at runtime",
    ],
    tech: NEXT_R3F, accent: { swatch: "#E3A53C", textLight: "#9A3D1C", textDark: "#E3A53C" },
    liveUrl: "https://qahwa-house-3d.vercel.app", repoUrl: "https://github.com/kyan9400/qahwa-house-3d",
    screenshots: shots("qahwa-house-3d", "Qahwa House website: a 3D coffee cup being poured on a walnut tray", "Qahwa House on a phone: a red coffee cup with latte art and falling beans above the headline “Poured slowly. Shared generously.”"),
    madeInCode: true, year: 2026,
  },
  {
    slug: "bloom-studio-3d", order: 3, name: "Bloom Studio", sector: "beauty-health", sectorLabel: "Beauty & nail studio",
    oneLiner: "A nail studio site built around a shade lab: pick a colour and the bottle and swatches repaint in real time.",
    signature: { title: "The shade lab",
      body: "A glass polish bottle and a fan of nail swatches repaint themselves when you pick a shade, with an iridescent finish that shifts as they turn — and the shade carries straight into booking." },
    tryThis: "Choose the Aurora finish, then try a few shades.",
    goodFor: "Salons, beauty brands, cosmetics and fashion.",
    techniques: [
      "A thin-film interference shader computed for red, green and blue light — no textures",
      "Bottle and swatches are lathe and extruded shapes; the swatches are instanced",
      "A four-step booking flow that remembers the chosen shade",
    ],
    tech: NEXT_R3F, accent: { swatch: "#D9668F", textLight: "#8C2457", textDark: "#E98BAE" },
    liveUrl: "https://bloom-studio-3d.vercel.app", repoUrl: "https://github.com/kyan9400/bloom-studio-3d",
    screenshots: shots("bloom-studio-3d", "Bloom Studio website: an iridescent nail polish bottle and swatches with a shade picker", "Bloom Studio on a phone: the headline “Colour, mixed for your hands.” above an iridescent pink nail polish bottle"),
    madeInCode: true, year: 2026,
  },
  {
    slug: "nova-ai-3d", order: 4, name: "Nova", sector: "tech", sectorLabel: "AI assistant SaaS",
    oneLiner: "A launch site for a team assistant whose 'mind' — a cloud of glowing particles — listens while you type.",
    signature: { title: "The particle mind",
      body: "An orb of tens of thousands of particles leans toward your cursor, ripples with every key you press in the demo chat, gathers itself while thinking and pulses word by word as it answers." },
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
    screenshots: shots("nova-ai-3d", "Nova website: a glowing particle orb next to a demo chat box", "Nova on a phone: a glowing white and yellow particle orb above the headline “A mind that listens before it speaks.”"),
    madeInCode: true, year: 2026,
  },
  {
    slug: "dubai-horizon-3d", order: 5, name: "Horizon Residences", sector: "real-estate", sectorLabel: "Luxury tower, Dubai",
    oneLiner: "A sales gallery in the browser: explore a 72-level twisting tower, pick a floor and drag the sun across the sky.",
    signature: { title: "The tower explorer",
      body: "Every floor turns 1.25° from the one below. Pick a level, highlight a residence and slide the time of day to see how the light falls — from morning to golden hour to night." },
    tryThis: "Choose a level, then drag the time-of-day slider to night.",
    goodFor: "Real-estate developers, agencies, hotels and architects.",
    techniques: [
      "72 floors drawn in two draw calls with instancing",
      "Facade pattern and lit windows added to the standard material in the shader",
      "Sun position computed from the time-of-day slider",
    ],
    tech: NEXT_R3F, accent: { swatch: "#5CC2BE", textLight: "#1F6F6B", textDark: "#5CC2BE" },
    liveUrl: "https://dubai-horizon-3d.vercel.app", repoUrl: "https://github.com/kyan9400/dubai-horizon-3d",
    screenshots: shots("dubai-horizon-3d", "Horizon Residences website: a twisting tower at night with a floor selector", "Horizon Residences on a phone: the headline “Seventy-two levels. One turning horizon.” above the golden twisting tower in a desert city"),
    madeInCode: true, year: 2026,
  },
  {
    slug: "aurum-watch-3d", order: 6, name: "Aurum", sector: "products", sectorLabel: "Independent watchmaker",
    oneLiner: "A watch configurator where the hands show your real time and the whole watch comes apart as you scroll.",
    signature: { title: "The exploded view",
      body: "Choose the case, dial and strap and the watch changes live. Keep scrolling and it separates layer by layer — crystal, hands, dial, case, movement, caseback — with every part labelled." },
    tryThis: "Change the dial, then scroll to take the watch apart.",
    goodFor: "Product brands, jewellery, luxury goods and online shops.",
    techniques: [
      "Case, bezel and crystal are lathe-turned; the lugs are extruded shapes",
      "The dial is painted on a canvas at runtime, with today's date in the window",
      "A scroll-linked exploded view of six layers",
    ],
    tech: NEXT_R3F, accent: { swatch: "#D2AE6D", textLight: "#80612B", textDark: "#D2AE6D" },
    liveUrl: "https://aurum-watch-3d.vercel.app", repoUrl: "https://github.com/kyan9400/aurum-watch-3d",
    screenshots: shots("aurum-watch-3d", "Aurum website: a gold watch with case, dial and strap options", "Aurum on a phone: a gold watch with a blue dial and tan strap above the headline “Time, turned by hand.”"),
    madeInCode: true, year: 2026,
  },
  {
    slug: "orbit-voyages-3d", order: 7, name: "Orbit Voyages", sector: "travel-events", sectorLabel: "Space tourism line",
    oneLiner: "One long scroll that is the voyage itself: from low Earth orbit, past the Moon, to Mars.",
    signature: { title: "Earth to Mars in one scroll",
      body: "Each section is a leg of the trip. The camera leaves Earth's night side, passes the Moon, coasts beside the ship and arrives in orbit around Mars." },
    tryThis: "Scroll from top to bottom without stopping.",
    goodFor: "Tourism, experiences, launches and storytelling brands.",
    techniques: [
      "Planet surfaces are generated on the GPU at load — no image maps",
      "Day and night sides, city lights, clouds and atmosphere glow are all shaders",
      "A scroll-driven camera path through six shots",
    ],
    tech: NEXT_R3F, accent: { swatch: "#FF7A45", textLight: "#B2431A", textDark: "#FF7A45" },
    liveUrl: "https://orbit-voyages-3d.vercel.app", repoUrl: "https://github.com/kyan9400/orbit-voyages-3d",
    screenshots: shots("orbit-voyages-3d", "Orbit Voyages website: Earth's night side with city lights and a sunrise rim", "Orbit Voyages on a phone: the headline “Leave the planet. Keep the view.” over Earth at sunrise with flight stats below"),
    madeInCode: true, year: 2026,
  },
  {
    slug: "terra-trek-3d", order: 8, name: "Terra Trek", sector: "travel-events", sectorLabel: "Slow-travel agency",
    oneLiner: "A travel agency site where you fly a 42-day route across a dotted night globe.",
    signature: { title: "The route globe",
      body: "Glowing arcs link six cities on a dotted globe. Scroll and the camera flies each leg of the journey while the city cards pass by." },
    tryThis: "Scroll through the six cities and follow the arcs.",
    goodFor: "Travel agencies, tours, airlines and global brands.",
    techniques: [
      "Continents plotted as thousands of points from hand-made outlines",
      "Flight arcs follow real great-circle paths",
      "Camera flights between destinations tied to scroll",
    ],
    tech: NEXT_R3F, accent: { swatch: "#FF9F43", textLight: "#9C4A0E", textDark: "#FF9F43" },
    liveUrl: "https://terra-trek-3d.vercel.app", repoUrl: "https://github.com/kyan9400/terra-trek-3d",
    screenshots: shots("terra-trek-3d", "Terra Trek website: a dotted globe at night with glowing flight arcs", "Terra Trek on a phone: a dotted night globe behind the headline “Travel the long way round.” and journey stats"),
    madeInCode: true, year: 2026,
  },
  {
    slug: "echo-fest-3d", order: 9, name: "Echo Fest", sector: "travel-events", sectorLabel: "Music festival",
    oneLiner: "A festival site whose tunnel of light listens: press play and the music drives it, or switch on your microphone.",
    signature: { title: "The echo tunnel",
      body: "A neon tunnel bulges with the bass and ripples with the treble. A synth set built in the browser plays the demo — or, with your permission, the tunnel listens to your room." },
    tryThis: "Turn your sound on and press Play the demo set.",
    goodFor: "Festivals, events, clubs, music and entertainment.",
    techniques: [
      "A 64-band spectrum from the Web Audio API is sent to the GPU every frame",
      "The tunnel walls are pushed in and out by the shader",
      "Light gates are instanced and the music is synthesised live — no audio files",
    ],
    tech: [...NEXT_R3F, "Web Audio API"], accent: { swatch: "#C8FF3D", textLight: "#4F6B00", textDark: "#C8FF3D" },
    liveUrl: "https://echo-fest-3d.vercel.app", repoUrl: "https://github.com/kyan9400/echo-fest-3d",
    screenshots: shots("echo-fest-3d", "Echo Fest website: a neon tunnel of light reacting to music", "Echo Fest on a phone: a neon wireframe tunnel behind the ECHO FEST title and a “Play the demo set” button"),
    madeInCode: true, year: 2026,
  },
  {
    slug: "helix-labs-3d", order: 10, name: "Helix Labs", sector: "beauty-health", sectorLabel: "Genomic medicine clinic",
    oneLiner: "A calm, editorial clinic site with one living object: a DNA helix that unwinds into each service.",
    signature: { title: "The unwinding",
      body: "As you scroll the services, the double helix unzips into a replication fork, rolls up into a cell, closes into a ring and winds back into a helix." },
    tryThis: "Scroll through the four services and watch the helix change shape.",
    goodFor: "Clinics, labs, healthcare, science and education.",
    techniques: [
      "64 base pairs in three instanced meshes — three draw calls for the whole molecule",
      "Every pair morphs between five computed shapes",
      "An appointment request form with friendly validation",
    ],
    tech: NEXT_R3F, accent: { swatch: "#3446B8", textLight: "#3446B8", textDark: "#8D9BF0" },
    liveUrl: "https://helix-labs-3d.vercel.app", repoUrl: "https://github.com/kyan9400/helix-labs-3d",
    screenshots: shots("helix-labs-3d", "Helix Labs website: a colourful DNA double helix on warm paper", "Helix Labs on a phone: the headline “Read the code you were born with.” on warm paper with a colourful DNA helix below"),
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
