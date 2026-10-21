/** Snapshot source geometry before a lightbox moves outside its theme scope. */
export function getMenuImageRadius(trigger: HTMLElement): string {
  const corners = (element: Element) => {
    const style = getComputedStyle(element);
    return [style.borderTopLeftRadius, style.borderTopRightRadius, style.borderBottomRightRadius, style.borderBottomLeftRadius];
  };
  const frame = corners(trigger);
  const image = trigger.querySelector("img");
  return (frame.some(value => Number.parseFloat(value) > 0) || !image ? frame : corners(image)).join(" ");
}
