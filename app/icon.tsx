// Ícono del sitio (favicon + PWA). Generado en build con next/og — sin
// necesidad de archivos PNG en el repo. Marca "N" blanca sobre azul brand.
import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
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
          borderRadius: 96,
        }}
      >
        <div
          style={{
            color: "#fff",
            fontSize: 300,
            fontWeight: 800,
            fontFamily: "Arial, sans-serif",
            display: "flex",
            lineHeight: 1,
            marginTop: -12,
          }}
        >
          N
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 88,
            right: 104,
            width: 56,
            height: 56,
            borderRadius: 28,
            background: "#10B981",
            display: "flex",
            border: "10px solid #fff",
          }}
        />
      </div>
    ),
    size,
  );
}
