import { useCallback, useEffect, useState } from "react";
import { AddMemberModal } from "./AddMemberModal";
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
  onDelete?: (teamId: string) => void;
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
// Badge de aplicações (`team.application_count`) e o botão de apagar time NÃO existem no
// protótipo confirmado — são capacidades reais desta implementação (GET /teams devolve
// application_count; DELETE /teams/:id existe e funciona, já testado ao vivo em sessões
// anteriores) mantidas como estavam, só reposicionadas pra caber na linha única confirmada em vez
// de reaproveitar `team.user_count`/um card à parte.
//
// TeamsScreen inteiro é root-only (toda a API /teams exige RequireRoot()), então quem chega aqui
// sempre pode gerenciar membros — sem prop canManage separada, mesma omissão já usada abaixo pro
// texto do estado vazio ("Add the first member to this team." é o único branch alcançável, o
// confirmado também tem "An admin can add members here." pra quem não é root, mas isso nunca
// acontece nesta tela).
export function TeamMembersSection({ team, onDelete }: TeamMembersSectionProps) {
  const [state, setState] = useState<State>({ status: "loading" });
  const [adding, setAdding] = useState(false);
  const [creatingUser, setCreatingUser] = useState(false);
  const [tempPassword, setTempPassword] = useState<{ username: string; password: string } | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
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

  async function handleRemove(userId: string) {
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
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <div className="section-h" style={{ margin: 0 }}>
          {team.name}
        </div>
        {memberCount !== null && <span className="badge">{pluralize(memberCount, "member", "members")}</span>}
        <span className="badge">{pluralize(team.application_count, "application", "applications")}</span>
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
        {onDelete && (
          <button className="icon-btn" title="Delete team" aria-label="Delete team" onClick={() => onDelete(team.id)}>
            <Icon name="trash" size={14} />
          </button>
        )}
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
            onRemove={() => handleRemove(member.user_id)}
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
    </div>
  );
}
