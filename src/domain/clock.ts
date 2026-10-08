/**
 * The single source of "now" for UI code. Event handlers and effects call clock.now();
 * tests can replace it. (Keeps impure Date.now() calls out of React render paths.)
 */
export const clock = {
  now: (): number => Date.now(),
};
