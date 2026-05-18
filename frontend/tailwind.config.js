/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      colors: {
        primary: { 
          DEFAULT: '#007AFF', 
          indigo: '#5856D6', 
          sky: '#5AC8FA', 
          light: '#64D2FF' 
        },
        success: '#34C759',
        destructive: '#FF3B30',
        warning: '#FF9500',
        text: { 
          primary: '#1C1C1E', 
          secondary: '#8E8E93', 
          placeholder: '#C7C7CC' 
        },
        border: { 
          DEFAULT: '#E5E5EA', 
          hover: '#D1D1D6' 
        },
        surface: { 
          input: '#F2F2F7', 
          page: '#F5F5F7' 
        }
      },
      boxShadow: {
        subtle: '0 2px 8px rgba(0,0,0,0.04)',
        card: '0 4px 24px rgba(0,0,0,0.06)',
        primary: '0 8px 32px rgba(0,122,255,0.15)'
      }
    },
  },
  plugins: [],
}