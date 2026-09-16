import { expect, test } from "@playwright/test";
import { ROOT_STATE } from "../fixtures";
import { modalButton } from "../helpers";

// Nenhuma dessas rotas é approval-aware (docs/rest-flow.md) — uma variante só, sempre aplica na
// hora. Um fluxo administrativo completo e realista: root cria um time novo, cria uma pessoa
// (já como aprovadora do time original dela), depois adiciona essa mesma pessoa a este time novo
// também (multi-time é permitido) e a designa aprovadora aqui também — dois team_users
// independentes para o mesmo usuário.
test("root creates a team, creates a user, and manages team membership/approver status", async ({ browser }) => {
  const rootContext = await browser.newContext({ storageState: ROOT_STATE });
  const rootPage = await rootContext.newPage();

  // 1. Criar time.
  await rootPage.goto("/teams");
  await rootPage.getByRole("button", { name: "New team" }).click();
  await rootPage.locator("#team-name").fill("E2E Second Team");
  await rootPage.locator("#team-description").fill("Created by the teams-and-users e2e spec");
  await rootPage.getByRole("button", { name: "Create team" }).click();
  await expect(rootPage.getByText("E2E Second Team")).toBeVisible();

  // Escopa pelo bloco (data-testid="team-block", TeamMembersSection.tsx) do time recém-criado —
  // um filtro de texto+botão foi tentado antes disso e quebrou (não uma vez, mas estruturalmente:
  // qualquer ajuste de layout que mova nome/botão pra divs diferentes muda qual <div> o filtro
  // resolve), quando o fix da divergência de layout de Teams & People uniu TeamRow+
  // TeamMembersSection num só componente. Reusado do começo ao fim: um time recém-criado, sem
  // nenhum membro, já é candidato ao badge "no approver" (v2.6 §2.10, confirmado contra
  // get_full_jsx("TeamsView") — approverCount é 0 tanto com zero membros quanto com membros
  // nenhum aprovador).
  const newTeamSection = rootPage.getByTestId("team-block").filter({ hasText: "E2E Second Team" });
  await expect(newTeamSection.getByText(/no approver/i)).toBeVisible();

  // Regressão real: `.compact` (a caixa com moldura ao redor de "No members yet", confirmada via
  // design-graph get_component_spec(".compact")) tinha ficado inteiramente ausente do global.css
  // — className="empty compact" caía só no `.empty` genérico, sem borda/fundo. Um teste de
  // componente (jsdom) só prova que a className foi aplicada, nunca que a REGRA existe no CSS de
  // verdade — só um browser real (Playwright) consegue pegar essa classe de bug via
  // getComputedStyle. `borderStyle` só é "solid" se a regra `.compact` (border: 1px solid
  // var(--border)) estiver realmente carregada e vencendo a cascata contra `.empty`.
  const emptyState = newTeamSection.locator(".empty.compact");
  await expect(emptyState.getByText("No members yet")).toBeVisible();
  await expect(emptyState.getByText("Add the first member to this team.")).toBeVisible();
  expect(await emptyState.evaluate((el) => getComputedStyle(el).borderStyle)).toBe("solid");

  // 2. Criar usuário — admin, aprovador, no time "E2E Team" (o time da fixture compartilhada,
  // não o recém-criado).
  await rootPage.goto("/users");
  await rootPage.getByRole("button", { name: "Create user" }).click();
  await rootPage.locator("#new-user-name").fill("E2E Teams User");
  await rootPage.locator("#new-user-username").fill("e2e-teams-user");
  await rootPage.locator("#new-user-team").selectOption({ label: "E2E Team" });
  await rootPage.locator("#new-user-role").selectOption("admin");
  await rootPage.getByRole("switch", { name: "Team approver" }).click();
  await modalButton(rootPage, "Create user").click();

  await expect(rootPage.getByText("User created")).toBeVisible();
  await rootPage.locator(".skey-ack input[type=checkbox]").check();
  await rootPage.getByRole("button", { name: /got it, i saved it/i }).click();
  await expect(rootPage.getByText("e2e-teams-user")).toBeVisible();

  // 3. Adicionar esse mesmo usuário ao time novo, e designá-lo aprovador AQUI também (é um
  // team_users independente do primeiro — is_approver não é global no usuário).
  await rootPage.goto("/teams");
  await newTeamSection.getByRole("button", { name: "Add member" }).click();
  await rootPage.locator("#member-user").selectOption({ label: "e2e-teams-user" });
  await modalButton(rootPage, "Add to team").click();

  // Escopado a newTeamSection: esse usuário já é membro (e aprovador) do time "E2E Team" também
  // — sem escopo, ".member" bateria nas duas seções da página.
  const memberRow = newTeamSection.locator(".member", { hasText: "e2e-teams-user" });
  await expect(memberRow).toBeVisible();
  await expect(newTeamSection.getByText(/no approver/i)).toBeVisible(); // membro ainda não é aprovador
  const approverSwitch = memberRow.getByRole("switch", { name: "Approver" });
  await expect(approverSwitch).toHaveAttribute("aria-checked", "false"); // novo team_users, começa false
  await approverSwitch.click();
  await expect(approverSwitch).toHaveAttribute("aria-checked", "true");
  await expect(newTeamSection.getByText(/no approver/i)).not.toBeVisible(); // badge some com o 1º aprovador

  await rootContext.close();
});
