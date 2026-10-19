/**
 * All non-project copy for the site lives here. Components never hard-code strings.
 */

import { ghPages } from "@/lib/pages";

export const owner = {
  name: "Alhassan Alfarran",
  wordmark: "Hassan",
  year: 2026,
} as const;

export const contact = {
  whatsapp: { display: "+7 919 399-97-49", url: "https://wa.me/79193999749" },
  email: "kyan775909@gmail.com",
  telegram: { handle: "@hassan_9400", url: "https://t.me/hassan_9400" },
  github: "https://github.com/kyan9400",
  // the Pages mirror links the Pages copy of the main portfolio (vercel.app is blocked in some regions)
  mainPortfolio: ghPages ? "https://kyan9400.github.io/alhassan_portfolio/" : "https://alhassan-portfolio-sigma.vercel.app",
} as const;

/** WhatsApp link with a prefilled message. */
export function waLink(text: string): string {
  return `${contact.whatsapp.url}?text=${encodeURIComponent(text)}`;
}

/** mailto: link with a subject line. */
export function mailLink(subject: string): string {
  return `mailto:${contact.email}?subject=${encodeURIComponent(subject)}`;
}

// fixed on purpose: a preview URL in the environment must never leak into canonical / sitemap / JSON-LD
export const primaryUrl = "https://hassan-webdesign.vercel.app";
// the GitHub Pages mirror (for providers that block vercel.app) builds its own absolute URLs
export const siteUrl = ghPages ? "https://kyan9400.github.io/hassan-webdesign" : primaryUrl;

/** Canonical URL of a path: the mirror points search engines at the Vercel original. */
export function canonical(path: string): string {
  return ghPages ? `${primaryUrl}${path}` : path;
}

export const seo = {
  homeTitle: "Alhassan Alfarran — Web Design, 3D Websites & Landing Pages",
  titleTemplate: "%s — Alhassan Alfarran",
  homeDescription:
    "Freelance web designer and developer. Landing pages from $150, business websites from $400, real-time 3D websites and AI tools. Open 11 live 3D sites.",
  siteName: "Alhassan Alfarran — Web Design",
  caseDescription: (oneLiner: string) => `${oneLiner} A live 3D website by Alhassan Alfarran.`,
  jobTitle: "Web designer and front-end developer",
} as const;

export const skipLink = "Skip to content";

/** Sections in page order, for the section dots (labels are the visible link text for screen readers). */
export const sectionLinks = [
  { id: "work", label: "Work" },
  { id: "services", label: "Services" },
  { id: "process", label: "Process" },
  { id: "about", label: "About" },
  { id: "contact", label: "Contact" },
] as const;

export const sectionDotsLabel = "Sections";

export const navLinks = [
  { label: "Work", href: "/#work" },
  { label: "Services", href: "/#services" },
  { label: "Process", href: "/#process" },
  { label: "About", href: "/#about" },
  { label: "Contact", href: "/#contact" },
] as const;

export const nav = {
  homeLabel: "Alhassan Alfarran — home",
  primaryLabel: "Main",
  cta: { label: "Start a project", href: "/#contact" },
  mobileCta: {
    label: "Message me",
    ariaLabel: "Message me on WhatsApp (opens in a new tab)",
    message: "Hi Alhassan, I found your website and I'd like to talk about a project.",
  },
  menu: { open: "Menu", close: "Close", closeLabel: "Close menu", title: "Menu" },
  theme: {
    toNight: "Night",
    toDay: "Day",
    toNightLabel: "Switch to night mode",
    toDayLabel: "Switch to day mode",
  },
  motion: {
    turnOn: "Turn on full motion",
    reduce: "Reduce motion",
    toastOn: "Full motion is on.",
    toastOff: "Motion is reduced.",
  },
} as const;

/** The few hero strings the client needs (kept apart so the rest stays out of the JS bundle). */
export const heroUi = {
  hintDesktop: "Move your cursor — the flowers follow the light.",
  hintTouch: "Tap near a flower.",
  reducedPill: "Motion is reduced on this device.",
  reducedButton: "Turn on full motion",
} as const;

