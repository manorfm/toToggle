import { useEffect, useState } from "react";
import { listTeams } from "../api/teams";
import { ApiError } from "../api/client";
import { CreateTeamModal } from "../components/CreateTeamModal";
import { Icon } from "../components/Icon";
import { TeamMembersSection } from "../components/TeamMembersSection";
import { useToast } from "../components/ToastProvider";
import { useAppUser } from "../hooks/useAppUser";
import type { TeamWithCounts } from "../types/team";

type LoadState =
  | { status: "loading" }
  | { status: "loaded"; teams: TeamWithCounts[] }
  | { status: "error"; message: string };

// Adaptado de get_full_jsx("TeamsView") — cada time é um único bloco (TeamMembersSection: nome,
// badges, "Add member" e a lista/estado vazio de membros), como confirmado no protótipo real.
// Aprovadores por membro ficam de fora nesta fatia (ver TeamMembersSection sobre troca de role
// ser global, não por time). Apagar time foi removido desta tela — o cabeçalho confirmado
// (screenshot real do protótipo) não tem esse botão; `DELETE /teams/:id` continua existindo no
// backend, só sem ponto de entrada aqui (ver TeamMembersSection.tsx).
export function TeamsScreen() {
  const user = useAppUser();
  const toast = useToast();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    let cancelled = false;

    listTeams()
      .then((teams) => {
        if (!cancelled) setState({ status: "loaded", teams });
      })
      .catch((err) => {
        if (cancelled) return;
        const message = err instanceof ApiError ? err.message : "Não foi possível carregar os times.";
        setState({ status: "error", message });
      });

    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <div className="page">
      <div className="page-head">
        <div className="h">
          <div className="page-title">Teams & people</div>
          <div className="page-desc">
            Teams own applications. Members inherit access to every toggle in the apps their team manages.
            {user.role === "root" && <span style={{ color: "var(--accent)" }}> Only root can assign per-team approvers.</span>}
          </div>
        </div>
        {user.role === "root" && (
          <button className="btn btn-primary" onClick={() => setCreating(true)}>
            <Icon name="plus" size={16} /> New team
          </button>
        )}
      </div>

      {state.status === "loading" && <div className="empty">Carregando times…</div>}
      {state.status === "error" && <div className="empty">{state.message}</div>}
      {state.status === "loaded" && state.teams.length === 0 && <div className="empty">No teams yet.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
        {state.status === "loaded" && state.teams.map((team) => <TeamMembersSection key={team.id} team={team} />)}
      </div>

      {creating && (
        <CreateTeamModal
          onClose={() => setCreating(false)}
          onCreated={(team) => {
            setState((prev) =>
              prev.status === "loaded"
                ? { status: "loaded", teams: [...prev.teams, { ...team, user_count: 0, application_count: 0 }] }
                : prev
            );
            toast("Team created");
          }}
        />
      )}
    </div>
  );
}
