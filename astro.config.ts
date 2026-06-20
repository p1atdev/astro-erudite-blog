import { rehypeHeadingIds } from "@astrojs/markdown-remark";
import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import { pluginCollapsibleSections } from "@expressive-code/plugin-collapsible-sections";
import { pluginLineNumbers } from "@expressive-code/plugin-line-numbers";
import tailwindcss from "@tailwindcss/vite";
import type { AstroIntegration } from "astro";
import { defineConfig } from "astro/config";
import expressiveCode from "astro-expressive-code";
import icon from "astro-icon";
import rehypeDocument from "rehype-document";
import rehypeExternalLinks from "rehype-external-links";
import rehypeKatex from "rehype-katex";
import rehypePrettyCode from "rehype-pretty-code";
import remarkEmoji from "remark-emoji";
import remarkMath from "remark-math";
import swup from "@swup/astro";
import pagefind from "astro-pagefind";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeLinkCard from "./src/lib/rehype/link-card";
import embeds from "astro-embed/integration";
import { SITE } from "./src/consts";
import {
  getNoindexBlogIds,
  isNoindexBlogUrl,
  writeNoindexHeadersFile,
} from "./utils/noindex-posts";

const noindexBlogIds = getNoindexBlogIds();
const noindexHeaders = (noindexIds: Set<string>): AstroIntegration => ({
  name: "noindex-headers",
  hooks: {
    "astro:build:done": ({ dir }) => {
      writeNoindexHeadersFile(dir, noindexIds);
    },
  },
});

export default defineConfig({
  site: "https://blog.p1at.dev",
  integrations: [
    expressiveCode({
      themes: ["github-light", "github-dark"],
      plugins: [pluginCollapsibleSections(), pluginLineNumbers()],
      useDarkModeMediaQuery: false,
      themeCssSelector: (theme) => `[data-theme="${theme.name.split("-")[1]}"]`,
      defaultProps: {
        wrap: true,
        collapseStyle: "collapsible-auto",
        overridesByLang: {
          "ansi,bat,bash,batch,cmd,console,powershell,ps,ps1,psd1,psm1,sh,shell,shellscript,shellsession,text,zsh":
            {
              showLineNumbers: false,
            },
        },
      },
      styleOverrides: {
        codeFontSize: "0.75rem",
        borderColor: "var(--border)",
        codeFontFamily: "var(--font-mono)",
        codeBackground:
          "color-mix(in oklab, var(--secondary) 25%, transparent)",
        frames: {
          editorActiveTabForeground: "var(--muted-foreground)",
          editorActiveTabBackground:
            "color-mix(in oklab, var(--secondary) 25%, transparent)",
          editorActiveTabIndicatorBottomColor: "transparent",
          editorActiveTabIndicatorTopColor: "transparent",
          editorTabBorderRadius: "0",
          editorTabBarBackground: "transparent",
          editorTabBarBorderBottomColor: "transparent",
          frameBoxShadowCssValue: "none",
          terminalBackground:
            "color-mix(in oklab, var(--secondary) 25%, transparent)",
          terminalTitlebarBackground: "transparent",
          terminalTitlebarBorderBottomColor: "transparent",
          terminalTitlebarForeground: "var(--muted-foreground)",
        },
        lineNumbers: {
          foreground: "var(--muted-foreground)",
        },
        uiFontFamily: "var(--font-sans)",
      },
    }),
    embeds({
      services: {
        LinkPreview: false,
      },
    }),
    mdx(),
    react(),
    sitemap({
      filter: (page) => !isNoindexBlogUrl(page, noindexBlogIds),
    }),
    noindexHeaders(noindexBlogIds),
    icon(),
    swup({
      accessibility: true,
      preload: true,
      smoothScrolling: true,
      updateHead: true,
      cache: true,
      progress: true,
      containers: ["main", "#mobile-header"],
    }),
    pagefind(),
  ],
  vite: {
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
    experimental: {
      // enableNativePlugin: true,
    },
  },
  server: {
    port: 1234,
    host: true,
  },
  devToolbar: {
    enabled: false,
  },
  markdown: {
    syntaxHighlight: false,
    rehypePlugins: [
      [
        rehypeLinkCard,
        {
          linkcardUrl: SITE.linkcard,
          target: "_blank",
          rel: ["nofollow", "noreferrer", "noopener"],
        },
      ],
      [
        rehypeDocument,
        {
          css: "https://cdn.jsdelivr.net/npm/katex@0.16.21/dist/katex.min.css",
        },
      ],
      [
        rehypeExternalLinks,
        {
          target: "_blank",
          rel: ["nofollow", "noreferrer", "noopener"],
        },
      ],
      rehypeHeadingIds,
      [
        rehypeAutolinkHeadings,
        {
          behavior: "wrap",
        },
      ],
      rehypeKatex,
      [
        rehypePrettyCode,
        {
          theme: {
            light: "github-light",
            dark: "github-dark",
          },
        },
      ],
    ],
    remarkPlugins: [remarkMath, remarkEmoji],
  },
  build: {
    format: "file",
  },
});
