export function normalizePhone(input: string) {
  if (!input) return "";

  const raw = String(input).trim();
  const digits = raw.replace(/[^\d]/g, "");

  // 521 + 10 dígitos (WA)
  if (digits.startsWith("521") && digits.length >= 13) {
    return "+52" + digits.slice(3, 13);
  }

  // 52 + 10 dígitos
  if (digits.startsWith("52") && digits.length >= 12) {
    return "+52" + digits.slice(2, 12);
  }

  // 10 dígitos
  if (digits.length === 10) {
    return "+52" + digits;
  }

  // ya viene con +
  if (raw.startsWith("+") && digits.length >= 11) {
    return "+" + digits;
  }

  return "";
}

export function formatPhoneForDisplay(normalized: string) {
  const s = String(normalized ?? "").trim();
  if (!s) return "";

  let digits = s.replace(/\D/g, "");

  if (digits.startsWith("52") && digits.length >= 12) {
    digits = digits.slice(2);
  }

  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }

  return s;
}
