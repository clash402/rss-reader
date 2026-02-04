import { NextResponse } from "next/server";
import { z } from "zod";
import { fetchAndParseFeed } from "@/lib/server/feed-parser";

const requestSchema = z.object({
  url: z.string().url(),
  etag: z.string().optional(),
  lastModified: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = requestSchema.parse(json);
    const result = await fetchAndParseFeed(payload.url, {
      etag: payload.etag,
      lastModified: payload.lastModified,
    });

    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("invalid") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
