/**
 * Badge palettes.
 *
 * These chips render on both the navy page header and white cards, so their
 * backgrounds are opaque rather than a tint of the surface behind them: a
 * `bg-[#00C1B2]/10` chip composites to near-white on a card and to near-navy on
 * the header, and one text colour cannot be readable on both. Solid tints keep
 * every pairing above 4.5:1 wherever the chip is placed.
 */
const TEAL = 'bg-[#E6F8F6] text-[#00615B] border border-[#00C1B2]/40';
const GOLD = 'bg-[#FFF3D1] text-[#6B4A00] border border-[#FFB900]/45';
const NAVY = 'bg-[#E7EBF2] text-[#1A2B4C] border border-[#1A2B4C]/20';
const NEUTRAL = 'bg-[#EEF0F3] text-[#3D4756] border border-[#D8DDE4]';
const RED = 'bg-red-50 text-red-700 border border-red-200';

export function getLogStatusBadgeClass(status: string) {
  switch (status) {
    case 'approved':
      return TEAL;
    case 'flagged':
      return RED;
    case 'pending':
      return GOLD;
    default:
      return NEUTRAL;
  }
}

export function getCreatorBadgeClass(role: string) {
  switch (role) {
    case 'parent':
      return TEAL;
    case 'therapist':
      return NAVY;
    case 'admin':
      return GOLD;
    default:
      return NEUTRAL;
  }
}

export function getRoleBadgeClass(role: string) {
  switch (role) {
    case 'admin':
      return GOLD;
    case 'therapist':
      return TEAL;
    case 'consultant':
      return NAVY;
    case 'parent':
      return TEAL;
    default:
      return NEUTRAL;
  }
}
