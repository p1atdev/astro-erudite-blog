import type { APIContext, APIRoute } from "astro";
import { getAllIndexablePosts } from "@/lib/data-utils";
import { SITE } from "@/consts";
import { formatDate } from "@/lib/utils";

const postUrl = (baseUrl: string, postId: string) => {
  return `${baseUrl}/blog/${postId}/`;
};

const linkText = (text: string, href: string) => {
  return `[${text}](${href})`;
};

const llmsTxt = (
  context: APIContext,
  posts: Awaited<ReturnType<typeof getAllIndexablePosts>>,
) => {
  const baseUrl = context.site?.toString() ?? SITE.href;
  const content = `# ${SITE.title}
URL: ${baseUrl}

> ${SITE.description}

You can access the raw markdown text by adding \`.txt\` to the URL of any listed blog post, e.g. ${baseUrl}/blog/hello-world.txt

## Posts
${posts.length} posts available:

`;
  const contentWithLinks = posts.reduce((acc, post) => {
    const link = `- ${linkText(post.data.title, postUrl(baseUrl, post.id))}: ${post.data.description} (${formatDate(post.data.date)})`;

    return acc + link + "\n";
  }, content);

  return contentWithLinks;
};

export const GET: APIRoute = async (context: APIContext) => {
  const posts = await getAllIndexablePosts();

  const txt = llmsTxt(context, posts);

  return new Response(txt, {
    headers: {
      "Content-Type": "text/markdown; charset=utf-8",
    },
  });
};
