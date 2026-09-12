import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "DocBrief — Short YouTube documentaries without an editor";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OgImage() {
  return new ImageResponse(
    (
      <div
        style={{
          height: "100%",
          width: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "linear-gradient(135deg, #0f172a 0%, #1e3a5f 45%, #312e81 100%)",
          color: "#f8fafc",
          padding: "64px",
          fontFamily: "ui-sans-serif, system-ui, sans-serif",
        }}
      >
        <div style={{ display: "flex", fontSize: 28, opacity: 0.75 }}>
          WedgeWerks™ · DocBrief
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1, maxWidth: 980 }}>
            Short YouTube documentaries without an editor
          </div>
          <div style={{ fontSize: 30, opacity: 0.9, maxWidth: 900 }}>
            Brief → polished script → TTS → captions → downloadable MP4
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 24, opacity: 0.8 }}>
          Free · Starter $12/mo · Creator $36/mo · docbrief.wedgewerks.win
        </div>
      </div>
    ),
    { ...size },
  );
}
