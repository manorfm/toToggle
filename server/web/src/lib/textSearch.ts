// Toda busca por substring do app (Command Palette/⌘K, busca de usuários, filtro de paths de
// toggle) comparava só `.toLowerCase().includes(q)` — sem normalizar acento. Bug real reportado
// pelo usuário: a busca geral (⌘K) "abre o modal e não retorna nada". Causa raiz confirmada:
// nomes/times/aplicações reais neste app são PT-BR e tendem a ter acento (ex.: "João"), mas
// digitar a forma sem acento (o jeito mais comum de digitar rápido, ex. "joao") nunca batia —
// "João".toLowerCase().includes("joao") é `false`. `normalizeForSearch` remove os diacríticos dos
// dois lados da comparação via Unicode NFD (decompõe "ã" em "a" + combining tilde) + strip da
// faixa de combining marks, então "joao"/"JOÃO"/"joão" todos normalizam pro mesmo texto.
export function normalizeForSearch(value: string): string {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase();
}

export function matchesQuery(haystack: string, query: string): boolean {
  return normalizeForSearch(haystack).includes(normalizeForSearch(query));
}
