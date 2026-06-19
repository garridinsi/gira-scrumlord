// SPDX-License-Identifier: GPL-3.0-or-later
// N4: server-side sanitizer for user/intake-supplied Markdown (comment bodies, issue
// descriptions). Markdown is stored as source and rendered elsewhere; this strips the
// vectors that survive a naive Markdown→HTML render — raw HTML (incl. <script>/<style>
// and inline event handlers) and dangerous URI schemes in links/images — so no consumer
// (a future renderer, an email digest, an export) can be made to execute injected markup.
// Pure: text in, sanitized text out. NOT a Markdown parser — a conservative scrubber.

// An HTML comment, or an unterminated one running to end-of-input. The `(?:-->|$)`
// alternative is load-bearing: with a bare `-->` terminator, a flood of `<!--` openers
// with no close makes the lazy scan rerun to EOF from every opener — O(n²) (polynomial
// ReDoS). Letting the first opener consume to `$` collapses that to a single O(n) pass.
const HTML_COMMENT = /<!--[\s\S]*?(?:-->|$)/g;
// Any HTML/XML tag: <tag …>, </tag>, <tag/>. Requires a letter or '!' after '<', so prose
// like "a < b" or "x<3" is left untouched. Also removes bare autolinks like
// <javascript:alert(1)> (they start with a letter).
const HTML_TAG = /<\/?[a-zA-Z!][^>]*>/g;
// A dangerous scheme opening a Markdown link/image target: `](javascript:` etc.
const DANGEROUS_LINK = /\]\(\s*(?:javascript|data|vbscript|file):/gi;

// One scrubbing pass: strip comments, then tags, then defang dangerous schemes.
function scrubOnce(s: string): string {
  return s
    .replace(HTML_COMMENT, '')
    .replace(HTML_TAG, '')
    .replace(DANGEROUS_LINK, '](#');
}

export function sanitizeMarkdown(input: string): string {
  if (!input) return input;
  // Apply the scrub to a FIXPOINT. A single pass is unsafe: removing an inner match can
  // splice the surrounding halves into a brand-new one — e.g. `<<script>script>` becomes
  // `<script>`, and `](java<x>script:` becomes `](javascript:`. Each pass only deletes
  // characters, so the string shrinks monotonically and the loop always terminates.
  let prev = input;
  let s = scrubOnce(prev);
  while (s !== prev) {
    prev = s;
    s = scrubOnce(prev);
  }
  return s;
}
