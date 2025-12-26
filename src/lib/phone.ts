const E164_MIN = 11;
const E164_MAX = 15;

function onlyDigits(input: string) {
  return String(input ?? "").replace(/[^\d]/g, "");
}

export function normalizePhone(input: string) {
  if (!input) return "";

  const raw = String(input).trim();
  const digits = onlyDigits(raw);

  if (digits.startsWith("521") && digits.length >= 13) {
    return "+52" + digits.slice(3, 13);
  }

  if (digits.startsWith("52") && digits.length >= 12) {
    return "+52" + digits.slice(2, 12);
  }

  if (digits.length === 10) {
    return "+52" + digits;
  }

  if (
    raw.startsWith("+") &&
    digits.length >= E164_MIN &&
    digits.length <= E164_MAX
  ) {
    return "+" + digits;
  }

  return "";
}

export function normalizePhoneLoose(input: string) {
  const strict = normalizePhone(input);
  if (strict) return strict;

  const raw = String(input ?? "").trim();
  const digits = onlyDigits(raw);

  if (digits.length >= E164_MIN && digits.length <= E164_MAX) {
    return "+" + digits;
  }

  return "";
}

export function phoneCandidates(input: string) {
  const raw = String(input ?? "").trim();
  const digits = onlyDigits(raw);

  const out = new Set<string>();

  const strict = normalizePhone(raw);
  if (strict) out.add(strict);

  const loose = normalizePhoneLoose(raw);
  if (loose) out.add(loose);

  // MX variants
  if (digits.startsWith("521") && digits.length >= 13) {
    out.add("+52" + digits.slice(3, 13));
    out.add("+" + digits.slice(0, 13));
    out.add(digits.slice(0, 13));
  }

  if (digits.startsWith("52") && digits.length >= 12) {
    out.add("+52" + digits.slice(2, 12));
    out.add("+" + digits.slice(0, 12));
    out.add(digits.slice(0, 12));
  }

  if (digits.length === 10) {
    out.add("+52" + digits);
    out.add(digits);
  }

  if (digits.length >= E164_MIN && digits.length <= E164_MAX) {
    out.add("+" + digits);
    out.add(digits);
  }

  return Array.from(out);
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
