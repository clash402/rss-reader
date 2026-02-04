import { NextResponse } from "next/server";
import { z } from "zod";
import { discoverFeedsFromUrl } from "@/lib/server/feed-discovery";

const requestSchema = z.object({ url: z.string().url() });

export async function POST(request: Request) {
  try {
    const data = await request.json();
    const payload = requestSchema.parse(data);
    const feeds = await discoverFeedsFromUrl(payload.url);
    return NextResponse.json({ feeds });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("invalid") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
