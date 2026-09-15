import { describe, expect, it } from "vitest";
import { matchesQuery, normalizeForSearch } from "./textSearch";

describe("normalizeForSearch", () => {
  it("lowercases and strips accents", () => {
    expect(normalizeForSearch("João")).toBe("joao");
    expect(normalizeForSearch("PAGAMENTOS")).toBe("pagamentos");
    expect(normalizeForSearch("Time de Ativação")).toBe("time de ativacao");
  });
});

describe("matchesQuery", () => {
  it("matches an accented name against an unaccented query (the reported bug)", () => {
    expect(matchesQuery("João Pereira", "joao")).toBe(true);
  });

  it("matches an unaccented value against an accented query", () => {
    expect(matchesQuery("Time de Ativacao", "ativação")).toBe(true);
  });

  it("still matches a plain case-insensitive substring", () => {
    expect(matchesQuery("Payments Squad", "SQUAD")).toBe(true);
  });

  it("does not match unrelated text", () => {
    expect(matchesQuery("Payments Squad", "billing")).toBe(false);
  });
});
