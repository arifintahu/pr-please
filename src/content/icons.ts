const SVG_NS = 'http://www.w3.org/2000/svg';

export function createSvgIcon(pathData: string, transform?: string): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  const path = document.createElementNS(SVG_NS, 'path');
  path.setAttribute('d', pathData);
  if (transform) path.setAttribute('transform', transform);
  svg.appendChild(path);
  return svg;
}

export function createSpinnerIcon(): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, 'svg');
  svg.setAttribute('viewBox', '0 0 16 16');
  const circle = document.createElementNS(SVG_NS, 'circle');
  circle.setAttribute('cx', '8');
  circle.setAttribute('cy', '8');
  circle.setAttribute('r', '6');
  circle.setAttribute('fill', 'none');
  circle.setAttribute('stroke', 'currentColor');
  circle.setAttribute('stroke-width', '2');
  circle.setAttribute('stroke-dasharray', '20 12');
  svg.appendChild(circle);
  return svg;
}

const ICON_PATHS = {
  sparkle:
    'M7.53 1.282a.5.5 0 01.94 0l.478 1.306a7.492 7.492 0 004.464 4.464l1.305.478a.5.5 0 010 .94l-1.305.478a7.492 7.492 0 00-4.464 4.464l-.478 1.305a.5.5 0 01-.94 0l-.478-1.305a7.492 7.492 0 00-4.464-4.464L1.282 8.47a.5.5 0 010-.94l1.306-.478a7.492 7.492 0 004.464-4.464L7.53 1.282z',
  gear: 'M8 0a8.2 8.2 0 01.701.031C9.444.095 9.99.645 10.16 1.29l.035.133.038.146c.07.3.192.578.352.827a1.5 1.5 0 001.323.753c.257 0 .515-.072.745-.2l.13-.073.134-.079c.572-.348 1.29-.295 1.808.137a8.076 8.076 0 011.416 1.42c.425.515.477 1.225.137 1.795l-.082.14-.076.131a1.5 1.5 0 00.554 2.07c.249.16.527.282.827.352l.146.038.133.035c.646.17 1.196.716 1.26 1.459a8.2 8.2 0 010 1.402c-.064.743-.614 1.289-1.26 1.459l-.133.035-.146.038a2.88 2.88 0 00-.827.352 1.5 1.5 0 00-.554 2.07l.076.131.082.14c.34.57.288 1.28-.137 1.795a8.076 8.076 0 01-1.416 1.42c-.518.432-1.236.485-1.808.137l-.134-.079-.13-.073a1.5 1.5 0 00-2.068.553c-.16.25-.282.528-.352.828l-.038.146-.035.133c-.17.645-.716 1.195-1.459 1.259a8.2 8.2 0 01-1.402 0c-.743-.064-1.289-.614-1.459-1.26l-.035-.132-.038-.146a2.88 2.88 0 00-.352-.828 1.5 1.5 0 00-2.068-.553l-.13.073-.134.079c-.572.348-1.29.295-1.808-.137a8.076 8.076 0 01-1.416-1.42c-.425-.515-.477-1.225-.137-1.795l.082-.14.076-.131a1.5 1.5 0 00-.554-2.07 2.88 2.88 0 00-.827-.352l-.146-.038-.133-.035C.645 9.444.095 8.898.031 8.155a8.2 8.2 0 010-1.402C.095 6.01.645 5.464 1.29 5.294l.133-.035.146-.038c.3-.07.578-.192.827-.352a1.5 1.5 0 00.554-2.07l-.076-.131-.082-.14c-.34-.57-.288-1.28.137-1.795A8.076 8.076 0 014.346.333c.518-.432 1.236-.485 1.808-.137l.134.079.13.073a1.5 1.5 0 002.068-.553c.16-.25.282-.528.352-.828l.038-.146.035-.133C9.081.143 9.627-.407 10.37-.469zM8 5.5a2.5 2.5 0 100 5 2.5 2.5 0 000-5z',
  success:
    'M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z',
  error:
    'M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z',
  close:
    'M3.72 3.72a.75.75 0 011.06 0L8 6.94l3.22-3.22a.75.75 0 111.06 1.06L9.06 8l3.22 3.22a.75.75 0 11-1.06 1.06L8 9.06l-3.22 3.22a.75.75 0 01-1.06-1.06L6.94 8 3.72 4.78a.75.75 0 010-1.06z',
};

const ICON_TRANSFORMS: Record<string, string> = {
  gear: 'scale(0.72) translate(3,3)',
};

export function icon(name: keyof typeof ICON_PATHS): SVGSVGElement {
  return createSvgIcon(ICON_PATHS[name], ICON_TRANSFORMS[name]);
}
