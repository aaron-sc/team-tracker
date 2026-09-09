/** True when a keydown's target is somewhere the keystroke should be treated as ordinary typing
 *  (a text field, textarea, or contenteditable) rather than a global shortcut. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  const tag = target.tagName;
  return tag === "INPUT" || tag === "TEXTAREA" || target.isContentEditable;
}
