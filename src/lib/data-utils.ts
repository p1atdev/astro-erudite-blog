import { type CollectionEntry, getCollection, render } from "astro:content";
import { calculateWordCountFromHtml, readingTime } from "@/lib/utils";
import { z } from "astro/zod";

export async function getAllAuthors(): Promise<CollectionEntry<"authors">[]> {
  return await getCollection("authors");
}

export function isPublishedOrDevMode(post: CollectionEntry<"blog">): boolean {
  if (import.meta.env.DEV) {
    return true;
  }
  return !post.data.draft;
}

export async function getAllPosts(): Promise<CollectionEntry<"blog">[]> {
  const posts = await getCollection("blog");
  return posts
    .filter((post) => isPublishedOrDevMode(post) && !isSubpost(post))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export async function getAllPostsAndSubposts(): Promise<
  CollectionEntry<"blog">[]
> {
  const posts = await getCollection("blog");
  return posts
    .filter((post) => isPublishedOrDevMode(post))
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
}

export async function getAllProjects(): Promise<CollectionEntry<"projects">[]> {
  const projects = await getCollection("projects");
  return projects.sort((a, b) => {
    const dateA = a.data.startDate?.getTime() || 0;
    const dateB = b.data.startDate?.getTime() || 0;
    return dateB - dateA;
  });
}

export async function getAllTags(): Promise<Map<string, number>> {
  const posts = await getAllPosts();
  return posts.reduce((acc, post) => {
    post.data.tags?.forEach((tag) => {
      acc.set(tag, (acc.get(tag) || 0) + 1);
    });
    return acc;
  }, new Map<string, number>());
}

export async function getAdjacentPosts(
  post: CollectionEntry<"blog">,
  currentId: string,
): Promise<{
  newer: CollectionEntry<"blog"> | null;
  older: CollectionEntry<"blog"> | null;
  parent: CollectionEntry<"blog"> | null;
}> {
  const allPosts = await getAllPosts();

  if (isSubpost(post)) {
    const parentId = getParentId(currentId);
    const allPosts = await getAllPosts();
    const parent = allPosts.find((post) => post.id === parentId) || null;

    const posts = await getCollection("blog");
    const subposts = posts
      .filter(
        (post) =>
          isSubpost(post) &&
          getParentId(post.id) === parentId &&
          isPublishedOrDevMode(post),
      )
      .sort((a, b) => {
        const dateDiff = a.data.date.valueOf() - b.data.date.valueOf();
        if (dateDiff !== 0) return dateDiff;

        const orderA = a.data.order ?? 0;
        const orderB = b.data.order ?? 0;
        return orderA - orderB;
      });

    const currentIndex = subposts.findIndex((post) => post.id === currentId);
    if (currentIndex === -1) {
      return { newer: null, older: null, parent };
    }

    return {
      newer:
        currentIndex < subposts.length - 1 ? subposts[currentIndex + 1] : null,
      older: currentIndex > 0 ? subposts[currentIndex - 1] : null,
      parent,
    };
  }

  const parentPosts = allPosts.filter((post) => !isSubpost(post));
  const currentIndex = parentPosts.findIndex((post) => post.id === currentId);

  if (currentIndex === -1) {
    return { newer: null, older: null, parent: null };
  }

  return {
    newer: currentIndex > 0 ? parentPosts[currentIndex - 1] : null,
    older:
      currentIndex < parentPosts.length - 1
        ? parentPosts[currentIndex + 1]
        : null,
    parent: null,
  };
}

export async function getPostsByAuthor(
  authorId: string,
): Promise<CollectionEntry<"blog">[]> {
  const posts = await getAllPosts();
  return posts.filter((post) => post.data.authors?.includes(authorId));
}

export async function getPostsByTag(
  tag: string,
): Promise<CollectionEntry<"blog">[]> {
  const posts = await getAllPosts();
  return posts.filter((post) => post.data.tags?.includes(tag));
}

export async function getRecentPosts(
  count: number,
): Promise<CollectionEntry<"blog">[]> {
  const posts = await getAllPosts();
  return posts.slice(0, count);
}

export async function getSortedTags(): Promise<
  { tag: string; count: number }[]
> {
  const tagCounts = await getAllTags();
  return [...tagCounts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => {
      const countDiff = b.count - a.count;
      return countDiff !== 0 ? countDiff : a.tag.localeCompare(b.tag);
    });
}

export function getParentId(subpostId: string): string {
  return subpostId.split("/").slice(0, -1).join("/");
}

export async function getSubpostsForParent(
  parentId: string,
): Promise<CollectionEntry<"blog">[]> {
  const posts = await getCollection("blog");
  return posts
    .filter(
      (post) =>
        isPublishedOrDevMode(post) &&
        isSubpost(post) &&
        getParentId(post.id) === parentId,
    )
    .sort((a, b) => {
      const dateDiff = a.data.date.valueOf() - b.data.date.valueOf();
      if (dateDiff !== 0) return dateDiff;

      const orderA = a.data.order ?? 0;
      const orderB = b.data.order ?? 0;
      return orderA - orderB;
    });
}

export function groupPostsByYear(
  posts: CollectionEntry<"blog">[],
): Record<string, CollectionEntry<"blog">[]> {
  return posts.reduce(
    (acc: Record<string, CollectionEntry<"blog">[]>, post) => {
      const year = post.data.date.getFullYear().toString();
      if (!acc[year]) {
        acc[year] = [];
      }
      acc[year].push(post);
      return acc;
    },
    {},
  );
}

export async function hasSubposts(postId: string): Promise<boolean> {
  const subposts = await getSubpostsForParent(postId);
  return subposts.length > 0;
}

export function isSubpost(post: CollectionEntry<"blog">): boolean {
  return post.data?.isSubpost && post.id.split("/").length > 1;
}

export async function getParentPost(
  subpostId: string,
): Promise<CollectionEntry<"blog"> | null> {
  const parentId = getParentId(subpostId);
  const allPosts = await getAllPosts();
  return allPosts.find((post) => post.id === parentId) || null;
}

export async function parseAuthors(authorIds: string[] = []) {
  if (!authorIds.length) return [];

  const allAuthors = await getAllAuthors();
  const authorMap = new Map(allAuthors.map((author) => [author.id, author]));

  return authorIds.map((id) => {
    const author = authorMap.get(id);
    return {
      id,
      name: author?.data?.name || id,
      avatar: author?.data?.avatar || "/static/logo.png",
      isRegistered: !!author,
    };
  });
}

export async function getPostById(
  postId: string,
): Promise<CollectionEntry<"blog"> | null> {
  const allPosts = await getAllPostsAndSubposts();
  return allPosts.find((post) => post.id === postId) || null;
}

export async function getSubpostCount(parentId: string): Promise<number> {
  const subposts = await getSubpostsForParent(parentId);
  return subposts.length;
}

export async function getCombinedReadingTime(
  post: CollectionEntry<"blog">,
  locale: string = "en-US",
): Promise<string> {
  if (!post) return readingTime({ words: 0, characters: 0 });

  let { words, characters } = calculateWordCountFromHtml(post.body);

  if (!isSubpost(post)) {
    const subposts = await getSubpostsForParent(post.id);
    for (const subpost of subposts) {
      const subpostCount = calculateWordCountFromHtml(subpost.body);
      words += subpostCount.words;
      characters += subpostCount.characters;
    }
  }

  return readingTime(
    {
      words,
      characters,
    },
    locale,
  );
}

export async function getPostReadingTime(
  postId: string,
  locale: string = "en-US",
): Promise<string> {
  const post = await getPostById(postId);
  if (!post) return readingTime({ words: 0, characters: 0 });

  const wordCount = calculateWordCountFromHtml(post.body);
  return readingTime(wordCount, locale);
}

export function formatTotal(text: string, locale: string = "en-US"): string {
  switch (locale) {
    case "ja-JP": {
      return `合計 ${text}`;
    }
    default: {
      return `${text} total`;
    }
  }
}

export type TOCHeading = {
  slug: string;
  text: string;
  depth: number;
  isSubpostTitle?: boolean;
};

export type TOCSection = {
  type: "parent" | "subpost";
  title: string;
  headings: TOCHeading[];
  subpostId?: string;
};

export async function getTOCSections(
  post: CollectionEntry<"blog">,
): Promise<TOCSection[]> {
  const postId = post.id;
  if (!post) return [];

  const parentId = isSubpost(post) ? getParentId(postId) : postId;
  const parentPost = isSubpost(post) ? await getPostById(parentId) : post;

  if (!parentPost) return [];

  const sections: TOCSection[] = [];

  const { headings: parentHeadings } = await render(parentPost);
  if (parentHeadings.length > 0) {
    sections.push({
      type: "parent",
      title: "Overview",
      headings: parentHeadings.map((heading) => ({
        slug: heading.slug,
        text: heading.text,
        depth: heading.depth,
      })),
    });
  }

  const subposts = await getSubpostsForParent(parentId);
  for (const subpost of subposts) {
    const { headings: subpostHeadings } = await render(subpost);
    if (subpostHeadings.length > 0) {
      sections.push({
        type: "subpost",
        title: subpost.data.title,
        headings: subpostHeadings.map((heading, index) => ({
          slug: heading.slug,
          text: heading.text,
          depth: heading.depth,
          isSubpostTitle: index === 0,
        })),
        subpostId: subpost.id,
      });
    }
  }

  return sections;
}

export const licenseSchema = z.object({
  // "cc-by 4.0" -> { type: "by", version: "4.0" }
  // "cc-by" -> { type: "by", version: "4.0" }
  // "cc-zero" -> { type: "zero" }
  // "cc-by sa" -> { type: "sa", version: "4.0" }
  // "cc-by-nc" -> { type: "nc", version: "4.0" }
  type: z.enum(["by", "sa", "nc", "nd", "zero"]),
  version: z.enum(["4.0", "1.0"]).optional(),
});

export type License = z.infer<typeof licenseSchema>;

export const licenseToName = (license: License): string => {
  const { type, version } = license;
  const text = {
    zero: "CC0 1.0",
    by: `CC BY ${version}`,
    sa: `CC BY-SA ${version}`,
    nc: `CC BY-NC ${version}`,
    nd: `CC BY-ND ${version}`,
  }[type];

  return text;
};
