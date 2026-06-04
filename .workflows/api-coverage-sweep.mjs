export const meta = {
  name: 'api-coverage-sweep',
  description: 'Author dedicated coverage tests (or justified c8-ignores) for API files with gaps',
  phases: [{ title: 'Author', detail: 'one agent per gap file → a dedicated cov-*.test.ts' }],
};

// args may arrive as a parsed object or as a JSON string depending on the caller.
const gaps = typeof args === 'string' ? JSON.parse(args) : args; // { "src/...": [lines] }
const API = '/Users/garridinsi/GIT/gira-scrumlord/apps/api';

const SCHEMA = {
  type: 'object',
  additionalProperties: false,
  required: ['file', 'approach', 'newTestFile', 'risk'],
  properties: {
    file: { type: 'string' },
    newTestFile: { type: 'string', description: 'path of the file written, or "" if none' },
    approach: { enum: ['tests', 'c8-ignore', 'mixed', 'skipped'] },
    addedTests: { type: 'number' },
    c8Ignores: {
      type: 'array',
      items: {
        type: 'object',
        additionalProperties: false,
        required: ['line', 'reason'],
        properties: { line: { type: 'number' }, reason: { type: 'string' } },
      },
    },
    risk: {
      enum: ['low', 'med', 'high'],
      description: 'how likely the authored tests fail to compile/pass',
    },
    notes: { type: 'string' },
  },
};

const slug = (f) =>
  f
    .replace(/^src\//, '')
    .replace(/\.[cm]?ts$/, '')
    .replace(/[\/.]/g, '-');

function prompt(file, lines) {
  return `You are closing test-coverage gaps for ONE source file in a Fastify + Prisma API
(pnpm/TS monorepo). Work ONLY inside ${API}.

TARGET SOURCE: ${file}
UNCOVERED LINES (v8 statement/branch lines NOT reached by the current suite): [${lines.join(', ')}]

GOAL: make those lines covered, either by adding a NEW dedicated test file with surgical
cases, or — for genuinely unreachable/defensive lines — by adding a documented c8-ignore to
the SOURCE. Prefer real tests; use c8-ignore only when a line truly cannot be reached from an
API call or unit input (e.g. a defensive \`?? null\`, a prod-only guard, an error-translation
arm needing an impossible DB state).

HARD RULES:
1. READ FIRST: open ${file} and look at the exact uncovered lines to understand each gap.
   Then READ the closest existing test under ${API}/test/ for this module (e.g.
   src/modules/issues/routes.ts ⇒ test/issues.test.ts; lib/* is exercised across several —
   grep test/ for the symbol) to learn the EXACT harness + helpers it uses.
2. WRITE A NEW DEDICATED TEST FILE: ${API}/test/cov-${slug(file)}.test.ts. Do NOT edit any
   existing test file — other agents own those; a new file guarantees no write conflict.
   Replicate the minimal setup you saw (see SKELETON below). If you ONLY apply c8-ignores and
   write no test, set newTestFile to "".
3. DO NOT RUN vitest / any test or coverage command. The Postgres test DB is shared and
   parallel runs corrupt each other. Author by faithfully mirroring existing tests. You MAY
   Read/Grep/LS freely. (You may run \`node -e\`/grep for inspection, never the test runner.)
4. Match the codebase exactly: SPDX header \`// SPDX-License-Identifier: GPL-3.0-or-later\` on
   new files; no \`any\`; honour noUncheckedIndexedAccess (use \`!\` on indexed access); keep
   bilingual "es · en" strings if the asserted text has them. Types MUST be correct.
5. Keep it surgical — cover the listed lines, nothing speculative. Correct-and-compiling beats
   broad. If a gap is unreachable, c8-ignore the SOURCE line with a one-line reason instead.

HARNESS SKELETON (adapt to the module; copy helper names from the real existing test):
\`\`\`ts
// SPDX-License-Identifier: GPL-3.0-or-later
import type { FastifyInstance } from 'fastify';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { buildApp } from '../src/app.js';
import { actingAs, makeUser } from './helpers/auth.js';
import { prisma, resetDb } from './helpers/db.js';
import { seedProject } from './helpers/fixtures.js';

describe('cov ${file}', () => {
  let app: FastifyInstance;
  beforeAll(async () => { app = await buildApp(); });
  afterAll(async () => { await app.close(); });
  beforeEach(async () => { await resetDb(); });

  it('...targets line N...', async () => {
    const { user, cookie } = await actingAs({ role: 'admin' });
    // ...seedProject / prisma setup, then:
    const res = await app.inject({ method: 'GET', url: '/...', headers: { cookie } });
    expect(res.statusCode).toBe(200);
  });
});
\`\`\`
Pure-function/lib files (lib/views.ts, lib/tx.ts, domain helpers) may be unit-tested directly
without buildApp — import the function and assert. KNOWN GOTCHA: to test a thrown async path,
use a SYNCHRONOUS throw in a mock (\`mockImplementation(() => { throw e })\`), NOT
mockRejectedValue — vitest 2.1.9's unhandled-rejection detector fails the test otherwise.

Return the structured result. Set risk honestly (high if you could not fully mirror the
harness or are unsure it compiles).`;
}

const files = Object.keys(gaps);
log(`API coverage sweep: ${files.length} files`);

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
  `Done: ${ok.length}/${files.length} authored — low ${byRisk('low')} / med ${byRisk('med')} / high ${byRisk('high')}`,
);
return ok;
