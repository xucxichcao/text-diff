/**
 * JSON Diff Renderer
 * Renders the diff tree as an interactive, expandable tree view
 */

import { formatValue, getValueType } from './json-diff-engine.js';

/**
 * State for expand/collapse
 */
let expandedPaths = new Set();
let showOnlyChanges = false;

/**
 * Initialize renderer with default state
 */
export function initRenderer() {
  expandedPaths = new Set();
  showOnlyChanges = false;
}

/**
 * Toggle "show only changes" mode
 * @param {boolean} value 
 */
export function setShowOnlyChanges(value) {
  showOnlyChanges = value;
}

/**
 * Get current "show only changes" state
 * @returns {boolean}
 */
export function getShowOnlyChanges() {
  return showOnlyChanges;
}

/**
 * Toggle a path's expanded state
 * @param {string} path 
 */
export function togglePath(path) {
  if (expandedPaths.has(path)) {
    expandedPaths.delete(path);
  } else {
    expandedPaths.add(path);
  }
}

/**
 * Check if a path is expanded
 * @param {string} path 
 * @returns {boolean}
 */
export function isExpanded(path) {
  return expandedPaths.has(path);
}

/**
 * Expand all paths in the diff tree
 * @param {object} node - Diff tree node
 */
export function expandAll(node) {
  function traverse(n) {
    if (!n) return;
    if (n.path && n.children && n.children.length > 0) {
      expandedPaths.add(n.path || '$');
    }
    if (n.children) {
      n.children.forEach(traverse);
    }
  }
  expandedPaths.add('$'); // Root
  traverse(node);
}

/**
 * Collapse all paths
 */
export function collapseAll() {
  expandedPaths.clear();
}

/**
 * Expand only paths that contain changes
 * @param {object} node - Diff tree node
 */
export function expandChanges(node) {
  expandedPaths.clear();
  
  function traverse(n, ancestors = []) {
    if (!n) return false;
    
    let hasChanges = n.type !== 'unchanged';
    
    if (n.children) {
      for (const child of n.children) {
        if (traverse(child, [...ancestors, n.path || '$'])) {
          hasChanges = true;
        }
      }
    }
    
    if (hasChanges && n.children && n.children.length > 0) {
      expandedPaths.add(n.path || '$');
      ancestors.forEach(p => expandedPaths.add(p));
    }
    
    return hasChanges;
  }
  
  expandedPaths.add('$');
  traverse(node);
}

/**
 * Render a diff tree to HTML
 * @param {object} diffTree - The diff tree from compareJSON
 * @param {'left' | 'right'} side - Which side to render (original or modified)
 * @returns {string} - HTML string
 */
export function renderDiffTree(diffTree, side) {
  if (!diffTree) {
    return '<div class="json-tree-empty">No data</div>';
  }
  
  const html = renderNode(diffTree, side, 0, '$');
  return `<div class="json-tree">${html}</div>`;
}

/**
 * Render a single node
 * @param {object} node - Diff node
 * @param {'left' | 'right'} side - Which side
 * @param {number} depth - Current depth for indentation
 * @param {string} parentPath - Parent's path for expand/collapse
 * @returns {string}
 */
function renderNode(node, side, depth, parentPath) {
  if (!node) return '';
  
  const path = node.path || parentPath;
  const isRoot = path === '$' || path === '';
  const hasChildren = node.children && node.children.length > 0;
  const expanded = isExpanded(path) || isRoot;
  
  // Determine if this node should be shown in "show only changes" mode
  if (showOnlyChanges && node.type === 'unchanged' && !hasChangesInChildren(node)) {
    return '';
  }
  
  // Get the change type class
  const typeClass = getTypeClass(node, side);
  
  // For left side, show old value; for right side, show new value
  const value = side === 'left' ? node.oldValue : node.newValue;
  const valueType = getValueType(value);
  
  // Check if this node exists on this side
  const exists = value !== undefined;
  
  if (!exists && node.type !== 'unchanged') {
    // This side doesn't have the value, render a placeholder
    return renderPlaceholder(node, side, depth);
  }
  
  let html = '';
  
  if (hasChildren) {
    // Object or array with children
    html = renderContainerNode(node, side, depth, path, expanded, typeClass);
  } else {
    // Primitive value
    html = renderPrimitiveNode(node, side, depth, typeClass);
  }
  
  return html;
}

