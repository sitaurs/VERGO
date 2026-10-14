import "server-only";
import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

async function artwork() {
  const png = await readFile(join(process.cwd(), "public/images/brand/vergo-logo.png"));
  return `data:image/png;base64,${png.toString("base64")}`;
}

/** CSS frames the approved emblem; no tracing, replacement drawing or edited source image. */
export async function brandIcon(size: number) {
  const scale = size / 550;
  return new ImageResponse(<div style={{ display: "flex", width: size, height: size, overflow: "hidden", background: "white", borderRadius: size * .15, alignItems: "center", justifyContent: "center" }}>
    <div style={{ display: "flex", position: "relative", width: 500 * scale, height: size, overflow: "hidden" }}>
      <img src={await artwork()} alt="" width={2172 * scale} height={724 * scale} style={{ position: "absolute", left: -125 * scale, top: -80 * scale }} />
    </div>
  </div>, { width: size, height: size });
}

export async function brandShareImage() {
  return new ImageResponse(<div style={{ display: "flex", width: 1200, height: 630, background: "white", alignItems: "center", justifyContent: "center" }}>
    <img src={await artwork()} alt="" width={1120} height={1120 / 3} />
  </div>, { width: 1200, height: 630 });
}
