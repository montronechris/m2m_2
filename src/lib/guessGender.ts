// Euristica leggera per indovinare il genere da un nome italiano.
// Non è affidabile al 100% (nomi ambigui/stranieri), ma copre la maggior parte dei casi comuni.

const MALE_EXCEPTIONS = new Set([
  "andrea", "luca", "nicola", "elia", "mattia", "tobia", "enea", "bacco",
  "geremia", "isaia", "boris", "gioele", "osea",
]);

const FEMALE_EXCEPTIONS = new Set([
  "beatrice", "alice", "jasmine", "noemi", "adelaide", "aurore",
]);

export function guessGender(firstName: string | undefined | null): "M" | "F" | null {
  if (!firstName) return null;
  const name = firstName.trim().toLowerCase().split(/\s+/)[0];
  if (!name) return null;

  if (MALE_EXCEPTIONS.has(name)) return "M";
  if (FEMALE_EXCEPTIONS.has(name)) return "F";

  if (name.endsWith("a")) return "F";
  if (name.endsWith("o") || name.endsWith("e")) return "M";

  return null;
}

export function bentornatoLabel(firstName: string | undefined | null): string {
  const gender = guessGender(firstName);
  if (gender === "F") return "Bentornata";
  if (gender === "M") return "Bentornato";
  return "Bentornato/a";
}