/**
 * Check if a node has changes in its children
 * @param {object} node 
 * @returns {boolean}
 */
function hasChangesInChildren(node) {
  if (!node.children) return false;
  return node.children.some(child => 
    child.type !== 'unchanged' || hasChangesInChildren(child)
  );
}

/**
 * Get CSS class for the change type
 * @param {object} node 
 * @param {'left' | 'right'} side 
 * @returns {string}
 */
function getTypeClass(node, side) {
  if (node.type === 'unchanged') return '';
  if (node.type === 'added') return 'json-added';
  if (node.type === 'removed') return 'json-removed';
  if (node.type === 'modified') return 'json-modified';
  return '';
}

/**
 * Render a placeholder for nodes that don't exist on this side
 * @param {object} node 
 * @param {'left' | 'right'} side 
 * @param {number} depth 
 * @returns {string}
 */
function renderPlaceholder(node, side, depth) {
  const indent = '  '.repeat(depth);
  const key = node.key !== undefined ? node.key : '';
  const keyDisplay = typeof key === 'number' ? `[${key}]` : `"${key}"`;
  
  // For added nodes on left side, or removed nodes on right side
  const isPlaceholder = (node.type === 'added' && side === 'left') || 
                         (node.type === 'removed' && side === 'right');
  
  if (!isPlaceholder) return '';
  
  // Count lines the other side would take
  const lineCount = countNodeLines(node);
  const lines = [];
  
  for (let i = 0; i < lineCount; i++) {
    lines.push(`<div class="json-line json-placeholder" style="padding-left: ${depth * 16}px">
      <span class="json-placeholder-content"></span>
    </div>`);
  }
  
  return lines.join('');
}

/**
 * Count how many lines a node would take when rendered
 * @param {object} node 
 * @returns {number}
 */
function countNodeLines(node) {
  if (!node.children || node.children.length === 0) {
    return 1;
  }
  
  const expanded = isExpanded(node.path || '$');
  if (!expanded) return 1;
  
  let count = 2; // Opening and closing braces
  for (const child of node.children) {
    count += countNodeLines(child);
  }
  return count;
}

/**
 * Render a container node (object or array)
 * @param {object} node 
 * @param {'left' | 'right'} side 
 * @param {number} depth 
 * @param {string} path 
 * @param {boolean} expanded 
 * @param {string} typeClass 
 * @returns {string}
 */
function renderContainerNode(node, side, depth, path, expanded, typeClass) {
  const value = side === 'left' ? node.oldValue : node.newValue;
  const isArray = Array.isArray(value);
  const openBrace = isArray ? '[' : '{';
  const closeBrace = isArray ? ']' : '}';
  const key = node.key !== undefined ? node.key : '';
  const hasKey = key !== '' && key !== undefined;
  const keyDisplay = typeof key === 'number' ? '' : `"${escapeHtml(String(key))}": `;
  
  const toggleIcon = expanded ? 'json-collapse' : 'json-expand';
  const childCount = node.children ? node.children.length : 0;
  const preview = expanded ? '' : ` <span class="json-preview">${childCount} ${isArray ? 'items' : 'keys'}</span>`;
  
  let html = `<div class="json-line json-container ${typeClass}" data-path="${escapeHtml(path)}" style="padding-left: ${depth * 16}px">
    <span class="json-toggle ${toggleIcon}" data-path="${escapeHtml(path)}"></span>
    ${hasKey ? `<span class="json-key">${keyDisplay}</span>` : ''}
    <span class="json-bracket">${openBrace}</span>${preview}
  </div>`;
  
  if (expanded && node.children) {
    // Render children
    const childrenHtml = node.children.map(child => 
      renderNode(child, side, depth + 1, path)
    ).filter(h => h).join('');
    
    html += childrenHtml;
    
    // Closing brace
    html += `<div class="json-line json-container-close ${typeClass}" style="padding-left: ${depth * 16}px">
      <span class="json-bracket">${closeBrace}</span>
    </div>`;
  } else if (!expanded) {
    // Collapsed - show closing brace on same line concept (handled by preview)
  }
  
  return html;
}

/**
 * Render a primitive value node
 * @param {object} node 
 * @param {'left' | 'right'} side 
 * @param {number} depth 
 * @param {string} typeClass 
 * @returns {string}
 */
