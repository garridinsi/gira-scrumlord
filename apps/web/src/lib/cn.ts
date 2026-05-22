// SPDX-License-Identifier: GPL-3.0-or-later

/** Lightweight className joiner — avoids adding clsx dependency. */
export function cn(...classes: (string | undefined | null | false)[]): string {
  return classes.filter(Boolean).join(' ');
}
