export default {
  content: [
    './index.html',
    './src/**/*.{js,ts,html}',
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        pharm: {
          primary: '#0d9488',
          primaryHover: '#0f766e',
          muted: '#5eead4',
          bg: '#0f172a',
          card: '#1e293b',
          border: '#334155',
        },
      },
    },
  },
  plugins: [],
}
