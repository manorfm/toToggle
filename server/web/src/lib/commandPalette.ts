import { matchesQuery } from "./textSearch";

// v2.6 §6.1/§6.2 — computação de hits do command palette (⌘K), extraída como função pura
// (testável sem DOM) do CommandPalette confirmado no app.jsx real: 4 grupos independentes, cada
// um com seu próprio cap. Applications aparece mesmo com a busca vazia (as 5 primeiras); os
// outros 3 grupos só existem depois de digitar algo — nenhuma dessas duas regras é acidental, é
// o comportamento exato do protótipo. Gate de papel (ex.: só root vê Teams) é responsabilidade de
// quem monta `CommandPaletteData`, não desta função — ela só filtra o que recebe.
//
// Bug real reportado pelo usuário ("a busca geral abre o modal e não retorna nada"): o match era
// só `.toLowerCase().includes(q)`, sem normalizar acento — nomes/times/apps reais são PT-BR
// (ex.: "João", "Ativação"), então digitar a forma sem acento nunca batia. Ver lib/textSearch.ts.
export interface CommandPaletteAppHit {
  id: string;
  name: string;
}

export interface CommandPaletteToggleHit {
  appId: string;
  appName: string;
  path: string;
}

export interface CommandPaletteTeamHit {
  id: string;
  name: string;
}

export interface CommandPalettePersonHit {
  id: string;
  name: string;
  username: string;
}

export interface CommandPaletteData {
  apps: CommandPaletteAppHit[];
  toggles: CommandPaletteToggleHit[];
  teams: CommandPaletteTeamHit[];
  people: CommandPalettePersonHit[];
}

export interface CommandPaletteHits {
  apps: CommandPaletteAppHit[];
  toggles: CommandPaletteToggleHit[];
  teams: CommandPaletteTeamHit[];
  people: CommandPalettePersonHit[];
}

const APP_CAP = 5;
const TOGGLE_CAP = 8;
const TEAM_CAP = 4;
const PEOPLE_CAP = 4;

// Bug real reportado pelo usuário: toggles nunca apareciam na busca geral (⌘K), mesmo com um
// termo que claramente batia num path existente. Causa raiz: AppShell montava o índice de
// toggles com `Promise.all` sobre `getToggleHierarchy(app.id)` de TODA aplicação — `Promise.all`
// rejeita o conjunto INTEIRO assim que uma única promise rejeita, e o `.catch` do chamador
// respondia a isso zerando o índice inteiro (`setToggleIndex([])`), cacheado daí em diante (só
// recalculado numa próxima montagem do AppShell). Ou seja: bastava UMA aplicação falhar ao buscar
// sua hierarquia (erro de rede transitório, uma aplicação sem toggles com alguma resposta
// inesperada, etc.) pra apagar silenciosamente os toggles de TODAS as outras aplicações, pelo
// resto da sessão. `buildToggleIndex` usa `Promise.allSettled` — cada aplicação contribui (ou não)
// de forma independente; uma falha isolada nunca mais derruba o índice inteiro.
export async function buildToggleIndex(
  apps: CommandPaletteAppHit[],
  fetchHierarchyLeaves: (appId: string) => Promise<string[]>
): Promise<CommandPaletteToggleHit[]> {
  const results = await Promise.allSettled(
    apps.map((app) => fetchHierarchyLeaves(app.id).then((paths) => ({ app, paths })))
  );

  const hits: CommandPaletteToggleHit[] = [];
  for (const result of results) {
    if (result.status !== "fulfilled") continue;
    const { app, paths } = result.value;
    for (const path of paths) {
      hits.push({ appId: app.id, appName: app.name, path });
    }
  }
  return hits;
}

export function searchCommands(query: string, data: CommandPaletteData): CommandPaletteHits {
  const q = query.trim();

  return {
    apps: (q ? data.apps.filter((a) => matchesQuery(a.name, q)) : data.apps).slice(0, APP_CAP),
    toggles: q ? data.toggles.filter((t) => matchesQuery(t.path, q)).slice(0, TOGGLE_CAP) : [],
    teams: q ? data.teams.filter((t) => matchesQuery(t.name, q)).slice(0, TEAM_CAP) : [],
    people: q
      ? data.people.filter((p) => matchesQuery(p.name, q) || matchesQuery(p.username, q)).slice(0, PEOPLE_CAP)
      : [],
  };
}
