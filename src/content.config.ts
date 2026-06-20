import { glob } from "astro/loaders";
import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { licenseSchema } from "./lib/data-utils";

const blog = defineCollection({
  loader: glob({ base: "./src/content/blog", pattern: "**/*.{md,mdx}" }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      description: z.string(),
      date: z.coerce.date(),
      order: z.number().optional(),
      image: image().optional(),
      tags: z.array(z.string()).optional(),
      authors: z.array(z.string()).optional(),
      draft: z.boolean().optional(),
      noindex: z.boolean().default(false),
      license: z
        .preprocess((val) => {
          if (!val) return null;
          if (typeof val !== "string") {
            throw new Error(`Invalid license format: ${val}`);
          }

          const match = val.match(
            /cc(?:\s|-)(by|sa|nc|nd|zero)(?:\s(\d+\.\d+))?/,
          );
          if (!match) throw new Error(`Invalid license format: ${val}`);
          const type = match[1];
          const version = match[2] ? match[2] : undefined;

          const result = licenseSchema.safeParse({
            type,
            version,
          });
          if (!result.success) {
            console.warn(
              `Invalid license format: ${val}. Error: ${result.error.message}`,
            );
            return null;
          }
          return result.data;
        }, licenseSchema)
        .optional(),
      isSubpost: z.boolean().default(false),
    }),
});

const authors = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/authors" }),
  schema: z.object({
    name: z.string(),
    pronouns: z.string().optional(),
    avatar: z.url().or(z.string().startsWith("/")),
    bio: z.string().optional(),
    mail: z.email().optional(),
    website: z.url().optional(),
    twitter: z.url().optional(),
    github: z.url().optional(),
    linkedin: z.url().optional(),
    discord: z.url().optional(),
  }),
});

const projects = defineCollection({
  loader: glob({ pattern: "**/*.{md,mdx}", base: "./src/content/projects" }),
  schema: ({ image }) =>
    z.object({
      name: z.string(),
      description: z.string(),
      tags: z.array(z.string()),
      image: image(),
      link: z.url(),
      startDate: z.coerce.date().optional(),
      endDate: z.coerce.date().optional(),
    }),
});

export const collections = { blog, authors, projects };