export const hero = {
  ...heroUi,
  tag: "Web design · Real-time 3D · AI tools",
  titleBefore: "Websites that feel ",
  titleAccent: "alive",
  titleAfter: ".",
  text: "I'm Alhassan — I design and build landing pages, business websites and interactive 3D sites that load fast, work on every phone and make people stay. Eleven of them are live below. Open one and play with it.",
  primary: { label: "Start a project", href: "#contact" },
  ghost: { label: "See the 11 live sites", href: "#work" },
  micro: "Replies within 24 hours · WhatsApp, Telegram or email",
  figure: "FIG. 01 — THE LIVING SKYLINE · RENDERED ONLY WHEN SOMETHING MOVES",
  goldenHour: "GOLDEN HOUR — THE LIGHTS COME ON AS YOU SCROLL",
  midnight: "MIDNIGHT — THE CITY GOES QUIET",
} as const;

export const proof = {
  label: "At a glance",
  items: [
    { numeral: "11", text: "live websites with real-time 3D — open any of them" },
    { numeral: "60 fps", text: "the target on an everyday laptop, not just a gaming PC" },
    { numeral: "1", text: "person from first message to launch — you talk to the one who builds it" },
    { numeral: "24 h", text: "to reply, with ideas and a price" },
  ],
} as const;

/** The work section's server-rendered intro (not needed by the client gallery). */
export const workIntro = {
  eyebrow: "01 — Selected work",
  title: "Don't take my word for it. Open them.",
  lead: "Eleven working websites with real-time 3D, each built from scratch for a fictional brand — a coffee house, a nail studio, a watchmaker, a festival. Find the one closest to your business and try it.",
  note: "Concept projects for fictional brands — real, working code.",
  skip: "Skip the gallery",
} as const;

export const work = {
  filterLabel: "Show work for",
  filterAll: "Everything",
  prev: "Previous project",
  next: "Next project",
  viewList: "View as list",
  view3d: "View in 3D",
  hint3d: "Scroll to walk the glasshouse · drag or use ← → · click a pane to open it",
  hint3dReduced: "Scroll or use ← → to move between projects.",
  hintCards: "Swipe for more →",
  tryThis: "Try this:",
  openProject: "Open project",
  liveSite: "Live site",
  liveSoon: "Live link coming soon",
  // the accessible name starts with the visible text (WCAG 2.5.3)
  liveSiteLabel: (name: string) => `Live site: ${name} (opens in a new tab)`,
  filterAnnounce: (n: number, label: string | null) => `Showing ${n} ${n === 1 ? "project" : "projects"}${label ? ` for ${label}` : ""}.`,
  details: "Details",
  explored: (n: number) => `${n} of 11 explored`,
  exploredAll: "You've explored all eleven. Ready for yours?",
  exploredAllCta: "Start a project",
  liveRegion: (i: number, n: number, name: string, sector: string) => `Showing ${i} of ${n}: ${name}, ${sector}.`,
  screenshotLoading: "Screenshot loading",
  screenshotSoon: "Screenshot coming soon",
  indexLabel: "Projects",
  counterLabel: (i: number, n: number) => `Project ${i} of ${n}`,
  chipLabel: (label: string, count: number) => `${label}, ${count} ${count === 1 ? "project" : "projects"}`,
  openProjectLabel: (name: string) => `Open project: ${name}`,
  detailsLabel: (name: string) => `Details: ${name}`,
  galleryControls: "Gallery controls",
} as const;

