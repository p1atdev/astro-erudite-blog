import type { CollectionEntry } from "astro:content";
import React from "react";
import { ImageResponse } from "@vercel/og";
import { SITE } from "@/consts";
import fs from "node:fs";
import path from "node:path";

async function fetchFont(font: string): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=${font}`;

  const css = await fetch(url).then((res) => res.text());

  const fontUrl = css.match(
    /src: url\((.+)\) format\('(opentype|truetype)'\)/,
  )?.[1];

  if (!fontUrl) {
    throw new Error("Font not found");
  }

  const res = await fetch(fontUrl);

  return await res.arrayBuffer();
}

export const fontWeights = {
  Regular: "400",
  Medium: "500",
  SemiBold: "600",
  Bold: "700",
};

export const RedHatDisplayFont = async (
  weight: keyof typeof fontWeights = "Medium",
) => fetchFont(`Red+Hat+Display:wght@${fontWeights[weight]}`);
export const PoppinsDynamicFont = async () => fetchFont("Poppins");
export const MPlus2Font = async (
  weight: keyof typeof fontWeights = "SemiBold",
) => fetchFont(`M+PLUS+2:wght@${fontWeights[weight]}`);
export const IBMPlexSansJPFont = async (
  weight: keyof typeof fontWeights = "Regular",
) => fetchFont(`IBM+Plex+Sans+JP:wght@${fontWeights[weight]}`);
export const ComfortaaFont = async (
  weight: keyof typeof fontWeights = "Medium",
) => fetchFont(`Comfortaa:wght@${fontWeights[weight]}`);

// convert to base64
// Read the SVG file from the public directory, convert it to a base64 data URI
const logoSvg = fs.readFileSync(
  path.join(process.cwd(), "public", "static", "logo.svg"),
  "utf-8",
);
const logoSvgData = `data:image/svg+xml;base64,${Buffer.from(logoSvg).toString("base64")}`;

const generateOgpImage = async (children: React.ReactNode) => {
  const [redHatDisplay, ibmPlexSansJP, comfortaa] = await Promise.all([
    RedHatDisplayFont("SemiBold"),
    IBMPlexSansJPFont("Medium"),
    ComfortaaFont("Bold"),
  ]);

  return new ImageResponse(
    (
      <div
        lang={SITE.locale}
        style={{
          backgroundImage: "linear-gradient(180deg, #faf8ff, #D4CAF7FF)",
          fontFamily: '"Red Hat Display", "IBM Plex Sans JP", sans-serif',
        }}
        tw="relative text-primary w-full h-full flex p-0 m-0"
      >
        {children}
      </div>
    ),
    {
      width: 1200,
      height: 630,
      fonts: [
        {
          name: "Red Hat Display",
          data: redHatDisplay,
          style: "normal",
          weight: 600,
        },
        {
          name: "IBM Plex Sans JP",
          data: ibmPlexSansJP,
          style: "normal",
          weight: 500,
        },
        {
          name: "Comfortaa",
          data: comfortaa,
          style: "normal",
          weight: 700,
        },
      ],
    },
  );
};

export const BlogOgImage = (post: CollectionEntry<"blog">) => {
  const { data } = post as CollectionEntry<"blog">;
  const { title, description, date, tags } = data;

  return generateOgpImage(
    <div
      tw="relative rounded-2xl shadow-sm border px-16 py-12 w-full h-full flex flex-col text-[#19191a]"
      style={{
        gap: "1rem",
      }}
    >
      <div tw="flex w-full text-6xl font-bold ">{title}</div>
      <div
        tw="flex"
        style={{
          gap: "0.5rem",
        }}
      >
        {tags?.map((tag) => (
          <div
            key={tag}
            tw="text-3xl flex justify-center rounded-full bg-[#dcd3f4] text-[#342a51] px-4 py-1 w-fit whitespace-nowrap shrink-0 "
          >
            {tag}
          </div>
        ))}
      </div>
      <div tw="flex grow w-full text-4xl font-semibold text-[#19191a]/80">
        {description}
      </div>

      <div tw="flex justify-between items-baseline">
        <div tw="text-4xl text-[#19191a]/75">
          {date.toLocaleDateString(SITE.locale, {
            year: "numeric",
            month: "long",
            day: "numeric",
          })}
        </div>
        <div
          tw="flex items-baseline pt-2 pb-8 text-5xl font-bold tracking-tight"
          style={{ gap: "0.5rem" }}
        >
          <div tw="flex items-baseline w-11 h-11  fill-[#19191a]">
            <img src={logoSvgData} tw="object-cover" />
          </div>
          {SITE.title}
        </div>
      </div>
    </div>,
  );
};

export const CommonOgImage = (title: string, _description: string) => {
  return generateOgpImage(
    <div tw="relative rounded-2xl border w-full flex flex-col text-[#19191a]">
      <img
        src={logoSvgData}
        tw="object-cover w-[80vh] -top-[7rem] p-0 m-0 absolute -left-[7rem]"
      />

      <div tw=" bottom-[-5rem] p-0 m-0 w-full right-[0rem] w-full absolute text-[18rem] tracking-tighter ">
        {title}
      </div>
    </div>,
  );
};
