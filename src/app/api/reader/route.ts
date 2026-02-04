import { NextResponse } from "next/server";
import { z } from "zod";
import { extractReaderView } from "@/lib/server/reader-extractor";

const schema = z.object({ url: z.string().url() });

export async function POST(request: Request) {
  try {
    const json = await request.json();
    const payload = schema.parse(json);
    const result = await extractReaderView(payload.url);
    return NextResponse.json(result);
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    const status = message.includes("invalid") ? 400 : 500;
    return NextResponse.json({ error: message }, { status });
  }
}