export const projectCase = {
  kicker: (order: string, sectorLabel: string) => `${order} / 11 · ${sectorLabel}`,
  signature: "The signature moment",
  tryThis: "Try this",
  howBuilt: "How it's built",
  builtWith: "Built with",
  goodFor: "A good fit for",
  live: "Open the live site",
  liveLabel: (name: string) => `Open the live site: ${name} (opens in a new tab)`,
  liveSoon: "Live link coming soon",
  code: "View the code",
  codeLabel: (name: string) => `View the code for ${name} on GitHub (opens in a new tab)`,
  copyLink: "Copy link",
  linkCopied: "Link copied",
  wantOne: "Want one like this?",
  wantOneLabel: (name: string) => `Want one like this? Ask about a site like ${name} on WhatsApp (opens in a new tab)`,
  wantOneMessage: (name: string) =>
    `Hi Alhassan, I saw ${name} on your website and I'd like something similar for my business.`,
  close: "Close project details",
  panelNav: "More projects",
  previousShort: "Previous",
  nextShort: "Next",
  previous: (name: string) => `Previous: ${name}`,
  next: (name: string) => `Next: ${name}`,
  back: "← Back to all work",
  ctaTitle: (name: string) => `Want something like ${name} for your business?`,
  ctaText: "Tell me what you sell and who it's for. You'll get ideas and a price within 24 hours.",
  ctaWhatsApp: "Message on WhatsApp",
  ctaTelegram: "Message on Telegram",
  ctaEmail: "Send an email",
  emailSubject: (name: string) => `Website like ${name}`,
  footnote: "Concept project — fictional brand.",
  desktopShot: "Desktop view",
  mobileShot: "Phone view",
} as const;

export type ServiceIcon = "landing" | "business" | "three" | "ai";

export const services = {
  eyebrow: "02 — Services",
  title: "What I can build for you",
  lead: "From one page that sells to a full website with 3D. Prices are starting points — you get a clear, fixed price before any work starts.",
  cta: "Ask about this",
  ctaMessage: (service: string, price: string) => `Hi Alhassan, I'm interested in ${service} (${price}).`,
  ctaLabel: (service: string) => `Ask about this: ${service} on WhatsApp (opens in a new tab)`,
  items: [
    {
      icon: "landing" as ServiceIcon,
      title: "Landing pages",
      body: "One focused page that turns visitors into customers — for a product, a launch or an ad campaign. A clear offer, fast loading, and a button people actually press.",
      price: "From $150",
      goodFor: "Good for: launches, ads, events, a single product or service.",
      extra: null,
    },
    {
      icon: "business" as ServiceIcon,
      title: "Business websites",
      body: "A complete multi-page site for shops, restaurants, clinics and services: menu or catalogue, booking or contact, map and opening hours. Mobile-friendly, fast and easy to update.",
      price: "From $400",
      goodFor: "Good for: cafés, salons, clinics, agencies and local shops.",
      extra: null,
    },
    {
      icon: "three" as ServiceIcon,
      title: "3D & interactive websites",
      body: "The kind of site you see above: a product you can turn, a building you can explore, a scene that reacts to your visitors. Real-time 3D that still opens fast on a phone.",
      price: "Custom quote",
      goodFor: "Good for: product launches, real estate, premium brands and events.",
      extra: { label: "See 11 examples ↑", href: "#work" },
    },
    {
      icon: "ai" as ServiceIcon,
      title: "AI tools & automation",
      body: "Chatbots, smart forms and small tools that save your team hours every week: answer common questions, sort enquiries, draft replies and connect the apps you already use.",
      price: "Custom quote",
      goodFor: "Good for: busy inboxes, support, bookings and repetitive tasks.",
      extra: null,
    },
  ],
} as const;

export const processSection = {
  eyebrow: "03 — Process",
  title: "Simple, fast, clear",
  lead: "Four steps, no surprises. You always know what's happening and what it costs.",
  steps: [
    {
      n: "01",
      title: "Talk",
      text: "You tell me about your business, your customers and a few sites you like. A short call or a handful of messages is enough.",
    },
    {
      n: "02",
      title: "Design",
      text: "You get a first version within days, not weeks — a real page you can open on your phone, not a flat picture.",
    },
    {
      n: "03",
      title: "Refine",
      text: "We adjust it together until it feels exactly right. Every change shows up on your private preview link.",
    },
    {
      n: "04",
      title: "Launch",
      text: "Your site goes live on fast hosting with your domain, ready for customers. I stay available for fixes and updates.",
    },
  ],
} as const;

