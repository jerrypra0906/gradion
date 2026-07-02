export function getLogStatusBadgeClass(status: string) {
  switch (status) {
    case 'approved':
      return 'bg-[#00C1B2]/10 text-[#00A896] border border-[#00C1B2]/25';
    case 'flagged':
      return 'bg-red-50 text-red-700 border border-red-200';
    case 'pending':
      return 'bg-[#FFB900]/15 text-[#1A2B4C] border border-[#FFB900]/30';
    default:
      return 'bg-[#E5E8EB] text-[#1A2B4C]/70 border border-[#E5E8EB]';
  }
}

export function getCreatorBadgeClass(role: string) {
  switch (role) {
    case 'parent':
      return 'bg-[#00C1B2]/10 text-[#00A896] border border-[#00C1B2]/25';
    case 'therapist':
      return 'bg-[#1A2B4C]/8 text-[#1A2B4C] border border-[#1A2B4C]/15';
    case 'admin':
      return 'bg-[#FFB900]/15 text-[#1A2B4C] border border-[#FFB900]/30';
    default:
      return 'bg-[#E5E8EB] text-[#1A2B4C]/70 border border-[#E5E8EB]';
  }
}

export function getRoleBadgeClass(role: string) {
  switch (role) {
    case 'admin':
      return 'bg-[#FFB900]/15 text-[#1A2B4C] border border-[#FFB900]/30';
    case 'therapist':
      return 'bg-[#00C1B2]/10 text-[#00A896] border border-[#00C1B2]/25';
    case 'consultant':
      return 'bg-[#1A2B4C]/8 text-[#1A2B4C] border border-[#1A2B4C]/15';
    case 'parent':
      return 'bg-[#00C1B2]/10 text-[#00A896] border border-[#00C1B2]/25';
    default:
      return 'bg-[#E5E8EB] text-[#1A2B4C]/70 border border-[#E5E8EB]';
  }
}
