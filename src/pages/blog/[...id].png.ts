import type { APIContext, APIRoute } from "astro";
import { getAllPostsAndSubposts } from "@/lib/data-utils";
import { ROBOTS_NOINDEX_DIRECTIVES } from "@/lib/robots";
import type { CollectionEntry } from "astro:content";
import { BlogOgImage } from "@/lib/og-image";

export async function getStaticPaths() {
  const posts = await getAllPostsAndSubposts();
  return posts.map((post) => ({
    params: { id: post.id },
    props: post,
  }));
}

export const GET: APIRoute<CollectionEntry<"blog">> = async (
  context: APIContext<CollectionEntry<"blog">>,
) => {
  const post = context.props;

  const response = await BlogOgImage(post);

  if (post.data.noindex) {
    response.headers.set("X-Robots-Tag", ROBOTS_NOINDEX_DIRECTIVES);
  }

  return response;
};
