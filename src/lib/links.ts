// Helpers de liens partagés par le site public et l'admin.

// Toujours https:// (un lien sans protocole casse et donne un 404).
export function ensureHttps(url: string | null | undefined): string {
  const value = (url || '').trim();
  if (!value) return '';
  if (/^https:\/\//i.test(value)) return value;
  if (/^http:\/\//i.test(value)) return value.replace(/^http:\/\//i, 'https://');
  if (value.startsWith('//')) return `https:${value}`;
  return `https://${value}`;
}

// 06 12 34 56 78 → 212612345678
export function internationalPhone(phone: string | null | undefined): string {
  let digits = (phone || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.startsWith('0')) digits = `212${digits.slice(1)}`;
  return digits;
}

export function whatsappLink(phone: string | null | undefined, text = ''): string {
  return `https://wa.me/${internationalPhone(phone)}${text ? `?text=${encodeURIComponent(text)}` : ''}`;
}

export function telLink(phone: string | null | undefined): string {
  return `tel:+${internationalPhone(phone)}`;
}

// +212653770832 → 06 53 77 08 32
export function displayPhone(phone: string | null | undefined): string {
  const digits = internationalPhone(phone);
  if (digits.startsWith('212') && digits.length === 12) {
    return `0${digits.slice(3)}`.replace(/(\d{2})(?=\d)/g, '$1 ').trim();
  }
  return phone || '';
}
