import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export function GET() {
  const size = 512;
  return new ImageResponse(
    (
      <div style={{ width: size, height: size, display: "flex", alignItems: "center", justifyContent: "center", background: "#9b3fd6", color: "#fff", fontSize: size * 0.55, fontWeight: 700 }}>
        M
      </div>
    ),
    { width: size, height: size },
  );
}
