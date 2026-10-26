import { ImageResponse } from "next/og";

export const dynamic = "force-static";

export function GET() {
  return new ImageResponse(
    (
      <div style={{ width: 180, height: 180, display: "flex", alignItems: "center", justifyContent: "center", background: "#9b3fd6", color: "#fff", fontSize: 100, fontWeight: 700 }}>
        M
      </div>
    ),
    { width: 180, height: 180 },
  );
}
