# Copilot Instructions for github-downloader

## Project Overview
- This is a GitHub Action for downloading files from a specified GitHub repository and ref (branch/tag/commit).
- Main logic is implemented in TypeScript (`src/index.ts` or `src/main.ts`).
- The action is configured via `action.yml` and invoked using workflow YAML files.

## Architecture & Data Flow
- Inputs are provided via workflow YAML (`git-pat`, `repo`, `ref`, `includes`, `output-directory`).
- The action fetches files from the GitHub API using HTTPS and writes them to the local workspace.
- Downloaded files are summarized using the GitHub Actions `summary` API.
- The code supports downloading multiple files and mapping source:destination paths.

## Key Files & Patterns
- `src/index.ts` / `src/main.ts`: Main entry point, contains the download logic and input parsing.
- `action.yml`: Declares inputs, outputs, and metadata for the GitHub Action.
- `README.md`: Example usage and input documentation.
- `dist/`: Compiled output (do not edit directly).

## Developer Workflows
- **Build:** Use TypeScript. Build output goes to `dist/`.
  - Typical build: `npm run build` (check `package.json` for scripts)
- **Lint:** Run `npm run lint` for code style checks.
- **Test:** No test suite detected; add tests in `src/` if needed.
- **Debug:** Run locally by invoking the main script with Node.js and providing mock inputs.
- **Release:** Update version in `package.json` and tag releases for GitHub Marketplace.

## Conventions & Patterns
- Inputs are parsed using `@actions/core` helpers.
- File downloads use HTTPS and Node.js streams for efficiency.
- Output directories are created recursively as needed.
- Errors are reported using `setFailed` from `@actions/core`.
- Summary tables are generated for workflow visibility.
- Source:destination mapping for file downloads is required (see `includes` input).

## Integration Points
- Relies on GitHub API for raw file access.
- Uses `@actions/core` for workflow integration and reporting.
- Can be extended by adding more inputs or output processing in `src/`.

## Example Patterns
- To add a new input, update both `action.yml` and input parsing in `src/index.ts`.
- To change download logic, modify the `download` function in `src/index.ts`.
- For custom output handling, extend the summary logic after downloads.

---

For questions or unclear conventions, review `README.md`, `action.yml`, and main source files in `src/`. Suggest improvements or ask for clarification if patterns are not documented here.
