import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { afterEach, describe, expect, it, vi } from "vitest";
import { TeamMembersSection } from "./TeamMembersSection";
import { ToastProvider } from "./ToastProvider";
import type { TeamWithCounts } from "../types/team";

function jsonResponse(status: number, body: unknown) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

const team: TeamWithCounts = {
  id: "team1",
  name: "Payments Squad",
  description: "Owns payments features",
  created_at: "",
  updated_at: "",
  user_count: 0,
  application_count: 2,
};

describe("TeamMembersSection", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  // Confirmado contra get_full_jsx("TeamsView") e, depois, contra um screenshot real do
  // protótipo: nome, badge de membros, "Add member" e a lista/estado vazio vivem no MESMO
  // bloco — não em dois componentes/duas linhas separadas (essa divisão era a causa raiz da
  // divergência de layout reportada). O screenshot também confirmou que NÃO existe badge de
  // aplicações nem botão de apagar time nesse cabeçalho — os dois foram removidos.
  it("shows the team name in the same header as the member list, with no application-count badge or delete button", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, { message: "ok", data: [] })));

    render(<TeamMembersSection team={team} />, { wrapper: ToastProvider });

    expect(screen.getByText("Payments Squad")).toBeInTheDocument();
    expect(await screen.findByText(/no members yet/i)).toBeInTheDocument();
    expect(screen.queryByText(/application/i)).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: /delete team/i })).not.toBeInTheDocument();
  });

  // Trava o contrato que o e2e (teams-and-users.spec.ts) depende pra escopar o bloco de um time:
  // um ÚNICO elemento `data-testid="team-block"` precisa conter tanto o cabeçalho (nome/"Add
  // member") quanto a lista de membros — não dois containers irmãos disjuntos. Motivo real de
  // existir: essa divisão em dois (TeamRow + TeamMembersSection) foi exatamente a causa raiz da
  // divergência de layout corrigida nesta sessão, e quebrou silenciosamente o e2e (que escopava
  // por um filtro de texto+botão frágil, sensível a em qual <div> cada pedaço acaba morando) — um
  // teste de componente barato aqui pega a mesma regressão antes de precisar rodar o e2e inteiro.
  it("keeps the header (name + Add member) and the member list inside the same team-block", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, { message: "ok", data: [{ team_id: "team1", user_id: "1", is_approver: false, username: "alice", role: "admin" }] })
      )
    );

    render(<TeamMembersSection team={team} />, { wrapper: ToastProvider });
    await screen.findByText("alice");

    const block = screen.getByTestId("team-block");
    expect(within(block).getByText("Payments Squad")).toBeInTheDocument();
    expect(within(block).getByRole("button", { name: /add member/i })).toBeInTheDocument();
    expect(within(block).getByText("alice")).toBeInTheDocument();
  });

  it("shows the member-count badge derived from the loaded member list, using singular wording for one", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, { message: "ok", data: [{ team_id: "team1", user_id: "1", is_approver: false, username: "alice", role: "admin" }] })
      )
    );

    render(<TeamMembersSection team={team} />, { wrapper: ToastProvider });

    expect(await screen.findByText("1 member")).toBeInTheDocument();
  });

  // Confirmado contra get_full_jsx("TeamsView"): o estado vazio real é `.empty.compact` (ícone
  // "users" + `.et` "No members yet" + `.ed` com a descrição), não um texto solto — gap real
  // encontrado nesta auditoria (a versão anterior só tinha o texto, sem a estrutura confirmada).
  it("shows the confirmed empty-state structure (icon + title + description) when the team has no members", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, { message: "ok", data: [] })));

    const { container } = render(<TeamMembersSection team={team} />, { wrapper: ToastProvider });

    const empty = await screen.findByText("No members yet");
    expect(empty).toHaveClass("et");
    expect(container.querySelector(".empty.compact")).toBeInTheDocument();
    expect(screen.getByText("Add the first member to this team.")).toBeInTheDocument();
  });

  // v2.6 §2.10 — badge "no approver" confirmado contra get_full_jsx("TeamsView"):
  // `{isRoot && approverCount === 0 && <span className="badge" ...><Icon name="warn"/> no
  // approver</span>}`, onde approverCount vem de `rows.filter(r => r.m.isApprover).length` — dado
  // já carregado por este componente (GET /teams/:id/approvers), sem endpoint novo nenhum. isRoot
  // é sempre true aqui (TeamsScreen inteiro é root-only), mesma omissão já aplicada nas demais
  // checagens deste arquivo.
  it("shows a 'no approver' badge when no member is an approver", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, { message: "ok", data: [{ team_id: "team1", user_id: "1", is_approver: false, username: "alice", role: "admin" }] })
      )
    );

    render(<TeamMembersSection team={team} />, { wrapper: ToastProvider });

    expect(await screen.findByText("alice")).toBeInTheDocument();
    expect(screen.getByText(/no approver/i)).toBeInTheDocument();
  });

  it("hides the 'no approver' badge once at least one member is an approver", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        jsonResponse(200, { message: "ok", data: [{ team_id: "team1", user_id: "1", is_approver: true, username: "alice", role: "admin" }] })
      )
    );

    render(<TeamMembersSection team={team} />, { wrapper: ToastProvider });

    expect(await screen.findByText("alice")).toBeInTheDocument();
    expect(screen.queryByText(/no approver/i)).not.toBeInTheDocument();
  });

  // Comportamento exato do confirmado: approverCount é 0 também quando não há membro nenhum
  // (filter de uma lista vazia), então o badge aparece mesmo lado a lado com "No members yet." —
  // não gated por rows.length > 0 no protótipo real.
  it("shows the 'no approver' badge even when the team has no members at all", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(jsonResponse(200, { message: "ok", data: [] })));

    render(<TeamMembersSection team={team} />, { wrapper: ToastProvider });

    expect(await screen.findByText(/no members yet/i)).toBeInTheDocument();
    expect(screen.getByText(/no approver/i)).toBeInTheDocument();
  });

  it("lists members and adds a new one via the modal", async () => {
    let added = false;
    const fetchMock = vi.fn().mockImplementation((path: string, init?: RequestInit) => {
      if (path === "/api/users") return Promise.resolve(jsonResponse(200, { success: true, users: [{ id: "2", username: "bob", role: "user", must_change_password: false, created_at: "", updated_at: "" }] }));
      if (init?.method === "POST") {
        added = true;
        return Promise.resolve(jsonResponse(200, { success: true, message: "ok" }));
      }
      return Promise.resolve(
        jsonResponse(200, {
          message: "ok",
          data: added ? [{ team_id: "team1", user_id: "2", is_approver: false, username: "bob", role: "user" }] : [],
        })
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<TeamMembersSection team={team} />, { wrapper: ToastProvider });
    await screen.findByText(/no members yet/i);

    await user.click(screen.getByRole("button", { name: /add member/i }));
    await screen.findByRole("option", { name: "bob" });
    await user.click(screen.getAllByRole("button", { name: /add member/i })[1]); // footer button inside modal

    expect(await screen.findByText("bob")).toBeInTheDocument();
  });

  it("creates a brand-new user for the team from inside the add-member modal", async () => {
    let created = false;
    const fetchMock = vi.fn().mockImplementation((path: string, init?: RequestInit) => {
      if (path === "/api/users" && init?.method === "POST") {
        created = true;
        return Promise.resolve(jsonResponse(201, { success: true, user: { id: "9", name: "Ana Ribeiro", username: "ana.ribeiro", role: "user" }, password: "abc123" }));
      }
      if (path === "/api/users") return Promise.resolve(jsonResponse(200, { success: true, users: [] }));
      return Promise.resolve(
        jsonResponse(200, {
          message: "ok",
          data: created ? [{ team_id: "team1", user_id: "9", is_approver: false, username: "ana.ribeiro", role: "user" }] : [],
        })
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<TeamMembersSection team={team} />, { wrapper: ToastProvider });
    await screen.findByText(/no members yet/i);

    await user.click(screen.getByRole("button", { name: /add member/i }));
    await user.click(screen.getByRole("button", { name: /create a new user for this team/i }));

    // O time já vem travado — sem seletor de time nenhum pra escolher aqui.
    const select = screen.getByLabelText(/^team$/i) as HTMLSelectElement;
    expect(select).toBeDisabled();
    expect(select).toHaveValue("team1");

    await user.type(screen.getByLabelText(/full name/i), "Ana Ribeiro");
    await user.click(screen.getByRole("button", { name: /^create user$/i }));

    expect(await screen.findByText("abc123")).toBeInTheDocument(); // TempPasswordModal, reveal-once
    await user.click(screen.getByRole("checkbox"));
    await user.click(screen.getByRole("button", { name: /got it, i saved it/i }));

    expect(await screen.findByText("ana.ribeiro")).toBeInTheDocument(); // lista recarregada
  });

  it("removes a member", async () => {
    let removed = false;
    const fetchMock = vi.fn().mockImplementation((_path: string, init?: RequestInit) => {
      if (init?.method === "DELETE") {
        removed = true;
        return Promise.resolve(jsonResponse(200, { success: true, message: "ok" }));
      }
      return Promise.resolve(
        jsonResponse(200, {
          message: "ok",
          data: removed ? [] : [{ team_id: "team1", user_id: "1", is_approver: false, username: "alice", role: "admin" }],
        })
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<TeamMembersSection team={team} />, { wrapper: ToastProvider });
    await screen.findByText("alice");

    await user.click(screen.getByRole("button", { name: /remove member/i }));

    expect(await screen.findByText(/no members yet/i)).toBeInTheDocument();
  });

  it("toggles a member's approver status", async () => {
    let isApprover = false;
    const fetchMock = vi.fn().mockImplementation((path: string, init?: RequestInit) => {
      if (path === "/api/teams/team1/approvers/1" && init?.method === "POST") {
        isApprover = true;
        return Promise.resolve(jsonResponse(200, { data: [{ team_id: "team1", user_id: "1", is_approver: true, username: "alice", role: "admin" }] }));
      }
      return Promise.resolve(
        jsonResponse(200, { message: "ok", data: [{ team_id: "team1", user_id: "1", is_approver: isApprover, username: "alice", role: "admin" }] })
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<TeamMembersSection team={team} />, { wrapper: ToastProvider });
    await screen.findByText("alice");

    await user.click(screen.getByRole("switch"));

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/teams/team1/approvers/1",
      expect.objectContaining({ method: "POST", body: JSON.stringify({ is_approver: true }) })
    );
    await vi.waitFor(() => expect(screen.getByRole("switch")).toHaveAttribute("aria-checked", "true"));
  });

  it("shows the server's error message when the approval workflow isn't enabled", async () => {
    const fetchMock = vi.fn().mockImplementation((path: string, init?: RequestInit) => {
      if (path === "/api/teams/team1/approvers/1" && init?.method === "POST") {
        return Promise.resolve(jsonResponse(403, { code: "T0001", message: "approval system must be enabled" }));
      }
      return Promise.resolve(
        jsonResponse(200, { message: "ok", data: [{ team_id: "team1", user_id: "1", is_approver: false, username: "alice", role: "admin" }] })
      );
    });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();

    render(<TeamMembersSection team={team} />, { wrapper: ToastProvider });
    await screen.findByText("alice");

    await user.click(screen.getByRole("switch"));

    expect(await screen.findByText("approval system must be enabled")).toBeInTheDocument();
  });
});
