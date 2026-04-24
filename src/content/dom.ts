export function el<K extends keyof HTMLElementTagNameMap>(
  tag: K,
  attrs?: Record<string, string>,
  children?: (Node | string)[]
): HTMLElementTagNameMap[K] {
  const elem = document.createElement(tag);
  if (attrs) {
    for (const [k, v] of Object.entries(attrs)) {
      elem.setAttribute(k, v);
    }
  }
  if (children) {
    for (const child of children) {
      if (typeof child === 'string') {
        elem.appendChild(document.createTextNode(child));
      } else {
        elem.appendChild(child);
      }
    }
  }
  return elem;
}
