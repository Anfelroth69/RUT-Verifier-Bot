# AGENTS.md

## Project Overview

This repository contains a Python + Playwright automation script that logs into the DIAN MUISCA portal and verifies whether a target Colombian citizen ID has an active RUT (Registro Único Tributario).

The project currently consists of a single executable script and is intentionally simple.

Primary entry point:

```text
rut_verifier.py
```

---

## Business Context

Many tax, compliance, and administrative workflows require verifying whether a person has an active RUT.

This automation performs that verification through the MUISCA portal and returns a structured JSON result that can be consumed by humans or external systems.

The project is not affiliated with DIAN.

---

## Repository Structure

```text
.
├── rut_verifier.py
├── README.md
├── AGENTS.md
├── .gitignore
└── .env (local only, never committed)
```

---

## Architecture Overview

Current architecture is intentionally minimal.

```text
Environment Variables
          │
          ▼
DianRutVerifier
          │
          ▼
Authentication
          │
          ▼
Navigation
          │
          ▼
Search Execution
          │
          ▼
Result Evaluation
          │
          ▼
JSON Output
```

All orchestration currently lives inside the `DianRutVerifier` class.

---

## Core Components

### Configuration Loading

Loads required credentials and runtime parameters from `.env`.

Required variables:

```env
DIAN_DOCUMENT=
DIAN_PASSWORD=
CEDULA_CONSULTA=
```

### Authentication

Authenticates against the MUISCA login portal using Playwright.

### Modal Handling

Removes blocking UI elements that may prevent successful navigation.

### Search Execution

Navigates to the consultation module and performs the target search.

### Result Evaluation

Determines whether the queried citizen has an active RUT.

### JSON Reporting

Returns a structured JSON response describing the outcome.

---

## Development Setup

### Installation

```bash
pip install playwright python-dotenv
python -m playwright install chromium
```

### Run

```bash
python rut_verifier.py
```

---

## Local Development Workflow

1. Create a valid `.env`.
2. Execute the script.
3. Verify successful authentication.
4. Verify both positive and negative lookup scenarios.
5. Review logs for unexpected selector failures.

---

## Testing Strategy

No automated test suite currently exists.

Validation should be performed using:

* One ID known to have a RUT.
* One ID known not to have a RUT.

Any selector modification must verify both scenarios.

---

## Code Quality Standards

### General Principles

* Keep solutions simple.
* Avoid unnecessary abstractions.
* Avoid premature optimization.
* Prefer readability over cleverness.
* Preserve existing behavior unless explicitly requested.

### Python Conventions

* Follow PEP 8.
* Use descriptive names.
* Prefer explicit error handling.
* Avoid duplicated logic when practical.
* Use logging instead of print statements for operational events.

---

## Playwright Guidelines

### Preferred

* Stable CSS selectors.
* Element visibility checks.
* Dynamic waiting strategies.
* Polling based on actual page state.

### Avoid

* Fragile absolute XPaths.
* Arbitrary long sleep timers.
* Hardcoded timing assumptions.

---

## Critical Constraints

### Localization

The following settings are critical:

```python
locale="es-CO"
```

```http
Accept-Language: es-CO,es;q=0.9
```

Removing or changing these values may cause routing failures inside the DIAN platform.

Do not modify them without clear justification.

### Result Detection

Current result evaluation relies on:

```python
span.textoNegro
```

and specific "no registration" patterns.

Changes to this logic require careful validation.

### Polling Loop

The current implementation uses repeated checks instead of a single fixed timeout.

Do not replace the polling mechanism with arbitrary sleep-based approaches.

---

## Error Handling Standards

* Fail fast when configuration is invalid.
* Do not silently ignore exceptions.
* Preserve meaningful error messages.
* Always close browser resources.

---

## Logging Standards

Use:

```python
logging.info(...)
logging.warning(...)
logging.error(...)
```

Do not log credentials or sensitive information.

---

## Security Rules

### Never

* Commit `.env`.
* Hardcode credentials.
* Log passwords.
* Expose secrets in code, logs, documentation, or examples.

### Always

* Keep `.env` in `.gitignore`.
* Use environment variables for secrets.
* Minimize sensitive output.

