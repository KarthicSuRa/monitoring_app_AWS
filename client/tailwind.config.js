import containerQueries from '@tailwindcss/container-queries';

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
        display: ["Space Grotesk", "sans-serif"]
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: '#2563EB',
          foreground: 'hsl(var(--primary-foreground))',
          "light": "#60A5FA",
          "dark": "#1D4ED8",
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        success: {
          DEFAULT: 'hsl(var(--success))',
          foreground: 'hsl(var(--success-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        "background-light": "#F8FAFC",
        "background-dark": "#0F172A",
        "surface-light": "#FFFFFF",
        "surface-light-alt": "#F1F5F9",
        "border-light": "#E2E8F0",
        "text-primary-light": "#0F172A",
        "text-secondary-light": "#475569",
        "surface-dark": "#1E293B",
        "surface-darker": "#0F172A",
        "border-dark": "#334155",
      },
      boxShadow: {
        "glow": "0 0 20px rgba(37, 99, 235, 0.5)",
        "glow-sm": "0 0 10px rgba(37, 99, 235, 0.4)",
        "glow-intense": "0 0 35px rgba(37, 99, 235, 0.7)",
        "glow-text": "0 0 10px rgba(37, 99, 235, 0.3)",
        "card": "0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)",
        "card-hover": "0 10px 15px -3px rgba(0, 0, 0, 0.1), 0 4px 6px -2px rgba(0, 0, 0, 0.05)",
      },
      borderRadius: {
          lg: `var(--radius)`,
          md: `calc(var(--radius) - 2px)`,
          sm: `calc(var(--radius) - 4px)`,
      },
      keyframes: {
        blink: {
          '50%': { opacity: 0.2 },
        },
        slide: {
            '0%': { transform: 'translateX(-100%) skewX(12deg)' },
            '100%': { transform: 'translateX(200%) skewX(12deg)' },
        }
      },
      animation: {
        blink: 'blink 1.5s infinite ease-in-out',
        slide: 'slide 2.5s infinite',
      },
    }
  },
  plugins: [
    containerQueries,
  ],
}
