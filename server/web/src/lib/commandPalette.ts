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
