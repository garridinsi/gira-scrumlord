export const meta = {
  name: 'web-coverage-sweep',
  description:
    'Author dedicated coverage tests (or justified ignores) for web (RTL/jsdom) files with gaps',
  phases: [{ title: 'Author', detail: 'one agent per gap file → a dedicated cov-*.test.tsx' }],
};

const gaps = typeof args === 'string' ? JSON.parse(args) : args; // { "src/...": [lines] }
const WEB = '/Users/garridinsi/GIT/gira-scrumlord/apps/web';

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['file', 'approach', 'newTestFile', 'risk'],
  properties: {
    file: { type: 'string' },
    newTestFile: { type: 'string', description: 'path written, or "" if none' },
    approach: { enum: ['tests', 'ignore', 'mixed', 'skipped'] },
    addedTests: { type: 'number' },
    ignores: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['line', 'reason'],
        properties: { line: { type: 'number' }, reason: { type: 'string' } },
      },
    },
    risk: { enum: ['low', 'med', 'high'] },
    notes: { type: 'string' },
  },
};

const slug = (f) =>
  f
    .replace(/^src\//, '')
    .replace(/\.[cm]?tsx?$/, '')
    .replace(/[\/.]/g, '-');

function prompt(file, lines) {
  return `You are closing test-coverage gaps for ONE React/TypeScript source file in a Vite +
React 18 + React-Query + React-Router web app (bilingual "ES · EN" UI). Work ONLY inside ${WEB}.
Tests use Vitest + jsdom + @testing-library/react.

TARGET SOURCE: ${file}
UNCOVERED LINES (v8 statement/branch lines NOT reached by the current suite): [${lines.join(', ')}]

GOAL: cover those lines by adding a NEW dedicated test file with surgical RTL cases, or — for
genuinely unreachable/defensive lines — add a documented \`/* v8 ignore next */\` to the SOURCE
with a one-line reason. Prefer real tests.

HARD RULES:
1. READ FIRST: open ${file} at the uncovered lines. Then READ the CLOSEST existing test under
   ${WEB}/src/test/ (e.g. pages/BoardPage.tsx ⇒ src/test/board-page.test.tsx) AND read
   ${WEB}/src/test/render.tsx to learn renderWithProviders. Mirror the existing mocking style
   EXACTLY.
2. WRITE A NEW DEDICATED FILE: ${WEB}/src/test/cov-${slug(file)}.test.tsx. Do NOT edit any
   existing test file (other agents own those). If you only apply v8-ignores, set newTestFile "".
3. DO NOT RUN vitest / coverage. Author by faithfully mirroring existing tests. Read/Grep freely.
4. WEB HARNESS PATTERNS (copy from the real sibling test):
   - import { renderWithProviders } from './render'  (QueryClient with no-op error caches + MemoryRouter).
   - Mock the API: const h = vi.hoisted(() => ({ fn: vi.fn() })); vi.mock('../api/client', () => ({ ... }));
     reset in beforeEach. Assert via screen.findBy*/getBy* + userEvent.
   - KEY-PARAM PAGES (useParams: Board/ProjectSummary/Sprints/Billing/InvoiceDetail/Monthly): render
     under a real Route → renderWithProviders(<Routes><Route path="/projects/:key/x" element={<Page/>}/></Routes>, { route: '/projects/MNT/x' }); else useParams is {} and enabled:!!key queries never run.
   - Mock per-page hooks too: vi.mock('../hooks/useAuth', () => ({ useMe: () => ({ data: { role: 'admin' } }) })), useProjectTabs, useTimer, ui/Toast (useToast).
5. CRITICAL GOTCHAS (these WILL bite):
   - A component stub inside a hoisted vi.mock factory MUST return \`() => null\`, NOT JSX
     (\`() => <div/>\` breaks the jsdom env with "document is not defined").
   - Run-from-root mistake is irrelevant to you (you don't run tests), but the jsdom env lives in
     ${WEB}/vite.config.ts (environment: 'jsdom').
   - es-ES Intl.NumberFormat in jsdom does NOT group 4-digit integers (1234 not "1.234"); assert
     accordingly.
   - To drive a query/mutation ERROR branch, mockRejectedValue works under renderWithProviders
     (its caches swallow the rejection); assert the rendered error UI. If a branch keys off
     \`!data\` (resolved null) prefer that.
   - noUncheckedIndexedAccess is on: use \`!\` on indexed access. No \`any\`. SPDX header on new files.
6. Keep it surgical and COMPILING. If a line is truly unreachable (dead defensive branch, a
   \`?? fallback\` that can't occur), v8-ignore the SOURCE line with a reason instead of forcing it.

Return the structured result; set risk honestly (high if unsure it compiles/passes).`;
}

const files = Object.keys(gaps);
log(`Web coverage sweep: ${files.length} files`);

const results = await parallel(
  files.map(
    (f) => () =>
      agent(prompt(f, gaps[f]), {
        label: `cov:${slug(f)}`,
        phase: 'Author',
        schema: SCHEMA,
        agentType: 'general-purpose',
      }),
  ),
);

const ok = results.filter(Boolean);
const byRisk = (r) => ok.filter((x) => x.risk === r).length;
log(
  `Done: ${ok.length}/${files.length} — low ${byRisk('low')} / med ${byRisk('med')} / high ${byRisk('high')}`,
);
return ok;
