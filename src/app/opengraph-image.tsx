import { ImageResponse } from "next/og";

export const alt = "Huge Recruitment";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px",
          background: "linear-gradient(135deg, #022448 0%, #1e3a5f 100%)",
          color: "#ffffff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
            marginBottom: "40px",
          }}
        >
          <div
            style={{
              display: "flex",
              width: "56px",
              height: "56px",
              borderRadius: "12px",
              background: "#d5e3ff",
              color: "#022448",
              alignItems: "center",
              justifyContent: "center",
              fontSize: "28px",
              fontWeight: 700,
            }}
          >
            HR
          </div>
          <div style={{ display: "flex", fontSize: "28px", letterSpacing: "0.08em", opacity: 0.8 }}>
            HUGE RECRUITMENT
          </div>
        </div>
        <div style={{ display: "flex", fontSize: "64px", fontWeight: 700, lineHeight: 1.15, maxWidth: "900px" }}>
          Specialist industrial recruitment across the UK
        </div>
        <div style={{ display: "flex", fontSize: "28px", marginTop: "28px", opacity: 0.85 }}>
          hugerecruitment.co.uk
        </div>
      </div>
    ),
    { ...size }
  );
}
