export const meta = {
  name: 'security-review-mentions',
  description:
    'Adversarial security review of this session new surface (@mention, /mentionable, SLA, renderer)',
  phases: [{ title: 'Probe' }, { title: 'Verify' }],
};

const REPO = '/Users/garridinsi/GIT/gira-scrumlord';

const PROBES = [
  {
    key: 'mention-authz',
    hypothesis:
      'A comment @mention can notify a user who must NOT see it — e.g. an INTERNAL (staff-only) note notifies a client, or a client of a DIFFERENT tenant is notified, or a deactivated user, or the author self-notifies. Find any way the notification fan-out leaks to an unauthorized recipient.',
    files:
      'apps/api/src/modules/issues/routes.ts (the notifyMentions helper + comment POST), packages/domain/src/mentions.ts (parseMentions), apps/api/test/mentions.test.ts',
  },
  {
    key: 'mentionable-enum',
    hypothesis:
      'GET /issues/:key/mentionable lets a CLIENT caller enumerate staff who are NOT visible on the issue (the full staff directory) or users from OTHER tenants — an information-disclosure hole. Verify the client branch staffIds derivation and the own-tenant filter are airtight, and that a client cannot widen the set.',
    files:
      'apps/api/src/modules/issues/routes.ts (the /issues/:key/mentionable route), apps/api/src/lib/scope.ts',
  },
  {
    key: 'mention-xss',
    hypothesis:
      'A crafted @[label](id) mention token injects HTML/script (stored XSS) when rendered as a chip, or the label/id escapes its element. Check the full path: write (sanitizeMarkdown) → store → web render (renderMentions). Also check the parse regexes for ReDoS / catastrophic backtracking.',
    files:
      'apps/web/src/lib/mentions.tsx (renderMentions), packages/domain/src/mentions.ts, packages/domain/src/sanitize.ts, apps/web/src/ui/IssueDrawer.tsx (where renderMentions is used)',
  },
  {
    key: 'sla-authz',
    hypothesis:
      'The SLA endpoints are mis-authorized: a client (or a non-admin) can read/edit a project SLA policy or attainment they should not, or across tenants. Verify the auth preHandler + role gates on the SLA routes and the web strip gate.',
    files:
      'apps/api/src/modules/issues/sla.ts and any SLA route file (grep for sla-policies / attainment under apps/api/src/modules), apps/web/src/pages/ProjectSummaryPage.tsx (SlaPolicyStrip)',
  },
];

const FINDING = {
  type: 'object',
  additionalProperties: false,
  required: ['probe', 'holeFound', 'severity', 'summary'],
  properties: {
    probe: { type: 'string' },
    holeFound: { type: 'boolean' },
    severity: { enum: ['none', 'low', 'medium', 'high', 'critical'] },
    summary: { type: 'string' },
    evidence: { type: 'string', description: 'file:line + the exact code path that proves it' },
    fix: { type: 'string', description: 'concrete remediation if a hole was found' },
  },
};

const VERDICT = {
  type: 'object',
  additionalProperties: false,
  required: ['confirmedReal', 'reasoning'],
  properties: {
    confirmedReal: { type: 'boolean' },
    reasoning: { type: 'string' },
    severity: { enum: ['none', 'low', 'medium', 'high', 'critical'] },
  },
};

phase('Probe');
const results = await pipeline(
  PROBES,
  (p) =>
    agent(
      `You are a security auditor. Work read-only inside ${REPO}. Read the REAL code (do not modify anything).\n\n` +
        `ATTACK HYPOTHESIS to prove or refute:\n${p.hypothesis}\n\nSTART FROM these files (follow the call graph as needed):\n${p.files}\n\n` +
        `Read the actual implementation AND the tests that claim to cover it. Decide whether the hole is REAL (reachable from an API call / user input with a concrete exploit path) or refuted. Be concrete: cite file:line and the exact predicate. Default to holeFound=false unless you can show a real, reachable exploit.`,
      { label: `probe:${p.key}`, phase: 'Probe', schema: FINDING, agentType: 'general-purpose' },
    ),
  (finding, p) =>
    finding && finding.holeFound
      ? agent(
          `Adversarially VERIFY this claimed security hole — try hard to REFUTE it by reading the real code at ${REPO}. A claim is only confirmed if there is a concrete, reachable exploit from an API call or user input (auth gates, tenant scoping, React escaping, Zod validation may already neutralize it). Claim:\n${JSON.stringify(finding)}\n\nProbe was: ${p.hypothesis}`,
          {
            label: `verify:${p.key}`,
            phase: 'Verify',
            schema: VERDICT,
            agentType: 'general-purpose',
          },
        ).then((v) => ({ ...finding, verdict: v }))
      : finding,
);

const confirmed = results
  .filter(Boolean)
  .filter((f) => f.holeFound && f.verdict && f.verdict.confirmedReal);
log(
  `Probes done. Claimed holes: ${results.filter((f) => f && f.holeFound).length}; confirmed-real: ${confirmed.length}`,
);
return { confirmed, all: results.filter(Boolean) };
