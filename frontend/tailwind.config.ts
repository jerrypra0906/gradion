import type { Config } from 'tailwindcss';

import { stitchColors } from './src/lib/stitch-design';



const config: Config = {

  safelist: [
    {
      pattern:
        /^(bg|text|border|ring|shadow)-gradion-(navy|teal|teal-hover|gold|grey|cream)(\/\d+)?$/,
    },
    {
      pattern:
        /^(hover|focus):(bg|text|border|ring)-gradion-(navy|teal|teal-hover)(\/\d+)?$/,
    },
  ],

  content: [

    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',

    './src/components/**/*.{js,ts,jsx,tsx,mdx}',

    './src/app/**/*.{js,ts,jsx,tsx,mdx}',

  ],

  theme: {

    extend: {

      colors: {

        background: 'var(--background)',

        foreground: 'var(--foreground)',

        gradion: {

          navy: stitchColors.navy,

          teal: stitchColors.teal,

          'teal-hover': stitchColors.tealHover,

          gold: stitchColors.gold,

          grey: stitchColors.grey,

          cream: stitchColors.cream,

        },

        navy: {

          DEFAULT: stitchColors.navy,

          950: '#0f1a2e',

          900: stitchColors.navy,

          800: '#243a5e',

          700: '#2e4a72',

        },

        teal: {

          DEFAULT: stitchColors.teal,

          300: '#5EEAD4',

          400: stitchColors.teal,

          500: stitchColors.tealHover,

          600: '#008f7f',

        },

        cream: {

          50: stitchColors.cream,

          100: '#F5EFE6',

        },

      },

      fontFamily: {

        montserrat: ['var(--font-montserrat)', 'system-ui', 'sans-serif'],

      },

    },

  },

  plugins: [],

};

export default config;


