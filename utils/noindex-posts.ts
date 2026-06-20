import {
  existsSync,
  readdirSync,
  readFileSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { extname, join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";
import { ROBOTS_NOINDEX_DIRECTIVES } from "../src/lib/robots";

const BLOG_CONTENT_DIR = join(process.cwd(), "src", "content", "blog");
const FRONTMATTER_PATTERN = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/;
const MARKDOWN_EXTENSIONS = new Set([".md", ".mdx"]);
const GENERATED_HEADERS_START = "# BEGIN generated noindex blog headers";
const GENERATED_HEADERS_END = "# END generated noindex blog headers";
const GENERATED_HEADERS_PATTERN = new RegExp(
  `\\n?${GENERATED_HEADERS_START}[\\s\\S]*?${GENERATED_HEADERS_END}\\n?`,
  "u",
);

const normalizeContentId = (filePath: string): string => {
  const relativePath = relative(BLOG_CONTENT_DIR, filePath)
    .split(sep)
    .join("/");
  const id = relativePath.replace(/\.(md|mdx)$/u, "");
  return id.endsWith("/index") ? id.slice(0, -"/index".length) : id;
};

const getMarkdownFiles = (dir: string): string[] => {
  return readdirSync(dir).flatMap((entry) => {
    const entryPath = join(dir, entry);
    const stat = statSync(entryPath);

    if (stat.isDirectory()) {
      return getMarkdownFiles(entryPath);
    }

    return stat.isFile() && MARKDOWN_EXTENSIONS.has(extname(entryPath))
      ? [entryPath]
      : [];
  });
};

const hasNoindexFrontmatter = (filePath: string): boolean => {
  const content = readFileSync(filePath, "utf-8");
  const frontmatter = content.match(FRONTMATTER_PATTERN)?.[1];
  if (!frontmatter) return false;

  const data = parse(frontmatter);
  return (
    typeof data === "object" &&
    data !== null &&
    !Array.isArray(data) &&
    data.noindex === true
  );
};

export const getNoindexBlogIds = (): Set<string> => {
  return new Set(
    getMarkdownFiles(BLOG_CONTENT_DIR)
      .filter(hasNoindexFrontmatter)
      .map(normalizeContentId),
  );
};

export const isNoindexBlogUrl = (
  pageUrl: string,
  noindexIds: Set<string>,
): boolean => {
  const pathname = decodeURIComponent(new URL(pageUrl).pathname).replace(
    /\/$/u,
    "",
  );

  for (const id of noindexIds) {
    const blogPath = `/blog/${id}`;
    if (
      pathname === blogPath ||
      pathname === `${blogPath}.txt` ||
      pathname === `${blogPath}.png`
    ) {
      return true;
    }
  }

  return false;
};

const noindexHeaderRule = (path: string): string => {
  return `${encodeURI(path)}\n  X-Robots-Tag: ${ROBOTS_NOINDEX_DIRECTIVES}`;
};

const buildNoindexHeadersBlock = (noindexIds: Set<string>): string => {
  const generatedRuleCount = noindexIds.size * 2;
  if (generatedRuleCount > 100) {
    throw new Error(
      `Too many noindex header rules (${generatedRuleCount}). Cloudflare Workers static assets support up to 100 header rules.`,
    );
  }

  const rules = [...noindexIds]
    .sort()
    .flatMap((id) => [
      noindexHeaderRule(`/blog/${id}.txt`),
      noindexHeaderRule(`/blog/${id}.png`),
    ])
    .join("\n\n");

  return [
    GENERATED_HEADERS_START,
    "# Generated from blog frontmatter noindex: true.",
    rules,
    GENERATED_HEADERS_END,
  ].join("\n");
};

export const writeNoindexHeadersFile = (
  outDir: URL,
  noindexIds: Set<string>,
): void => {
  const headersPath = join(fileURLToPath(outDir), "_headers");
  const existing = existsSync(headersPath)
    ? readFileSync(headersPath, "utf-8")
    : "";
  const preserved = existing.replace(GENERATED_HEADERS_PATTERN, "").trimEnd();
  const generated =
    noindexIds.size > 0 ? buildNoindexHeadersBlock(noindexIds) : "";
  const next = [preserved, generated].filter(Boolean).join("\n\n");

  if (next.length === 0) {
    if (existsSync(headersPath)) {
      rmSync(headersPath);
    }
    return;
  }

  writeFileSync(headersPath, `${next}\n`);
};
