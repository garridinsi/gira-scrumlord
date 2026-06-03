// SPDX-License-Identifier: GPL-3.0-or-later
// N4: server-side sanitizer for user/intake-supplied Markdown (comment bodies, issue
// descriptions). Markdown is stored as source and rendered elsewhere; this strips the
// vectors that survive a naive Markdown→HTML render — raw HTML (incl. <script>/<style>
// and inline event handlers) and dangerous URI schemes in links/images — so no consumer
// (a future renderer, an email digest, an export) can be made to execute injected markup.
// Pure: text in, sanitized text out. NOT a Markdown parser — a conservative scrubber.

const HTML_COMMENT = /<!--[\s\S]*?-->/g;
// Any HTML/XML tag: <tag …>, </tag>, <tag/>. Requires a letter or '!' after '<', so prose
// like "a < b" or "x<3" is left untouched. Also removes bare autolinks like
// <javascript:alert(1)> (they start with a letter).
const HTML_TAG = /<\/?[a-zA-Z!][^>]*>/g;
// A dangerous scheme opening a Markdown link/image target: `](javascript:` etc.
const DANGEROUS_LINK = /\]\(\s*(?:javascript|data|vbscript|file):/gi;

export function sanitizeMarkdown(input: string): string {
  if (!input) return input;
  // 1. Strip raw HTML (tags, event-handler-bearing elements, comments, autolinks).
  let s = input.replace(HTML_COMMENT, '').replace(HTML_TAG, '');
  // 2. Defang dangerous link/image schemes: `](scheme:rest)` → `](#rest)`, a harmless
  //    fragment link. We neutralize the SCHEME (what makes it executable) rather than
  //    trying to parse the whole URL — robust even when the URL contains parens.
  s = s.replace(DANGEROUS_LINK, '](#');
  return s;
}
