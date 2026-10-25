// Area geografica di un titolo dal suffisso Yahoo della borsa.
export type Area = "USA" | "Europa" | "Italia" | "Asia" | "Mondo";

const ADR_ASIA = ["BABA", "JD", "PDD", "BIDU", "TSM", "NIO"];
export function areaOf(symbol: string): Area {
  if (symbol.endsWith(".MI")) return "Italia";
  if (/\.(DE|PA|AS|L|SW|CO|MC|BR|ST|HE|OL|VI|LS|IR|F)$/.test(symbol)) return "Europa";
  if (/\.(T|HK|TW|TWO|KS|KQ|SS|SZ|AX|NS|BO|SI)$/.test(symbol) || ADR_ASIA.includes(symbol)) return "Asia";
  if (/=F$|=X$|^\^/.test(symbol)) return "Mondo";
  return "USA";
}
