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
