import { onMounted, onUnmounted } from "vue";

// Every dropdown/menu/popover in this app (chart "⋮" menus, the account
// menu, table export menus, the date-range calendar, the users toolbar)
// closes itself the same way: a `data-*` attribute marks its own trigger +
// panel, and a click anywhere outside that marker closes it. That pattern
// used to be hand-copied into each component; this is the one place it's
// written now.
//
// `selector` — a CSS selector matching everything that should count as
// "inside" (usually a single `[data-x-menu]` attribute shared by the
// trigger button and its panel).
// `onOutsideClick` — called with the triggering event when a click lands
// outside `selector`. Typically `() => (open.value = false)`.
// `{ closeOnScroll }` — also close on any scroll (capture phase), for
// panels that are position-anchored to their trigger (e.g. a fixed-position
// dropdown computed from getBoundingClientRect()) and would otherwise drift
// away from the button that opened them.
export function useClickOutside(selector, onOutsideClick, { closeOnScroll = false } = {}) {
  const handleClick = (e) => {
    if (!e.target.closest(selector)) onOutsideClick(e);
  };

  onMounted(() => {
    window.addEventListener("click", handleClick);
    if (closeOnScroll) window.addEventListener("scroll", onOutsideClick, true);
  });
  onUnmounted(() => {
    window.removeEventListener("click", handleClick);
    if (closeOnScroll) window.removeEventListener("scroll", onOutsideClick, true);
  });
}