export const about = {
  eyebrow: "04 — About",
  title: "One person, from first message to launch.",
  paragraphs: [
    "I'm Alhassan Alfarran, a web designer and front-end developer. I design the page, write the code and put it online — so the person you explain your business to is the person who builds it.",
    "I care about the details people feel but rarely name: a site that opens instantly on a mid-range phone, buttons big enough for thumbs, text that's easy to read, motion that never gets in the way. Every 3D scene in my ten newest sites is modelled in code, renders only when something changes, and is tested on an ordinary laptop.",
    "Want the bigger picture? My main portfolio has my full experience and other projects.",
  ],
  links: [
    { label: "Visit my main portfolio ↗", href: contact.mainPortfolio, ariaLabel: "Visit my main portfolio (opens in a new tab)" },
    { label: "GitHub ↗", href: contact.github, ariaLabel: "GitHub profile (opens in a new tab)" },
  ],
} as const;

export const herbarium = {
  label: "Specimen card",
  fields: [
    { field: "Name", value: "Alhassan Alfarran" },
    { field: "Role", value: "Web designer & front-end developer" },
    { field: "Speciality", value: "Business websites and real-time 3D" },
    { field: "Works", value: "Remotely, with clients anywhere" },
    // Owner to confirm the languages line before launch.
    { field: "Languages", value: "English · Russian · Arabic" },
    { field: "Replies", value: "Within 24 hours" },
  ],
} as const;

const contactMessage = "Hi Alhassan, I found your website and I'd like to talk about a project.";

export const contactSection = {
  eyebrow: "05 — Contact",
  title: "Let's build something beautiful.",
  text: "Tell me about your project — what you sell, who it's for and a site you like. I'll reply within 24 hours with ideas and a price.",
  channels: [
    {
      id: "whatsapp",
      label: "WhatsApp",
      value: contact.whatsapp.display,
      action: "Message on WhatsApp →",
      href: waLink(contactMessage),
      external: true,
      ariaLabel: "WhatsApp, +7 919 399-97-49: message on WhatsApp (opens in a new tab)",
    },
    {
      id: "telegram",
      label: "Telegram",
      value: contact.telegram.handle,
      action: "Message on Telegram →",
      href: contact.telegram.url,
      external: true,
      ariaLabel: "Telegram, @hassan_9400: message on Telegram (opens in a new tab)",
    },
    {
      id: "email",
      label: "Email",
      value: contact.email,
      action: "Send an email →",
      href: mailLink("Website project"),
      external: false,
      ariaLabel: "Email, kyan775909@gmail.com: send an email",
    },
    {
      id: "github",
      label: "GitHub",
      value: "github.com/kyan9400",
      action: "See my code →",
      href: contact.github,
      external: true,
      ariaLabel: "GitHub, github.com/kyan9400: see my code (opens in a new tab)",
    },
  ],
  copy: "Copy",
  copied: "Copied",
  copyLabel: "Copy the email address",
  more: `More about me: ${ghPages ? "kyan9400.github.io/alhassan_portfolio" : "alhassan-portfolio-sigma.vercel.app"} ↗`,
  moreLabel: `More about me: ${ghPages ? "kyan9400.github.io/alhassan_portfolio" : "alhassan-portfolio-sigma.vercel.app"} (opens in a new tab)`,
} as const;

export const footer = {
  tagline: "Web design, 3D websites and AI tools.",
  links: [
    ...navLinks,
    { label: "GitHub ↗", href: contact.github },
    { label: "Main portfolio ↗", href: contact.mainPortfolio },
  ],
  footerNavLabel: "Footer",
  backToTop: "Back to the top ↑",
  copyright: `© ${owner.year} ${owner.name}`,
  disclaimer: "Projects in the gallery are concepts for fictional brands.",
} as const;

export const notFound = {
  title: "This page hasn't grown yet.",
  text: "The link may be old, or the page was never planted. Here's the way back.",
  home: { label: "Back to the home page", href: "/" },
  work: { label: "See the work", href: "/#work" },
} as const;
