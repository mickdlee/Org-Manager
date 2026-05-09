import type { DeliveryUnit, ReleaseTrain, Squad, AppData } from '../types';

interface SvgNode {
  x: number;
  y: number;
  width: number;
  height: number;
  title: string;
  subtitle?: string;
  type: 'du' | 'rt' | 'squad' | 'person';
  children?: SvgNode[];
}

const COLORS = {
  du: '#3B82F6',
  rt: '#8B5CF6',
  squad: '#EC4899',
  person: '#F59E0B',
};

const PADDING = 10;
const ROW_GAP = 50;
const COL_GAP = 30;
const SQUAD_MEMBER_GAP = 12;
const NODE_WIDTH = 180;
const NODE_HEIGHT = 70;
const PERSON_CARD_WIDTH = 130;
const PERSON_CARD_HEIGHT = 50;

/**
 * Generate SVG for a Delivery Unit with all Release Trains and Squads
 */
export function generateDUSvg(
  du: DeliveryUnit,
  data: AppData
): string {
  const svg = new SvgBuilder();
  const tree = buildDuTree(du, data);
  drawNode(svg, tree, data);
  return svg.toString();
}

/**
 * Generate SVG for a Release Train with all Squads
 */
export function generateRTSvg(
  _du: DeliveryUnit,
  rt: ReleaseTrain,
  data: AppData
): string {
  const svg = new SvgBuilder();
  const tree = buildRtTree(rt, data);
  drawNode(svg, tree, data);
  return svg.toString();
}

/**
 * Generate SVG for a Squad with all members
 */
export function generateSquadSvg(
  squad: Squad,
  data: AppData
): string {
  const svg = new SvgBuilder();
  const tree = buildSquadTree(squad, data);
  drawNode(svg, tree, data);
  return svg.toString();
}

/**
 * Download SVG as a file
 */
