import type { APIContext, APIRoute } from "astro";
import {
  getAllPostsAndSubposts,
  licenseSchema,
  licenseToName,
  type License,
} from "@/lib/data-utils";
import { ROBOTS_NOINDEX_DIRECTIVES } from "@/lib/robots";
import { SITE } from "@/consts";
import type { CollectionEntry } from "astro:content";

export async function getStaticPaths() {
  const posts = await getAllPostsAndSubposts();
  return posts.map((post) => ({
    params: { id: post.id },
    props: post,
  }));
}

const postToMarkdown = (license: License, body: string) => {
  const licenseName = licenseToName(license);
  const text = `License: ${licenseName}

${body}`;
  return text;
};

export const GET: APIRoute<CollectionEntry<"blog">> = async (
  context: APIContext<CollectionEntry<"blog">>,
) => {
  const post = context.props;

  const { body } = post;
  if (typeof body !== "string") {
    throw new Error(`Missing markdown body for blog post: ${post.id}`);
  }

  const license = licenseSchema
    .default(SITE.defaultLicense)
    .parse(post.data.license);

  const txt = postToMarkdown(license, body);
  const headers = new Headers({
    "Content-Type": "text/markdown; charset=utf-8",
  });

  if (post.data.noindex) {
    headers.set("X-Robots-Tag", ROBOTS_NOINDEX_DIRECTIVES);
  }

  return new Response(txt, {
    headers,
  });
};
