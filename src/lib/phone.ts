export function normalizePhone(input: string) {
  let s = input.replace(/\s+/g, "").replace(/-/g, "").replace(/^\+/, "");

  if (s.startsWith("52") && s.length === 12) {
    s = "521" + s.slice(2);
  }

  return s;
}