export function downloadSvg(svgContent: string, filename: string): void {
  const blob = new Blob([svgContent], { type: 'image/svg+xml' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.svg`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

// ── Helpers ──────────────────────────────────────────────────────────────────

function wrapText(text: string, maxChars: number): string[] {
  const words = text.split(' ');
  const lines: string[] = [];
  let currentLine = '';

  for (const word of words) {
    if ((currentLine + word).length > maxChars) {
      if (currentLine) lines.push(currentLine.trim());
      currentLine = word;
    } else {
      currentLine += (currentLine ? ' ' : '') + word;
    }
  }
  if (currentLine) lines.push(currentLine.trim());
  return lines.slice(0, 2); // Max 2 lines
}

function buildDuTree(du: DeliveryUnit, data: AppData): SvgNode {
  const duNode: SvgNode = {
    x: 0,
    y: 0,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    title: du.name,
    subtitle: du.type,
    type: 'du',
    children: du.releaseTrains.map((rt) => buildRtTree(rt, data)),
  };

  return duNode;
}

function buildRtTree(rt: ReleaseTrain, data: AppData): SvgNode {
  const rtNode: SvgNode = {
    x: 0,
    y: 0,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    title: rt.name,
    type: 'rt',
    children: rt.squads.map((sq) => buildSquadTree(sq, data)),
  };

  return rtNode;
}

function buildSquadTree(squad: Squad, data: AppData): SvgNode {
  const squadNode: SvgNode = {
    x: 0,
    y: 0,
    width: NODE_WIDTH,
    height: NODE_HEIGHT,
    title: squad.name,
    type: 'squad',
    children: squad.assignments.map((assignment) => {
      const person = data.people.find((p) => p.id === assignment.personId);
      return {
        x: 0,
        y: 0,
        width: PERSON_CARD_WIDTH,
        height: PERSON_CARD_HEIGHT,
        title: person?.name ?? 'Unknown',
        subtitle: assignment.role,
        type: 'person',
      };
    }),
  };

  return squadNode;
}

function calculateTreeSize(
  node: SvgNode
): { width: number; height: number } {
  if (!node.children || node.children.length === 0) {
    return {
      width: node.width,
      height: node.height,
    };
  }

  // For squad nodes, stack children vertically
  if (node.type === 'squad') {
    const childSizes = node.children.map((child) => calculateTreeSize(child));
    const maxChildWidth = Math.max(...childSizes.map((s) => s.width));
    const totalChildHeight = childSizes.reduce((sum, s) => sum + s.height, 0);
    const childrenHeight = totalChildHeight + (node.children.length - 1) * SQUAD_MEMBER_GAP;

    return {
      width: Math.max(node.width, maxChildWidth),
      height: node.height + ROW_GAP + childrenHeight,
    };
  }

  // For non-squad nodes, arrange children horizontally
  const childSizes = node.children.map((child) => calculateTreeSize(child));
  const totalChildWidth = childSizes.reduce((sum, s) => sum + s.width, 0);
  const maxChildHeight = Math.max(...childSizes.map((s) => s.height));
  const childrenWidth = totalChildWidth + (node.children.length - 1) * COL_GAP;

  return {
    width: Math.max(node.width, childrenWidth),
    height: node.height + ROW_GAP + maxChildHeight,
  };
}

function layoutTree(node: SvgNode, x: number, y: number): void {
  const treeSize = calculateTreeSize(node);
  node.x = x + (treeSize.width - node.width) / 2;
  node.y = y;

  if (!node.children || node.children.length === 0) {
    return;
  }

  // For squad nodes, stack children vertically
  if (node.type === 'squad') {
    const childSizes = node.children.map((child) => calculateTreeSize(child));

    let currentY = y + node.height + ROW_GAP;

    for (let i = 0; i < node.children.length; i++) {
      const child = node.children[i];
      const childX = x + (treeSize.width - childSizes[i].width) / 2;
      layoutTree(child, childX, currentY);
      currentY += childSizes[i].height + SQUAD_MEMBER_GAP;
    }
    return;
  }

  // For non-squad nodes, arrange children horizontally
  const childSizes = node.children.map((child) => calculateTreeSize(child));
  const totalChildWidth = childSizes.reduce((sum, s) => sum + s.width, 0);
  const childrenWidth = totalChildWidth + (node.children.length - 1) * COL_GAP;

  let currentX = x + (treeSize.width - childrenWidth) / 2;

  for (let i = 0; i < node.children.length; i++) {
    const child = node.children[i];
    const childY = y + node.height + ROW_GAP;
    layoutTree(child, currentX, childY);
    currentX += childSizes[i].width + COL_GAP;
  }
}

function getTreeBounds(node: SvgNode): { minX: number; minY: number; maxX: number; maxY: number } {
  let minX = node.x;
  let minY = node.y;
  let maxX = node.x + node.width;
  let maxY = node.y + node.height;

  if (node.children) {
    for (const child of node.children) {
      const bounds = getTreeBounds(child);
      minX = Math.min(minX, bounds.minX);
      minY = Math.min(minY, bounds.minY);
      maxX = Math.max(maxX, bounds.maxX);
      maxY = Math.max(maxY, bounds.maxY);
    }
  }

  return { minX, minY, maxX, maxY };
}

function shiftTree(node: SvgNode, offsetX: number, offsetY: number): void {
  node.x += offsetX;
  node.y += offsetY;
  if (node.children) {
    for (const child of node.children) {
      shiftTree(child, offsetX, offsetY);
    }
  }
}

function drawNode(svg: SvgBuilder, node: SvgNode, _data: AppData): void {
  layoutTree(node, 0, 0);
  
  // Calculate bounds and adjust if needed
  const bounds = getTreeBounds(node);
  const offsetX = PADDING - bounds.minX;
  const offsetY = PADDING - bounds.minY;
  
  if (offsetX !== 0 || offsetY !== 0) {
    shiftTree(node, offsetX, offsetY);
  }
  
  // Recalculate bounds after shift
  const finalBounds = getTreeBounds(node);
  const width = finalBounds.maxX + PADDING;
  const height = finalBounds.maxY + PADDING;

  svg.start(width, height);
  svg.addStyle();
  drawNodeRecursive(svg, node);
  svg.end();
}

function drawNodeRecursive(svg: SvgBuilder, node: SvgNode): void {
  const color = COLORS[node.type];

  // Draw connections to children
  if (node.children && node.children.length > 0) {
    for (const child of node.children) {
      const fromX = node.x + node.width / 2;
      const fromY = node.y + node.height;
      const toX = child.x + child.width / 2;
      const toY = child.y;

      // Draw angled path (vertical, horizontal, vertical)
      svg.addAnglePath(fromX, fromY, toX, toY, '#999', 2);
    }
  }

  // Draw node
  svg.addRect(node.x, node.y, node.width, node.height, color);
  
  const isSmallCard = node.type === 'person';
  const titleY = node.y + (isSmallCard ? 18 : 25);
  const subtitleY = node.y + (isSmallCard ? 38 : 50);
  
  // Wrap text based on node type
  const maxTitleChars = isSmallCard ? 14 : 18;
  
  svg.addText(node.x + node.width / 2, titleY, node.title, {
    fontSize: isSmallCard ? 10 : 12,
    fontWeight: 'bold',
    fill: 'white',
    textAnchor: 'middle',
    maxChars: maxTitleChars,
  });

  if (node.subtitle) {
    const maxSubChars = isSmallCard ? 16 : 20;
    svg.addText(node.x + node.width / 2, subtitleY, node.subtitle, {
      fontSize: isSmallCard ? 8 : 9,
      fill: 'rgba(255, 255, 255, 0.9)',
      textAnchor: 'middle',
      maxChars: maxSubChars,
    });
  }

  // Draw children
  if (node.children) {
    for (const child of node.children) {
      drawNodeRecursive(svg, child);
    }
  }
}

// ── SVG Builder ──────────────────────────────────────────────────────────────

class SvgBuilder {
  private content: string[] = [];

  start(width: number, height: number): void {
    this.content.push(
      `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">`
    );
  }

  addStyle(): void {
    this.content.push(
      '<defs>' +
        '<clipPath id="clipTitle"><rect width="140" height="20" /></clipPath>' +
        '<clipPath id="clipSubtitle"><rect width="140" height="18" /></clipPath>' +
        '<clipPath id="clipPerson"><rect width="100" height="30" /></clipPath>' +
        '</defs>'
    );
    this.content.push(
      '<style>' +
        'text { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif; overflow: hidden; }' +
        'rect { rx: 8; }' +
        '</style>'
    );
  }

  addRect(
    x: number,
    y: number,
    width: number,
    height: number,
    fill: string,
    stroke = '#fff',
    strokeWidth = 2
  ): void {
    this.content.push(
      `<rect x="${x}" y="${y}" width="${width}" height="${height}" fill="${fill}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`
    );
  }

  addLine(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    stroke = '#000',
    strokeWidth = 1
  ): void {
    this.content.push(
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${stroke}" stroke-width="${strokeWidth}"/>`
    );
  }

  addText(
    x: number,
    y: number,
    text: string,
    options: {
      fontSize?: number;
      fontWeight?: string;
      fill?: string;
      textAnchor?: string;
      maxChars?: number;
    } = {}
  ): void {
    const {
      fontSize = 12,
      fontWeight = 'normal',
      fill = '#000',
      textAnchor = 'start',
      maxChars = 20,
    } = options;

    const lines = maxChars ? wrapText(text, maxChars) : [text];
    const lineHeight = fontSize ? fontSize * 1.2 : 12;
    const startY = y - (lines.length - 1) * (lineHeight / 2);

    const attr = [
      `x="${x}"`,
      `font-size="${fontSize}"`,
      `font-weight="${fontWeight}"`,
      `fill="${fill}"`,
      `text-anchor="${textAnchor}"`,
    ].join(' ');

    let svg = `<text ${attr}>`;
    for (let i = 0; i < lines.length; i++) {
      const tspanY = startY + i * lineHeight;
      svg += `<tspan x="${x}" y="${tspanY}">${this.escapeHtml(lines[i])}</tspan>`;
    }
    svg += `</text>`;
    this.content.push(svg);
  }

  addAnglePath(
    x1: number,
    y1: number,
    x2: number,
    y2: number,
    stroke = '#999',
    strokeWidth = 2
  ): void {
    const midY = (y1 + y2) / 2;
    this.content.push(
      `<path d="M ${x1} ${y1} L ${x1} ${midY} L ${x2} ${midY} L ${x2} ${y2}" fill="none" stroke="${stroke}" stroke-width="${strokeWidth}"/>`
    );
  }

  end(): void {
    this.content.push('</svg>');
  }

  toString(): string {
    return this.content.join('\n');
  }

  private escapeHtml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}
