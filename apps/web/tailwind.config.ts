import type { Config } from "tailwindcss";

const config: Config  = {
    content: [
        "./app/**/*.{js,ts,jsx,tsx,mdx}",
        "./components/**/*.{js,ts,jsx,tsx,mdx}"
    ],
    theme: {
        extend: {
            colors: {
                primary: {
                    DEFAULT: "#0f6e56",
                    50: "#E1F5EE",
                    100: "#9FE1CB",
                    400: "#24B1B1",
                    500: "#0F6E56",
                    600: "#0B5A46",
                    700: "#085041",
                },
                neutral: {
                    50: "#FAF9F6",
                    100: "#F1EFE8",
                    500: "#888780",
                    900: "#2C2C2A",
                },
                success: "#639922",
                    warning: "#BA7517",
                    danger: {
                    DEFAULT: "#791F1F",
                    hover: "#A32D2D",
                    light: "#F7C1C1",
                },
            },
            fontSize: {
                xs: ["12px", { lineHeight: "1.4" }],
                sm: ["14px", { lineHeight: "1.4" }],
                base: ["16px", { lineHeight: "1.5" }],
                lg: ["18px", { lineHeight: "1.3", fontWeight: "500" }],
                xl: ["24px", { lineHeight: "1.3", fontWeight: "500" }],
                "2xl": ["32px", { lineHeight: "1.2", fontWeight: "500" }],
            },
            borderRadius: {
                sm: "4px",
                md: "8px",
                lg: "12px",
            },
            boxShadow: {
                card: "0 1px 3px rgba(0,0,0,0.08)",
            },

        },
    },
    plugins: []
};

export default config;