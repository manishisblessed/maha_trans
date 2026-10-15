import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  darkMode: "class",
  theme: {
    container: {
      center: true,
      padding: {
        DEFAULT: "1rem",
        sm: "1.5rem",
        lg: "2rem",
        xl: "2.5rem"
      },
      screens: {
        "2xl": "1280px"
      }
    },
    extend: {
      colors: {
        // Brand = TRANSPE deep navy (matches the "trans" wordmark)
        brand: {
          50: "#eef2fb",
          100: "#d6def4",
          200: "#adbce9",
          300: "#7f94d8",
          400: "#526fc5",
          500: "#2f4daa",
          600: "#1f3b8b",
          700: "#172b6b",
          800: "#112052",
          900: "#0b1740",
          950: "#060e2a"
        },
        // Accent = TRANSPE teal (matches the "pe" wordmark and app-icon bg)
        accent: {
          50: "#e6fbf7",
          100: "#c3f3e9",
          200: "#93e8d7",
          300: "#58d7bf",
          400: "#2cc4a7",
          500: "#17b8a6",
          600: "#0f9789",
          700: "#0e786d",
          800: "#0e5f58",
          900: "#0d4e49",
          950: "#04302e"
        },
        // Royal = a lifted navy/sky lane used for secondary highlights, pills,
        // nav links, filter chips. Kept as a separate scale so existing
        // `text-royal-700` / `bg-royal-50` className references stay valid —
        // just rendered in-brand on the navy/teal palette.
        royal: {
          50: "#eef4fe",
          100: "#dae7fd",
          200: "#b9d1fb",
          300: "#8bb3f6",
          400: "#5e8ff0",
          500: "#3b6fe3",
          600: "#2855cc",
          700: "#1f3b8b",
          800: "#1a2f6e",
          900: "#172b6b",
          950: "#0b1740"
        },
        // Coral = re-tinted to a warm teal/aqua so existing hover-highlight
        // / alert chips using `coral-400` keep working but land in-brand.
        coral: {
          50: "#eafbf7",
          100: "#cdf4ea",
          200: "#9ce9d7",
          300: "#5fd8be",
          400: "#2fc4a7",
          500: "#17b8a6",
          600: "#0f9789",
          700: "#0e786d",
          800: "#0d5f58",
          900: "#0b4e49",
          950: "#04302e"
        },
        ink: {
          50: "#f5f7fa",
          100: "#eaeef4",
          200: "#cfd7e3",
          300: "#a4b3c8",
          400: "#7388a6",
          500: "#516a8c",
          600: "#3f5473",
          700: "#34445d",
          800: "#2e3a4f",
          900: "#0e1626",
          950: "#070b14"
        }
      },
      fontFamily: {
        // Satoshi is the Transpe body/UI face.
        sans: [
          '"Satoshi"',
          "ui-sans-serif",
          "system-ui",
          "-apple-system",
          "Segoe UI",
          "Roboto",
          "sans-serif"
        ],
        // Clash Display is the Transpe headline face — editorial, confident, bold.
        display: [
          '"Clash Display"',
          '"Satoshi"',
          "ui-sans-serif",
          "system-ui",
          "sans-serif"
        ]
      },
      // Extended radius scale — Transpe leans on larger, squircle-style corners.
      borderRadius: {
        "4xl": "2rem",
        "5xl": "2.5rem"
      },
      backgroundImage: {
        // Transpe premium mesh: navy → royal → teal (quiet, bank-grade)
        "hero-radial":
          "radial-gradient(42% 55% at 18% 12%, rgba(23,43,107,0.22) 0%, rgba(23,43,107,0) 60%), radial-gradient(40% 50% at 82% 20%, rgba(31,59,139,0.18) 0%, rgba(31,59,139,0) 60%), radial-gradient(45% 55% at 25% 100%, rgba(23,184,166,0.16) 0%, rgba(23,184,166,0) 60%), radial-gradient(40% 50% at 90% 95%, rgba(44,196,167,0.14) 0%, rgba(44,196,167,0) 60%)",
        "grid-pattern":
          "linear-gradient(to right, rgba(15,23,42,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(15,23,42,0.06) 1px, transparent 1px)",
        // Primary premium gradient: navy → royal → teal
        "brand-gradient":
          "linear-gradient(120deg, #172b6b 0%, #1f3b8b 45%, #17b8a6 100%)",
        // Signature TRANSPE "energy" gradient — navy → royal → teal, used on
        // primary CTAs, active states and focus rings. The single thing that
        // makes a page feel immediately "Transpe".
        "energy-gradient":
          "linear-gradient(135deg, #172b6b 0%, #1f3b8b 45%, #17b8a6 100%)",
        "energy-gradient-x":
          "linear-gradient(90deg, #172b6b 0%, #1f3b8b 50%, #17b8a6 100%)",
        "aurora-gradient":
          "conic-gradient(from 140deg at 50% 50%, #172b6b 0deg, #1f3b8b 95deg, #17b8a6 205deg, #58d7bf 300deg, #172b6b 360deg)",
        // Fine SVG noise for premium grain overlays
        "grain":
          "url(\"data:image/svg+xml;utf8,<svg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'><filter id='n'><feTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2' stitchTiles='stitch'/><feColorMatrix values='0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0 0.6 0'/></filter><rect width='100%25' height='100%25' filter='url(%23n)' opacity='0.4'/></svg>\")"
      },
      boxShadow: {
        soft: "0 10px 30px -12px rgba(15,23,42,0.18)",
        glow: "0 20px 50px -12px rgba(23,43,107,0.45)",
        "glow-brand": "0 20px 50px -12px rgba(31,59,139,0.45)",
        "glow-coral": "0 20px 50px -12px rgba(23,184,166,0.40)",
        // Signature Transpe colored shadow — navy→teal spread, used on hover
        // of primary surfaces (cards, CTAs).
        "energy": "0 24px 60px -18px rgba(23,43,107,0.45), 0 10px 24px -12px rgba(23,184,166,0.28)",
        "energy-sm": "0 12px 28px -14px rgba(23,43,107,0.40), 0 4px 12px -6px rgba(23,184,166,0.22)",
        "inner-ring": "inset 0 0 0 1px rgba(255,255,255,0.6)"
      },
      keyframes: {
        "fade-up": {
          "0%": { opacity: "0", transform: "translateY(12px)" },
          "100%": { opacity: "1", transform: "translateY(0)" }
        },
        marquee: {
          "0%": { transform: "translateX(0)" },
          "100%": { transform: "translateX(-50%)" }
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" }
        },
        float: {
          "0%, 100%": { transform: "translateY(0px)" },
          "50%": { transform: "translateY(-12px)" }
        },
        "float-slow": {
          "0%, 100%": { transform: "translate(0,0) rotate(0deg)" },
          "50%": { transform: "translate(20px,-30px) rotate(8deg)" }
        },
        spin3d: {
          "0%": { transform: "rotateY(0deg)" },
          "100%": { transform: "rotateY(360deg)" }
        },
        "pulse-ring": {
          "0%": { transform: "scale(1)", opacity: "0.6" },
          "100%": { transform: "scale(2.2)", opacity: "0" }
        },
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" }
        },
        "scroll-y": {
          "0%": { transform: "translateY(0)" },
          "100%": { transform: "translateY(-50%)" }
        },
        // Signature Transpe gradient sweep used on logo + headlines.
        "gradient-sweep": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" }
        },
        // Soft brand-dot pulse used on Logo + online indicators.
        "ping-soft": {
          "0%": { transform: "scale(1)", opacity: "0.75" },
          "80%, 100%": { transform: "scale(2.4)", opacity: "0" }
        }
      },
      animation: {
        "fade-up": "fade-up 0.6s ease-out both",
        marquee: "marquee 30s linear infinite",
        shimmer: "shimmer 2.4s linear infinite",
        float: "float 6s ease-in-out infinite",
        "float-slow": "float-slow 12s ease-in-out infinite",
        spin3d: "spin3d 20s linear infinite",
        "pulse-ring": "pulse-ring 2.4s ease-out infinite",
        "gradient-x": "gradient-x 8s ease infinite",
        "scroll-y": "scroll-y 40s linear infinite",
        "gradient-sweep": "gradient-sweep 6s ease-in-out infinite",
        "ping-soft": "ping-soft 2.4s cubic-bezier(0,0,0.2,1) infinite"
      }
    }
  },
  plugins: []
};

export default config;