function renderPrimitiveNode(node, side, depth, typeClass) {
  const value = side === 'left' ? node.oldValue : node.newValue;
  const key = node.key !== undefined ? node.key : '';
  const hasKey = key !== '' && key !== undefined;
  const keyDisplay = typeof key === 'number' ? '' : `"${escapeHtml(String(key))}": `;
  const path = node.path || '';
  
  // Format the value with proper type styling
  const { valueHtml, valueClass } = formatValueHtml(value);
  
  // Add inline diff highlighting for modified values
  let displayValue = valueHtml;
  if (node.type === 'modified' && node.oldValue !== undefined && node.newValue !== undefined) {
    const oldStr = JSON.stringify(node.oldValue);
    const newStr = JSON.stringify(node.newValue);
    if (side === 'left') {
      displayValue = `<span class="json-value-removed">${formatValueHtml(node.oldValue).valueHtml}</span>`;
    } else {
      displayValue = `<span class="json-value-added">${formatValueHtml(node.newValue).valueHtml}</span>`;
    }
  }
  
  return `<div class="json-line json-primitive ${typeClass}" data-path="${escapeHtml(path)}" title="${escapeHtml(path)}" style="padding-left: ${depth * 16}px">
    <span class="json-toggle-placeholder"></span>
    ${hasKey ? `<span class="json-key">${keyDisplay}</span>` : ''}
    <span class="json-value ${valueClass}">${displayValue}</span>
  </div>`;
}

/**
 * Format a value to HTML with proper type styling
 * @param {any} value 
 * @returns {{valueHtml: string, valueClass: string}}
 */
function formatValueHtml(value) {
  if (value === null) {
    return { valueHtml: 'null', valueClass: 'json-null' };
  }
  if (value === undefined) {
    return { valueHtml: 'undefined', valueClass: 'json-undefined' };
  }
  if (typeof value === 'boolean') {
    return { valueHtml: String(value), valueClass: 'json-boolean' };
  }
  if (typeof value === 'number') {
    return { valueHtml: String(value), valueClass: 'json-number' };
  }
  if (typeof value === 'string') {
    const escaped = escapeHtml(value);
    const truncated = escaped.length > 100 ? escaped.substring(0, 100) + '...' : escaped;
    return { valueHtml: `"${truncated}"`, valueClass: 'json-string' };
  }
  if (Array.isArray(value)) {
    return { valueHtml: `Array(${value.length})`, valueClass: 'json-array' };
  }
  if (typeof value === 'object') {
    return { valueHtml: `Object(${Object.keys(value).length})`, valueClass: 'json-object' };
  }
  return { valueHtml: String(value), valueClass: '' };
}

/**
 * Escape HTML special characters
 * @param {string} str 
 * @returns {string}
 */
function escapeHtml(str) {
  if (typeof str !== 'string') return String(str);
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Render both sides of the JSON diff
 * @param {object} diffTree - The diff tree from compareJSON
 * @returns {{leftHtml: string, rightHtml: string}}
 */
export function renderBothSides(diffTree) {
  return {
    leftHtml: renderDiffTree(diffTree, 'left'),
    rightHtml: renderDiffTree(diffTree, 'right')
  };
}

/**
 * Get statistics about the diff
 * @param {object} diffTree 
 * @returns {{added: number, removed: number, modified: number, unchanged: number}}
 */
export function getDiffStats(diffTree) {
  const stats = { added: 0, removed: 0, modified: 0, unchanged: 0 };
  
  function traverse(node) {
    if (!node) return;
    
    // Only count leaf nodes (primitives)
    if (!node.children || node.children.length === 0) {
      if (node.type === 'added') stats.added++;
      else if (node.type === 'removed') stats.removed++;
      else if (node.type === 'modified') stats.modified++;
      else stats.unchanged++;
    }
    
    if (node.children) {
      node.children.forEach(traverse);
    }
  }
  
  traverse(diffTree);
  return stats;
}

/**
 * Handle click events on the JSON tree (for expand/collapse)
 * @param {Event} event 
 * @param {Function} onToggle - Callback when a node is toggled
 */
export function handleTreeClick(event, onToggle) {
  const toggle = event.target.closest('.json-toggle');
  if (toggle) {
    const path = toggle.dataset.path;
    if (path) {
      togglePath(path);
      if (onToggle) onToggle(path);
    }
  }
}
