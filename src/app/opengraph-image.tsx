import { ImageResponse } from "next/og";

export const runtime = "edge";
export const alt = "TRANSPE — Payments. Powered for Bharat.";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default async function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 80,
          // TRANSPE gradient — deep navy with a teal glow
          background:
            "radial-gradient(60% 80% at 20% 20%, rgba(31,59,139,0.55) 0%, rgba(31,59,139,0) 60%), radial-gradient(50% 60% at 100% 100%, rgba(23,184,166,0.42) 0%, rgba(23,184,166,0) 60%), linear-gradient(135deg, #0b1740 0%, #172b6b 50%, #0e5f58 100%)",
          color: "white",
          fontFamily: "system-ui, sans-serif"
        }}
      >
        {/* Top: logo lockup — teal squircle + wordmark */}
        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <svg width="86" height="86" viewBox="0 0 48 48" fill="none">
            <rect x="0" y="0" width="48" height="48" rx="12" fill="#17B8A6" />
            <polygon points="15,10 21,10 18,5" fill="#172B6B" />
            <path
              d="M12 15 H25 M18 11 V36 Q18 39 21 39 H24"
              stroke="#172B6B"
              strokeWidth="4.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            <circle cx="33" cy="26" r="7" stroke="#FFFFFF" strokeWidth="4.5" fill="none" />
            <line x1="28" y1="24" x2="28" y2="42" stroke="#FFFFFF" strokeWidth="4.5" strokeLinecap="round" />
          </svg>
          <div style={{ fontSize: 56, fontWeight: 800, letterSpacing: -1 }}>
            TRANSPE
          </div>
        </div>

        {/* Middle headline */}
        <div style={{ display: "flex", flexDirection: "column", maxWidth: 920 }}>
          <div
            style={{
              fontSize: 80,
              fontWeight: 800,
              lineHeight: 1.05,
              letterSpacing: -2
            }}
          >
            Powering Payments for a{" "}
            <span
              style={{
                background:
                  "linear-gradient(90deg, #58d7bf 0%, #93e8d7 100%)",
                backgroundClip: "text",
                color: "transparent"
              }}
            >
              Digital Bharat
            </span>
          </div>
          <div
            style={{
              marginTop: 24,
              fontSize: 26,
              color: "rgba(255,255,255,0.82)",
              maxWidth: 880,
              lineHeight: 1.4
            }}
          >
            Payment gateway, POS machines, QR collections, AePS, money
            transfer, recharges and bill payments — in one dashboard.
          </div>
        </div>

        {/* Bottom strip */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            paddingTop: 28,
            borderTop: "1px solid rgba(255,255,255,0.15)",
            color: "rgba(255,255,255,0.75)",
            fontSize: 20
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <span style={{ fontWeight: 600 }}>transpe.net</span>
            <span>·</span>
            <span>support@transpe.net</span>
          </div>
          <div style={{ display: "flex", gap: 18 }}>
            {["PG", "POS", "QR", "AePS", "DMT", "BBPS"].map((tag) => (
              <span
                key={tag}
                style={{
                  padding: "8px 16px",
                  borderRadius: 999,
                  background: "rgba(255,255,255,0.14)",
                  border: "1px solid rgba(255,255,255,0.22)",
                  fontSize: 18,
                  fontWeight: 600
                }}
              >
                {tag}
              </span>
            ))}
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
