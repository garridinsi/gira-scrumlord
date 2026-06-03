// SPDX-License-Identifier: GPL-3.0-or-later
// Accessibility: trap keyboard focus inside an open dialog. On open it moves focus into
// the container; Tab/Shift+Tab cycle within it (and any escaped focus is pulled back);
// Escape calls onClose; on close it restores focus to whatever was focused before. Attach
// the returned ref to the dialog element (give that element tabIndex={-1} as a fallback).
import { type RefObject, useEffect, useRef } from 'react';

const FOCUSABLE =
  'a[href], button:not([disabled]), textarea:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function useFocusTrap<T extends HTMLElement>(
  active: boolean,
  onClose?: () => void,
): RefObject<T> {
  const ref = useRef<T>(null);
  // Keep onClose current without making it an effect dependency (an inline onClose would
  // otherwise re-run the effect every render and steal focus back to the top each time).
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    const container = ref.current;
    if (!active || !container) return;
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const focusable = () => Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));

    // Move focus into the dialog (first focusable, else the container itself).
    (focusable()[0] ?? container).focus();

    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current?.();
        return;
      }
      if (e.key !== 'Tab') return;
      const items = focusable();
      if (items.length === 0) {
        e.preventDefault();
        container.focus();
        return;
      }
      const first = items[0]!;
      const last = items[items.length - 1]!;
      const activeEl = document.activeElement;
      if (e.shiftKey && activeEl === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && activeEl === last) {
        e.preventDefault();
        first.focus();
      } else if (!activeEl || !container.contains(activeEl)) {
        e.preventDefault();
        first.focus();
      }
    };

    container.addEventListener('keydown', onKeyDown);
    return () => {
      container.removeEventListener('keydown', onKeyDown);
      previouslyFocused?.focus?.();
    };
  }, [active]);

  return ref;
}