---

## Dependency Management

Current runtime dependencies:

* playwright
* python-dotenv

Do not introduce large frameworks or additional dependencies unless they provide clear value.

---

## Git Workflow

Keep changes small and focused.

Avoid mixing unrelated modifications in a single commit.

---

## Commit Standards

Use Conventional Commits:

```text
feat:
fix:
refactor:
docs:
test:
chore:
```

Examples:

```text
feat: improve result detection logic
fix: handle missing modal close button
docs: update installation instructions
```

---

## Known Technical Debt

Observed from the current implementation:

* Single-file architecture.
* No automated tests.
* Tight coupling to external portal selectors.
* Tight coupling to current MUISCA UI structure.
* Synchronous Playwright execution.
* Limited observability beyond logs.

---

## Future Improvements

Potential future work:

* Modularize responsibilities.
* Add automated tests.
* Add screenshot capture on failures.
* Add structured logging.
* Add Docker support.
* Add CI/CD workflows.
* Add API wrapper layer.
* Add retry and resilience strategies.

---

## Instructions For Human Contributors

Before modifying selectors:

1. Verify the target page manually.
2. Understand the full navigation flow.
3. Test both success and failure scenarios.

Before opening a pull request:

1. Verify the script executes successfully.
2. Verify JSON output remains valid.
3. Ensure no secrets were committed.

---

## Instructions For AI Agents

### Architectural Boundaries

You may freely modify:

* Internal implementation details.
* Selectors.
* Logging improvements.
* Error handling improvements.

Use caution when modifying:

* Authentication flow.
* Localization configuration.
* Result evaluation logic.
* Polling behavior.

Do not modify without justification:

* Environment variable names.
* JSON response contract.
* Security-related behavior.

### Change Management

Before making changes:

1. Understand the affected execution phase.
2. Identify downstream impacts.
3. Preserve compatibility.
4. Keep changes minimal.

### File Editing Rules

* Modify only necessary files.
* Avoid massive refactors unless requested.
* Do not rename files without justification.
* Do not introduce new folders without clear value.

### Testing Requirements

Every change should:

* Execute successfully.
* Preserve existing behavior.
* Maintain valid JSON output.
* Avoid obvious regressions.

### Security Requirements

Never:

* Expose secrets.
* Hardcode credentials.
* Log sensitive information.
* Introduce unnecessary dependencies.

### Documentation Requirements

Update documentation when:

* Behavior changes.
* Configuration changes.
* Installation steps change.
* Output structure changes.

### Autonomy Limits

Do not:

* Remove existing functionality without approval.
* Change business behavior without justification.
* Rewrite the architecture without explicit request.
* Add major dependencies without explaining tradeoffs.

### Decision-Making Framework

Prioritize:

1. Simplicity
2. Maintainability
3. Security
4. Compatibility
5. Performance

### Definition of Done

A change is complete when:

* The script executes successfully.
* Existing behavior is preserved.
* JSON output remains valid.
* No secrets are exposed.
* Documentation is updated when required.
* Another developer can understand the change without additional context.

---

## OpenSpec Spec-Driven Workflow

### Roles

- **User**: Plans together with the assistant. Confirms with "listo para build".
- **Assistant (orchestrator)**: Loads codebase context via codebase-memory-mcp, launches subagents via `Task(subagent_type="explore")`, executes implementation (edit/write) inline, chains outputs across agents, delivers a final summary to the user.

### Build Mode Orchestration

When the user confirms "listo para build", the assistant executes:

