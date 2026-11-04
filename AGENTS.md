# AGENTS.md

This document describes the project for developers and AI agents working on this codebase.

## Project Overview

**UjiAman** — a secure online exam browser (UI in Bahasa Indonesia). One login form auto-detects the role (siswa / pengawas / admin). Students pass camera + sound + token checks, then take the exam in locked fullscreen with violation detection; proctors/admins manage the rotating token, pause the exam, monitor students, manage the question bank, and export results.

**Continue from [PLAN.md](PLAN.md).** Milestone 1 (full UI, client-side) is done; the next milestone is Netlify Database + migrations.

### Architecture (milestone 1)

- All data is stubbed. `src/lib/fixtures.ts` holds accounts, exam info, and sample questions. `src/lib/exam-store.ts` is a localStorage "fake backend" (auth, token, pause control, attempts, results, question bank) that dispatches a `ua:change` event and listens to `storage` events so tabs stay in sync. **Replace these functions with server functions backed by Netlify Database; keep their signatures so components don't change.**
- Answer keys currently live in the client bundle — acceptable only for the demo; scoring must move server-side (PLAN milestone 4).
- Every route reads storage inside `useEffect` and shows a spinner until mounted (SSR-safe).

### Routes

| Route | Purpose |
| --- | --- |
| `/` | Landing (bento) + login, password preview, auto role routing |
| `/token` | Student pre-exam: camera check, sound check, token, rules, demo token hint |
| `/ujian` | Exam page: security listeners, timer, nav popover (top-right), doubt/skip/refresh-per-question, submit only on last question, double-confirm dialogs, camera module, watermark |
| `/hasil` | Results & analysis, CSV/Excel export |
| `/pengawas` | Proctor dashboard |
| `/admin` | Admin: overview, question bank, settings |

### Key modules

- `src/lib/secure-mode.ts` — fullscreen + Keyboard Lock API.
- `src/lib/sound.ts` — Web Audio alarm/warn/test tones.
- `src/lib/shuffle.ts` — deterministic per-student shuffle (seed = username + exam id).
- `src/lib/question-import.ts` — dependency-free .xlsx/.docx reader (ZIP + `DecompressionStream`), CSV and text-format parser.
- `src/lib/export.ts` — CSV (UTF-8 BOM) and Excel (.xls HTML table) export.
- `src/components/exam/*` — brand, password input, two-step confirm, camera, watermark.
- `src/components/dashboard/*` — shell/panel, token card, control card, student monitor, results card, question bank.

### Non-obvious rules

- Token: one code for all students, auto-rotates every `tokenIntervalMinutes` (default 5); a student can never reuse a token they already used, so re-entry always needs a fresh token.
- Timer: `remainingMs()` = start + duration + (global pause accumulated since the student started) − now. It keeps running while the student is away; it stops only when the exam is paused (proctor or "server error").
- Any fullscreen exit / tab switch / blur >600ms / reload during `/ujian` locks the attempt, logs out, and plays the alarm. Intentional exit/submit sets `leavingRef` first so it isn't counted.
- Design: neumorphic utilities `neu`, `neu-sm`, `neu-inset`, `neu-press` and light animations `animate-rise`, `animate-shake`, `animate-pulse-soft` are defined in `src/styles.css`. Fonts: Plus Jakarta Sans + JetBrains Mono.

## Key Concepts

### File-Based Routing

Route files in `src/routes/` define pages and endpoints:

- `__root.tsx` wraps every page.
- `index.tsx` is `/`.
- `about.tsx` would be `/about`.
- `api.*.ts` files are server API endpoints. See the `tanstack-start-api-routes` skill.

### Theme Variables

Colors and corner radius are CSS variables in `src/styles.css` (`--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--border`, `--radius`, and more), with a second set under `.dark`. Tailwind exposes them as classes such as `bg-primary`, `text-muted-foreground`, and `border-border`.

Set these variables for the product before you build any page. In components, use the variable classes instead of raw colors like `bg-white` or `text-gray-600`, so the whole site changes when a variable changes.

### UI Components

Ready-made components are in `src/components/ui/`. Use them before writing your own, and restyle them through the theme variables or their variants. Add more with `npx shadcn add <name>`. Show a toast by calling `toast()` from `sonner`; the container is already mounted in `__root.tsx`. `TooltipProvider` is mounted there too, so `Tooltip` works anywhere without its own provider.

