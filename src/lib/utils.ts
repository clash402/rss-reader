export type ClassValue = string | number | null | undefined | ClassDictionary | ClassArray;

type ClassDictionary = Record<string, boolean | string | number | null | undefined>;
type ClassArray = ClassValue[];

function toVal(mix: ClassValue): string {
  if (typeof mix === "string" || typeof mix === "number") {
    return String(mix);
  }

  if (Array.isArray(mix)) {
    return mix.map(toVal).filter(Boolean).join(" ");
  }

  if (typeof mix === "object" && mix) {
    return Object.entries(mix)
      .filter(([, value]) => Boolean(value))
      .map(([key]) => key)
      .join(" ");
  }

  return "";
}

export function cn(...inputs: ClassValue[]) {
  return inputs.map(toVal).filter(Boolean).join(" ");
}

export function formatDate(date: string | number | Date) {
  const value = typeof date === "string" || typeof date === "number" ? new Date(date) : date;
  if (Number.isNaN(value.getTime())) return "Unknown";
  return new Intl.DateTimeFormat("en", {
    month: "short",
    day: "numeric",
  }).format(value);
}

export function truncate(text: string, length = 140) {
  if (!text) return "";
  if (text.length <= length) return text;
  return `${text.slice(0, length - 1)}…`;
}