```
[Assistant (orchestrator)]
   │
   ├── 0. Load MCP context from the codebase → compiles {{CONTEXT}} block
   │      (get_architecture, detect_changes, search_graph, trace_path,
   │       get_code_snippet, query_graph, manage_adr)
   │
   ├── 1. Task(explore, prompt=01-proposal-agent.md + {{CONTEXT}})
   │      → Plan de cambios
   │
   ├── 2. [if touches frontend/] Task(explore, prompt=05-frontend-design-agent.md
   │      + {{CONTEXT}} + Plan) → Design Brief
   │
   ├── 3. Task(explore, prompt=02-specs-agent.md + {{CONTEXT}} + Plan)
   │      → Veredicto ✅/⚠️/❌   [if ❌ → back to step 1 with observations]
   │
   ├── 4. Assistant executes edit/write inline (preserves JSON contract)
   │      following the approved Plan + Agent 3's Edit Instructions
   │
   ├── 5. Task(explore, prompt=04-verify-agent.md + {{CONTEXT}} + changes)
   │      → Resultado de verificación
   │
   └── 6. Assistant delivers final summary to the user

   Note: Agent 3 (Implementación) is launched as a subagent that PRODUCES edit
   instructions, then the orchestrator APPLIES those edits inline. The subagent
   cannot edit files because explore lacks edit/write tools.
```

Agent 5 only runs when the plan touches `frontend/`. For backend-only changes, the chain skips Agent 5: step 1 → step 3 → step 4 → step 5.

Agent definitions and prompts in `openspec/agents/`:
- `01-proposal-agent.md` — Analyzes the problem, generates a change plan from {{CONTEXT}}
- `02-specs-agent.md` — Validates the plan against OpenSpecs and project rules
- `03-implement-agent.md` — Produces precise edit instructions for the orchestrator (no direct edits)
- `04-verify-agent.md` — Runs tests, validates JSON contract, checks regressions
- `05-frontend-design-agent.md` — Designs frontend with design-taste-frontend + modern-web-guidance skills (only if the plan touches `frontend/`)

### Orchestration rules

1. The assistant runs the MCP queries **before** launching any subagent
2. Subagents receive a pre-loaded `{{CONTEXT}}` block — they do NOT run MCP themselves (explore subagents only have bash/glob/grep/read/webfetch)
3. Subagents are launched via `Task` tool with `subagent_type="explore"`
4. Implementation (edit/write) is executed by the assistant inline, based on Agent 3's Edit Instructions
5. If Agent 2 rejects the plan, go back to Agent 1 with the observations
6. If Agent 4 finds failures, report them for manual correction
7. Agent 5 (Frontend Design) is invoked only when the plan affects files in `frontend/`
8. Always ask the user for confirmation before starting the chain, showing a plan summary

### MCP queries pre-orchestration (executed by the assistant)

**Always:**
- `get_architecture(project, aspects=['all'])` — structure, clusters, hotspots
- `detect_changes(project)` — recent changes and their impact
- `manage_adr(project, mode='get')` — active Architecture Decision Records

**Feature-dependent:**
- `search_graph(query=..., project=...)` — relevant components
- `trace_path(function_name=..., direction='both', project=...)` — dependencies
- `get_code_snippet(qualified_name=..., project=...)` — key implementations
- `query_graph(project, query=...)` — ad-hoc structural queries

### `{{CONTEXT}}` block format

The assistant compiles a markdown block with:

```markdown
## Contexto del codebase (vía MCP)

### Arquitectura
- Stack: [detected]
- Componentes principales: [list with paths and role]
- Clusters funcionales: [groups]
- Hotspots: [points with highest fan-in/fan-out]
- Capas y boundaries: [api/entry/internal/leaf]

### Cambios recientes (detect_changes)
[diff summary from the last relevant commit]

### Componentes relevantes al feature
[get_code_snippet output of key files, trace_path of dependencies]

### ADRs activos
[manage_adr output]

### Specs relevantes
[summarized content of openspec/specs/*/spec.md for the affected area]
```

The `{{CONTEXT}}` should be **as complete as possible** — subagents cannot query the graph themselves. Include all relevant code snippets, dependencies, and rules the subagent will need to emit its verdict/brief/plan.

### Round-trip protocol

If a subagent's output contains a section `## Necesito profundizar` with a list of missing context, the assistant:

1. Runs the necessary MCP queries (search_graph, trace_path, get_code_snippet)
2. Appends the results to the original `{{CONTEXT}}` block
3. Relaunches the same subagent with the expanded `{{CONTEXT}}` + previous inputs

A round-trip costs one new Task invocation plus the orchestrator's MCP queries. Minimize round-trips by making the initial `{{CONTEXT}}` as complete as possible.
