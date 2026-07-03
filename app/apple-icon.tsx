// Ícono para iOS (apple-touch-icon, 180x180). Mismo diseño que icon.tsx.
import { ImageResponse } from "next/og";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function AppleIcon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "linear-gradient(140deg, #0D47A1 0%, #1565C0 70%, #2196F3 100%)",
        }}
      >
        <div
          style={{
            color: "#fff",
            fontSize: 108,
            fontWeight: 800,
            fontFamily: "Arial, sans-serif",
            display: "flex",
            lineHeight: 1,
            marginTop: -6,
          }}
        >
          N
        </div>
      </div>
    ),
    size,
  );
}
