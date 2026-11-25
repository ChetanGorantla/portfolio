import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { isRemote } from "./media";

const CONTENT_DIR = path.join(process.cwd(), "content");
const PUBLIC_DIR = path.join(process.cwd(), "public");

export type Status = "resolved" | "shipped" | "in-progress" | "winner" | "operational";
export type Group = "experience" | "project";

/** `before → after`, or a single value when `before` is null. */
export type Metric = { label: string; before: string | null; after: string };

/** An extra headline number in an incident report, beside the metric. */
export type Figure = { value: string; label: string };

export type MediaItem = { src: string; alt: string };

export type Media = {
  type: "video" | "images";
  /** Files that exist in /public, or remote embed URLs. */
  items: MediaItem[];
  /** Local files listed in frontmatter but not added yet. */
  missing: string[];
  alt: string;
};

export type Service = {
  slug: string;
  title: string;
  org: string | null;
  role: string | null;
  dates: string | null;
  group: Group;
  status: Status;
  statusLabel: string;
  featured: boolean;
  order: number;
  metric: Metric | null;
  outcome: string | null;
  summary: string;
  /** Every tool; cards show the first 4, the report shows them all. */
  tags: string[];
  links: { demo: string | null; repo: string | null };
  media: Media | null;
  numbers: Figure[];
  body: string;
};

/** An employer or org on the Experience ledger: its logo (with the SVG's own aspect ratio) or a one-line note. */
export type Org = { name: string; logo: { src: string; width: number; height: number } | null; note: string | null };

export type Profile = {
  name: string;
  tagline: string;
  currently: string[];
  overview: Figure[];
  orgs: Org[];
  links: { github: string | null; linkedin: string | null; email: string | null };
  hero: string;
};

export const GROUPS: { id: Group; anchor: string; label: string }[] = [
  { id: "experience", anchor: "experience", label: "Experience" },
  { id: "project", anchor: "projects", label: "Projects" },
];

const STATUSES: Status[] = ["resolved", "shipped", "in-progress", "winner", "operational"];

function read(file: string) {
  return matter(fs.readFileSync(path.join(CONTENT_DIR, file), "utf8"));
}

function fail(file: string, message: string): never {
  throw new Error(`content/${file}: ${message}`);
}

function normalizeMedia(raw: unknown, file: string): Media | null {
  if (!raw || typeof raw !== "object") return null;
  const { type, src = [], alt = [] } = raw as { type?: string | null; src?: string[]; alt?: string[] };
  if (!type) return null;
  if (type !== "video" && type !== "images") fail(file, `unknown media type "${type}"`);

  const items: MediaItem[] = [];
  const missing: string[] = [];
  src.forEach((s, i) => {
    if (isRemote(s) || fs.existsSync(path.join(PUBLIC_DIR, s))) {
      items.push({ src: s, alt: alt[i] ?? alt[0] ?? "" });
    } else {
      missing.push(`public${s}`);
    }
  });
  return { type, items, missing, alt: alt[0] ?? "" };
}

function parseService(file: string): Service {
  const { data, content } = read(path.join("services", file));
  const slug = file.replace(/\.mdx$/, "");
  if (data.slug !== slug) fail(file, `slug "${data.slug}" must match the filename`);
  for (const key of ["title", "group", "status", "summary"]) {
    if (!data[key]) fail(file, `missing "${key}"`);
  }
  if (!GROUPS.some((g) => g.id === data.group)) fail(file, `unknown group "${data.group}"`);
  if (!STATUSES.includes(data.status)) fail(file, `unknown status "${data.status}"`);

  return {
    slug,
    title: data.title,
    org: data.org ?? null,
    role: data.role ?? null,
    dates: data.dates ?? null,
    group: data.group,
    status: data.status,
    statusLabel: data.statusLabel ?? data.status,
    featured: Boolean(data.featured),
    order: data.order ?? 99,
    metric: data.metric ?? null,
    outcome: data.outcome ?? null,
    summary: data.summary,
    tags: data.tags ?? [],
    links: { demo: data.links?.demo ?? null, repo: data.links?.repo ?? null },
    media: normalizeMedia(data.media, file),
    numbers: data.numbers ?? [],
    body: content,
  };
}

let services: Service[] | null = null;

/** All services, in dashboard grid order (by group, then `order`). */
export function getServices(): Service[] {
  if (!services) {
    const groupIndex = (g: Group) => GROUPS.findIndex((x) => x.id === g);
    services = fs
      .readdirSync(path.join(CONTENT_DIR, "services"))
      .filter((f) => f.endsWith(".mdx"))
      .map(parseService)
      .sort((a, b) => groupIndex(a.group) - groupIndex(b.group) || a.order - b.order);
  }
  return services;
}

export function getService(slug: string): Service | undefined {
  return getServices().find((s) => s.slug === slug);
}

/** The next card in grid order, wrapping around at the end. */
export function getNextService(slug: string): Service {
  const all = getServices();
  const i = all.findIndex((s) => s.slug === slug);
  return all[(i + 1) % all.length];
}

/** A logo's intrinsic size, from its SVG viewBox, so it can be drawn at any width without layout shift. */
function logoSize(src: string) {
  const svg = fs.readFileSync(path.join(PUBLIC_DIR, src), "utf8");
  const box = svg.match(/viewBox="[\d.-]+[ ,]+[\d.-]+[ ,]+([\d.]+)[ ,]+([\d.]+)"/);
  if (!box) fail("profile.mdx", `${src} has no viewBox`);
  return { src, width: Number(box[1]), height: Number(box[2]) };
}

export function getProfile(): Profile {
  const { data, content } = read("profile.mdx");
  const orgs: Org[] = (data.orgs ?? []).map((o: { name: string; logo?: string | null; note?: string | null }) => ({
    name: o.name,
    logo: o.logo ? logoSize(o.logo) : null,
    note: o.note ?? null,
  }));
  return { ...(data as Omit<Profile, "hero" | "orgs">), orgs, hero: content };
}

/** The org entry for a service's `org`, or a plain one (name only) if profile.mdx doesn't list it. */
export function getOrg(name: string): Org {
  return getProfile().orgs.find((o) => o.name === name) ?? { name, logo: null, note: null };
}

/** Body of a plain MDX file (oncall.mdx). */
export function getDoc(name: "oncall"): string {
  return read(`${name}.mdx`).content;
}