| Need               | Components                                                         |
| ------------------ | ------------------------------------------------------------------ |
| Actions and status | Button, Badge, Progress, Skeleton, Alert, Sonner                   |
| Forms              | Input, Textarea, Label, Checkbox, RadioGroup, Switch, Select, Form |
| Overlays and menus | Dialog, Sheet, Popover, DropdownMenu, Tooltip                      |
| Content and layout | Card, Tabs, Accordion, Separator, Table                            |

Use `Form` with React Hook Form and the Zod resolver. Start from `src/examples/validated-form.tsx`; it isn't mounted or connected to a backend. Its required `onSubmit` callback must reject on failure. See [the form pattern](docs/forms.md) for HTTP submission and error handling.

Use Sheet for a mobile menu and DropdownMenu for short action lists. Give Dialog and Sheet an accessible title and description. Pair Checkbox, RadioGroup, Switch, and inputs with visible labels. Reserve tables for tabular data and wrap them in their provided scroll container.

### Design Choices

Set the product's palette, heading/body fonts, and layout before building its screens. Use an explicit user design when supplied; otherwise choose defaults that fit the product. Keep Basic's placeholder until you replace it with the requested product.

- Set `--font-body` and `--font-heading` in `src/styles.css`. Use `font-display` for headings when the product needs a separate heading font.
- Use `max-w-content` for a page container and `max-w-reading` for long text. Keep consistent horizontal padding, such as `px-4 sm:px-6`, and a small repeated spacing scale, such as `gap-4`, `gap-6`, and `py-12`.
- Keep one main heading per page and a clear heading order. Use muted text for supporting copy, not essential low-contrast labels.
- Preserve focus rings. Give icon-only buttons an accessible name. Ensure actions work with a keyboard and on narrow screens.
- Use short color/opacity transitions. Add `motion-reduce:transition-none` or `motion-reduce:animate-none` when adding motion; don't make essential content depend on animation.
- Provide loading, empty, error, and success states for each data-driven screen. Skeletons should follow the shape of the content they replace.

### Routing and Server Data

Router types are registered in `src/router.tsx`, so use typed `Link` destinations and route parameters. The root route supplies the themed 404 page; the router's default error component supplies the safe retry/home page, including child-route SSR failures. Use `throw notFound()` for absent records; keep unexpected failures on the error path. See [routing conventions](src/routes/README.md).

Start with route loaders and server functions for server data. Validate server-function input with `.validator(...)`, keep secrets on the server, and handle HTTP failures before returning data. See [the data-fetching pattern](docs/data-fetching.md). Add TanStack Query only when client-side caching, mutations, or background refresh are needed.

### Browser Storage

Pages are rendered on the server first, where `window` and `localStorage` don't exist. Read `localStorage` inside `useEffect`, not during render or in a `useState` initializer, or the first render will differ from the server HTML and React will log a hydration error.

## Configuration Files

| File             | Purpose                                                                                          |
| ---------------- | ------------------------------------------------------------------------------------------------ |
| `vite.config.ts` | Vite path aliases and Tailwind, Netlify, TanStack Start, React plugins                           |
| `tsconfig.json`  | Strict TypeScript, with the `@/*` alias for `src/*`                                              |
| `netlify.toml`   | Builds with `vite build`, publishes `dist/client`, dev server on port 8888 proxying Vite on 3000 |

## Development Commands

Use Node 22.13+ on the Node 22 line, Node 24, or Node 26+. The installed lint and test tools set this minimum alongside the framework.

```bash
npm run dev        # Start the Vite dev server on port 3000
npm run build      # Production build
npm run typecheck  # Type-check with tsc; the build doesn't
npm run lint       # Check TypeScript and React Hooks rules
npm run format:check # Check formatting
npm run format     # Format project files
npm test           # Run local form, control, and error page tests
npm run preview    # Preview the production build
```

## Conventions

- Components: PascalCase. Utilities and hooks: camelCase. Route files: kebab-case.
- Import from `src` with the `@/` alias.
- TypeScript fails on unused locals and parameters, so remove what you don't use.
- Use React hooks for state.
- Run the dev server or build once to generate route types before type-checking a fresh copy.
- Run build, typecheck, lint, format:check, and tests before reporting completion. Verify changed user flows locally; a passing build doesn't prove an interaction works.

## Application Name

Set the product's name and description in `src/routes/__root.tsx`:

- `siteName` is the page title and the title shown when the link is shared.
- `siteDescription` is the meta description and the description shown when the link is shared.

Then replace the placeholder heading and text in `src/routes/index.tsx`.
