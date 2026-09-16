import { useCallback, useEffect, useState } from "react";
import { AddMemberModal } from "./AddMemberModal";
import { ConfirmModal } from "./ConfirmModal";
import { Icon } from "./Icon";
import { MemberRow } from "./MemberRow";
import { TempPasswordModal } from "./TempPasswordModal";
import { UserModal } from "./UserModal";
import { useToast } from "./ToastProvider";
import { ApiError } from "../api/client";
import { listTeamApprovers, removeTeamMember, setTeamApprover } from "../api/teams";
import type { TeamApprover, TeamWithCounts } from "../types/team";

interface TeamMembersSectionProps {
  team: TeamWithCounts;
}

type State = { status: "loading" } | { status: "loaded"; members: TeamApprover[] } | { status: "error"; message: string };

function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}

// Cabeçalho do time (nome/badges/Add member) e a lista de membros/estado vazio vivem no MESMO
// bloco, confirmado 1:1 contra get_full_jsx("TeamsView"): uma única linha (nome + badge de
// membros + badge "no approver" condicional + botão "Add member"), seguida direto pela lista ou
// pelo estado vazio `.empty.compact` — nunca duas linhas separadas. TeamRow.tsx foi apagado: tê-lo
// como componente irmão, com sua própria linha, era a causa raiz da divergência de layout
// reportada pelo usuário (duas linhas de cabeçalho por time em vez de uma).
//
// Badge de aplicações e o botão de apagar time foram removidos por completo: uma passada anterior
// os manteve como "capacidades reais desta implementação" (GET /teams devolve application_count;
// DELETE /teams/:id existe e funciona) — mas um screenshot real do próprio protótipo (não só o
// JSX) confirmou que a linha de cabeçalho real é SÓ nome + badge de membros + badge "no approver"
// + "Add member", sem nenhum dos dois. `DELETE /teams/:id` continua existindo no backend, só sem
// ponto de entrada nesta tela — mesma categoria de capacidade-sem-UI já aceita em outro lugar do
// app (troca de role em `UserRow`, ver comentário em MemberRow.tsx).
//
// TeamsScreen inteiro é root-only (toda a API /teams exige RequireRoot()), então quem chega aqui
// sempre pode gerenciar membros — sem prop canManage separada, mesma omissão já usada abaixo pro
// texto do estado vazio ("Add the first member to this team." é o único branch alcançável, o
// confirmado também tem "An admin can add members here." pra quem não é root, mas isso nunca
// acontece nesta tela).
export function TeamMembersSection({ team }: TeamMembersSectionProps) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [adding, setAdding] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [tempPassword, setTempPassword] = useState<{ username: string; password: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [removing, setRemoving] = useState<{ userId: string; username: string } | null>(null);
  const toast = useToast();

  const load = useCallback(() => {
    listTeamApprovers(team.id)
      .then((members) => setState({ status: "loaded", members }))
      .catch((err) => {
        setState({ status: "error", message: err instanceof ApiError ? err.message : "Não foi possível carregar os membros." });
      });
  }, [team.id]);

  useEffect(() => {
    load();
  }, [load]);

  // Removing a member went straight to the API before, no confirmation — the only destructive
  // button in the app without one (delete toggle/application/user all gate on ConfirmModal).
  // design-graph's App screen truncates before reaching the modal-switch block that would show
  // the exact copy, but the prop is literally named `onRemoveMember={requestRemoveMember}` in the
  // decoded App JSX (same "request*" naming as `requestPasswordReset`, which does open a modal) —
  // wired through the same shared ConfirmModal every other delete flow already uses here.
  async function handleRemove(userId: string) {
    setRemoving(null);
    try {
      await removeTeamMember(team.id, userId);
      load();
      toast("Member removed");
    } catch (err) {
      setState({ status: "error", message: err instanceof ApiError ? err.message : "Não foi possível remover o membro." });
    }
  }

  async function handleToggleApprover(userId: string, nextIsApprover: boolean) {
    setActionError(null);
    try {
      const members = await setTeamApprover(team.id, userId, nextIsApprover);
      setState({ status: "loaded", members });
    } catch (err) {
      setActionError(err instanceof ApiError ? err.message : "Não foi possível atualizar o aprovador.");
    }
  }

  // v2.6 §2.10 — confirmado contra get_full_jsx("TeamsView"): `{isRoot && approverCount === 0 &&
  // <span className="badge">...no approver</span>}`, approverCount vindo do MESMO GET
  // /teams/:id/approvers já carregado acima — sem endpoint novo. isRoot omitido de propósito (ver
  // comentário no topo do arquivo).
  const approverCount = state.status === "loaded" ? state.members.filter((m) => m.is_approver).length : 0;
  // Badge de membros usa a MESMA lista já carregada aqui (`rows.length` no confirmado), não
  // `team.user_count` (GET /teams) — evita uma segunda fonte de verdade pro mesmo número.
  const memberCount = state.status === "loaded" ? state.members.length : null;

  return (
    // data-testid estável pro e2e escopar o bloco inteiro de um time (nome + badges + Add member
    // + lista de membros) — antes disso, os testes escopavam por um filtro frágil de texto+botão
    // (ver histórico no git), que quebrou quando TeamRow/TeamMembersSection viraram um componente
    // só (fix da divergência de layout de Teams & People): nome e botão "Add member" passaram a
    // ficar na MESMA <div> da linha de cabeçalho, então esse filtro passou a resolver pra essa
    // linha (mais interna) em vez do bloco inteiro, que é quem realmente contém a lista de membros.
    <div data-testid="team-block">
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div className="section-h" style={{ margin: 0 }}>
          {team.name}
        </div>
        {memberCount !== null && <span className="badge">{pluralize(memberCount, "member", "members")}</span>}
        {state.status === "loaded" && approverCount === 0 && (
          <span
            className="badge"
            style={{ background: "var(--warn-soft)", color: "var(--warn)", borderColor: "transparent", display: "flex", alignItems: "center", gap: 4 }}
          >
            <Icon name="warn" size={11} /> no approver
          </span>
        )}
        <div style={{ flex: 1 }} />
        <button className="btn btn-soft btn-sm" onClick={() => setAdding(true)}>
          <Icon name="plus" size={14} /> Add member
        </button>
      </div>

      {actionError && (
        <div className="field-hint danger" style={{ marginBottom: 8 }}>
          {actionError}
        </div>
      )}

      {state.status === "loading" && <div className="empty-ph">Carregando…</div>}
      {state.status === "error" && <div className="field-hint danger">{state.message}</div>}
      {state.status === "loaded" && state.members.length === 0 && (
        <div className="empty compact">
          <Icon name="users" size={26} />
          <div className="et">No members yet</div>
          <div className="ed">Add the first member to this team.</div>
        </div>
      )}
      {state.status === "loaded" &&
        state.members.map((member) => (
          <MemberRow
            key={member.user_id}
            member={member}
            onRemove={() => setRemoving({ userId: member.user_id, username: member.username })}
            onToggleApprover={() => handleToggleApprover(member.user_id, !member.is_approver)}
          />
        ))}

      {adding && (
        <AddMemberModal
          teamId={team.id}
          teamName={team.name}
          existingMemberIds={state.status === "loaded" ? state.members.map((m) => m.user_id) : []}
          onClose={() => setAdding(false)}
          onAdded={() => {
            load();
            toast("Member added");
          }}
          onCreateNew={() => {
            setAdding(false);
            setCreatingUser(true);
          }}
        />
      )}

      {creatingUser && (
        // TeamsScreen inteiro é root-only (ver comentário no topo), então isRoot=true sempre aqui —
        // mesma justificativa já usada acima pra não ter uma prop canManage separada.
        <UserModal
          isRoot
          presetTeamId={team.id}
          presetTeamName={team.name}
          onClose={() => setCreatingUser(false)}
          onCreated={({ user, password }) => {
            setCreatingUser(false);
            setTempPassword({ username: user.username, password });
            load();
          }}
        />
      )}

      {tempPassword && (
        <TempPasswordModal
          username={tempPassword.username}
          password={tempPassword.password}
          reset={false}
          onClose={() => {
            setTempPassword(null);
            toast("Member added");
          }}
        />
      )}

      {removing && (
        <ConfirmModal
          title="Remove member"
          sub={`This will remove "${removing.username}" from ${team.name}.`}
          danger
          confirmLabel="Remove"
          onClose={() => setRemoving(null)}
          onConfirm={() => handleRemove(removing.userId)}
        />
      )}
    </div>
  );
}
