import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { isRemote } from "./media";

const CONTENT_DIR = path.join(process.cwd(), "content");
const PUBLIC_DIR = path.join(process.cwd(), "public");

export type Status = "resolved" | "shipped" | "in-progress" | "winner" | "operational";
export type Group = "experience" | "teaching" | "project";

export type Metric = { label: string; before: string; after: string };

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
  tags: string[];
  links: { demo: string | null; repo: string | null };
  media: Media | null;
  stats: string[];
  runbooks: { id: string; title: string }[];
  body: string;
};

export type OverviewTile = { value: string; label: string; href: string; status?: Status };

export type Profile = {
  name: string;
  currently: string[];
  focus: string[];
  previously: string[];
  overview: OverviewTile[];
  links: { resume: string; github: string | null; linkedin: string | null; email: string | null };
  hero: string;
};

export const GROUPS: { id: Group; anchor: string; label: string }[] = [
  { id: "experience", anchor: "experience", label: "Production experience" },
  { id: "teaching", anchor: "runbooks", label: "Runbooks: what I teach" },
  { id: "project", anchor: "projects", label: "Side projects" },
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
    tags: (data.tags ?? []).slice(0, 4),
    links: { demo: data.links?.demo ?? null, repo: data.links?.repo ?? null },
    media: normalizeMedia(data.media, file),
    stats: data.stats ?? [],
    runbooks: data.runbooks ?? [],
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

export function getProfile(): Profile {
  const { data, content } = read("profile.mdx");
  return { ...(data as Omit<Profile, "hero">), hero: content };
}

/** Body of a plain MDX file such as changelog.mdx or oncall.mdx. */
export function getDoc(name: "changelog" | "oncall"): string {
  return read(`${name}.mdx`).content;
}
