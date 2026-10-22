export const money = (cents: number) => (cents / 100).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
export const normalizeName = (name: string) => name.trim().replace(/\s+/g, ' ');

export function validateName(name: string) {
  const parts = normalizeName(name).split(' ');
  return parts.length >= 2 && parts.every(part => /^[\p{L}][\p{L}\p{M}'’-]*$/u.test(part)) && name.length <= 120;
}

const validDDDs = new Set('11 12 13 14 15 16 17 18 19 21 22 24 27 28 31 32 33 34 35 37 38 41 42 43 44 45 46 47 48 49 51 53 54 55 61 62 63 64 65 66 67 68 69 71 73 74 75 77 79 81 82 83 84 85 86 87 88 89 91 92 93 94 95 96 97 98 99'.split(' '));

export function validatePhone(value: string) {
  const digits = value.replace(/\D/g, '');
  return /^\d{2}9\d{8}$/.test(digits) && validDDDs.has(digits.slice(0, 2));
}

export function maskPhone(value: string) {
  const digits = value.replace(/\D/g, '').slice(0, 11);
  if (!digits) return '';
  if (digits.length <= 2) return `(${digits}`;
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
}

export const privatePhone = (phone: string) => `(${phone.slice(0, 2)}) 9****-${phone.slice(-4)}`;
export const displayDate = (date: string) => new Date(date).toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo', dateStyle: 'short', timeStyle: 'short' });
