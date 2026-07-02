/**

 * Stitch project: Duplicate of Simplified Parent Dashboard

 * Screen: Gradion Design System & Logo Variants (d10e0a1c71a742d29f11d47a80ce49e5)

 * Logo asset: image.png (2825471141148705108)

 */

export const STITCH_PROJECT = {

  id: '4599479449045493068',

  title: 'Duplicate of Simplified Parent Dashboard',

  designSystemScreenId: 'd10e0a1c71a742d29f11d47a80ce49e5',

  designSystemScreenTitle: 'Gradion Design System & Logo Variants',

  logoScreenId: '2825471141148705108',

  landingScreenId: '0485fa67f8b44ecd9a55fa0c576543be',

  landingScreenTitle: 'High-Fidelity Landing Page Redesign',

} as const;



/** Gradion brand tokens from Stitch design system */

export const stitchColors = {

  navy: '#1A2B4C',

  teal: '#00C1B2',

  tealHover: '#00A896',

  gold: '#FFB900',

  grey: '#E5E8EB',

  cream: '#FDF8F1',

  white: '#FFFFFF',

} as const;



export const stitchFonts = {

  heading: 'Montserrat',

  body: 'Inter',

} as const;



/** Logo paths (exported from Stitch image.png + design system variants) */

export const stitchLogo = {
  light: '/gradion-logo-transparent.png',
  iconLight: '/gradion-icon.png',
  iconDark: '/gradion-icon-dark.png',
  /** Opaque fallback for metadata / email */
  full: '/gradion-logo.png',
} as const;


