import { useEffect, useEffectEvent, type RefObject } from 'react';

/**
 * Drill shortcuts, and the rules for when they are allowed to fire (J25).
 *
 * A window-level keydown listener sees every key on the page, so it must
 * decline far more than it accepts:
 * - modified keys (Ctrl/Cmd/Alt + digit switches browser tabs), autorepeat
 *   (a held Enter must not skip the explanation), and keys another handler
 *   already claimed;
 * - keys aimed at anything outside the question card (the nav, the learner
 *   picker, the theme toggle) — only the card and the bare page count;
 * - Enter on links, buttons and selects, whose native activation wins, and
 *   Enter in a text field, which the card's `<form>` submits natively;
 * - digits while typing, and digits on question types without choices.
 */

export interface DrillKeyHandlers {
  /** Submit, or advance once answered. */
  onEnter: () => void;
  /** Pick choice `index` (0-based); only for choice types. */
  onDigit?: (index: number) => void;
  /** `0`: give up and show the answer. */
  onGiveUp?: () => void;
  /** How many digits map to choices (0 for short/order). */
  digitCount: number;
  answered: boolean;
}

function isTextField(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement) return el.type !== 'radio' && el.type !== 'checkbox';
  return el instanceof HTMLElement && el.isContentEditable;
}

export function shouldIgnore(event: KeyboardEvent, card: HTMLElement | null): boolean {
  if (event.defaultPrevented || event.repeat || event.ctrlKey || event.metaKey || event.altKey) {
    return true;
  }
  const target = event.target instanceof Element ? event.target : null;
  const onPage = target === null || target === document.body || target === document.documentElement;
  return !onPage && !(card && target && card.contains(target));
}

export function useDrillHotkeys(cardRef: RefObject<HTMLElement | null>, handlers: DrillKeyHandlers) {
  const onKey = useEffectEvent((event: KeyboardEvent) => {
    if (shouldIgnore(event, cardRef.current)) return;
    const target = event.target instanceof Element ? event.target : null;

    if (event.key === 'Enter') {
      if (target?.closest('a, button, select, summary')) return; // native activation wins
      if (isTextField(target)) return; // the form submits on its own
      event.preventDefault();
      handlers.onEnter();
      return;
    }

    if (handlers.answered || isTextField(target)) return;

    if (event.key === '0' && handlers.onGiveUp) {
      event.preventDefault();
      handlers.onGiveUp();
      return;
    }

    if (!handlers.onDigit || !/^[1-9]$/.test(event.key)) return;
    const digit = Number(event.key);
    if (digit > handlers.digitCount) return;
    event.preventDefault();
    handlers.onDigit(digit - 1);
  });

  useEffect(() => {
    const listener = (event: KeyboardEvent) => onKey(event);
    window.addEventListener('keydown', listener);
    return () => window.removeEventListener('keydown', listener);
  }, []);
}
