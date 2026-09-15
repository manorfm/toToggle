import { useEffect, useState } from "react";
import { deleteTeam, listTeams } from "../api/teams";
import { ApiError } from "../api/client";
import { ConfirmModal } from "../components/ConfirmModal";
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
// ser global, não por time).
export function TeamsScreen() {
  const user = useAppUser();
  const toast = useToast();
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [creating, setCreating] = useState(false);
  const [deletingTeamId, setDeletingTeamId] = useState<string | null>(null);
  const [deleteError, setDeleteError] = useState<string | null>(null);

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

  async function confirmDelete() {
    if (!deletingTeamId) return;
    try {
      await deleteTeam(deletingTeamId);
      setDeleteError(null);
      setState((prev) =>
        prev.status === "loaded" ? { status: "loaded", teams: prev.teams.filter((t) => t.id !== deletingTeamId) } : prev
      );
      toast("Team deleted");
      setDeletingTeamId(null);
    } catch (err) {
      setDeleteError(err instanceof ApiError ? err.message : "Não foi possível apagar o time.");
    }
  }

  const teamBeingDeleted = state.status === "loaded" ? state.teams.find((t) => t.id === deletingTeamId) : undefined;

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

      {deleteError && <div className="field-hint danger" style={{ marginBottom: 16 }}>{deleteError}</div>}

      {state.status === "loading" && <div className="empty">Carregando times…</div>}
      {state.status === "error" && <div className="empty">{state.message}</div>}
      {state.status === "loaded" && state.teams.length === 0 && <div className="empty">No teams yet.</div>}
      <div style={{ display: "flex", flexDirection: "column", gap: 26 }}>
        {state.status === "loaded" &&
          state.teams.map((team) => (
            <TeamMembersSection
              key={team.id}
              team={team}
              onDelete={user.role === "root" ? (teamId) => setDeletingTeamId(teamId) : undefined}
            />
          ))}
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

      {teamBeingDeleted && (
        <ConfirmModal
          title="Delete team"
          sub={`This will permanently remove "${teamBeingDeleted.name}" and its membership.`}
          danger
          confirmLabel="Delete"
          onClose={() => setDeletingTeamId(null)}
          onConfirm={confirmDelete}
        />
      )}
    </div>
  );
}
