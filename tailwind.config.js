/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './src/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        // ASH AI Neural Theme Colors
        'neural-bg': '#0a0a0f',
        'neural-card': '#1a1a2e',
        'neural-accent': '#00d4ff',
        'neural-secondary': '#7c3aed',
        'quantum-blue': '#00bcd4',
        'quantum-purple': '#9c27b0',
        'ash-cyan': '#00e5ff',
        'ash-purple': '#7c4dff',
        'hologram-green': '#00ff88',
        'neural-orange': '#ff6b35',
        border: "hsl(var(--border))",
        input: "hsl(var(--input))",
        ring: "hsl(var(--ring))",
        background: "hsl(var(--background))",
        foreground: "hsl(var(--foreground))",
        primary: {
          DEFAULT: "hsl(var(--primary))",
          foreground: "hsl(var(--primary-foreground))",
        },
        secondary: {
          DEFAULT: "hsl(var(--secondary))",
          foreground: "hsl(var(--secondary-foreground))",
        },
        destructive: {
          DEFAULT: "hsl(var(--destructive))",
          foreground: "hsl(var(--destructive-foreground))",
        },
        muted: {
          DEFAULT: "hsl(var(--muted))",
          foreground: "hsl(var(--muted-foreground))",
        },
        accent: {
          DEFAULT: "hsl(var(--accent))",
          foreground: "hsl(var(--accent-foreground))",
        },
        popover: {
          DEFAULT: "hsl(var(--popover))",
          foreground: "hsl(var(--popover-foreground))",
        },
        card: {
          DEFAULT: "hsl(var(--card))",
          foreground: "hsl(var(--card-foreground))",
        },
      },
      borderRadius: {
        lg: "var(--radius)",
        md: "calc(var(--radius) - 2px)",
        sm: "calc(var(--radius) - 4px)",
      },
      fontFamily: {
        'cyber': ['Orbitron', 'monospace'],
        'neural': ['Inter', 'system-ui', 'sans-serif'],
        'quantum': ['JetBrains Mono', 'monospace'],
      },
      animation: {
        'pulse-neon': 'pulse-neon 2s ease-in-out infinite alternate',
        'glow': 'glow 2s ease-in-out infinite alternate',
        'neural-flow': 'neural-flow 3s ease-in-out infinite',
        'quantum-drift': 'quantum-drift 4s ease-in-out infinite',
        'hologram-flicker': 'hologram-flicker 1.5s ease-in-out infinite',
        'data-stream': 'data-stream 2s linear infinite',
        'float': 'float 6s ease-in-out infinite',
        'cyber-glitch': 'cyber-glitch 0.3s ease-in-out infinite',
        'spin-slow': 'spin 3s linear infinite',
        'bounce-subtle': 'bounce-subtle 2s ease-in-out infinite',
      },
      keyframes: {
        'pulse-neon': {
          '0%': { boxShadow: '0 0 5px #00d4ff, 0 0 10px #00d4ff, 0 0 15px #00d4ff' },
          '100%': { boxShadow: '0 0 10px #00d4ff, 0 0 20px #00d4ff, 0 0 30px #00d4ff' }
        },
        'glow': {
          '0%': { textShadow: '0 0 5px #00d4ff, 0 0 10px #00d4ff' },
          '100%': { textShadow: '0 0 10px #00d4ff, 0 0 20px #00d4ff, 0 0 30px #00d4ff' }
        },
        'neural-flow': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-10px)' }
        },
        'quantum-drift': {
          '0%, 100%': { transform: 'translateX(0px) rotate(0deg)' },
          '25%': { transform: 'translateX(5px) rotate(1deg)' },
          '75%': { transform: 'translateX(-5px) rotate(-1deg)' }
        },
        'hologram-flicker': {
          '0%, 100%': { opacity: 1 },
          '50%': { opacity: 0.8 }
        },
        'data-stream': {
          '0%': { transform: 'translateY(100%)' },
          '100%': { transform: 'translateY(-100%)' }
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-20px)' }
        },
        'cyber-glitch': {
          '0%, 100%': { transform: 'translate(0)' },
          '20%': { transform: 'translate(-1px, 1px)' },
          '40%': { transform: 'translate(-1px, -1px)' },
          '60%': { transform: 'translate(1px, 1px)' },
          '80%': { transform: 'translate(1px, -1px)' }
        },
        'bounce-subtle': {
          '0%, 100%': { transform: 'translateY(0)' },
          '50%': { transform: 'translateY(-5px)' }
        }
      },
      backgroundImage: {
        'neural-gradient': 'linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 50%, #16213e 100%)',
        'quantum-gradient': 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        'cyber-gradient': 'linear-gradient(135deg, #00d4ff 0%, #7c3aed 100%)',
        'hologram-gradient': 'linear-gradient(135deg, #00ff88 0%, #00d4ff 50%, #7c4dff 100%)',
        'ash-gradient': 'linear-gradient(135deg, #ff6b35 0%, #f7931e 100%)',
      },
      backdropBlur: {
        'neural': '12px',
        'quantum': '8px',
      },
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      zIndex: {
        '60': '60',
        '70': '70',
        '80': '80',
        '90': '90',
        '100': '100',
      }
    },
  },
  plugins: [
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("@tailwindcss/forms"),
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    require("tailwindcss-animate"),
  ],
}