/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        // Chalkboard / Whiteboard palette
        paper: '#F6F3EC', // page background (off-white paper)
        card: '#FFFFFF', // card surface
        ink: '#1B2430', // primary text (navy ink)
        crimson: '#D7263D', // accent
        gold: '#E4A400', // 1st place / highlights
        silver: '#9AA3AD', // 2nd place
        bronze: '#B07B3E', // 3rd place
        muted: '#8A8577', // secondary text
        hairline: '#E4DFD3', // subtle borders / rules
      },
      fontFamily: {
        display: ['Oswald', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        body: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      // Numeric weight utilities (font-400 … font-700) used across the app.
      fontWeight: {
        400: '400',
        500: '500',
        600: '600',
        700: '700',
      },
      boxShadow: {
        card: '0 1px 2px rgba(27, 36, 48, 0.04), 0 4px 16px rgba(27, 36, 48, 0.06)',
        pop: '0 8px 30px rgba(27, 36, 48, 0.12)',
      },
      borderRadius: {
        xl2: '1.25rem',
      },
    },
  },
  plugins: [],
};
