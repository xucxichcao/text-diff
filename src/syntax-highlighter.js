/**
 * CSS Syntax Highlighter
 * Provides syntax highlighting for CSS code
 */

// Token types
const TOKEN_TYPES = {
  COMMENT: 'comment',
  SELECTOR: 'selector',
  PROPERTY: 'property',
  VALUE: 'value',
  STRING: 'string',
  NUMBER: 'number',
  UNIT: 'unit',
  BRACKET: 'bracket',
  IMPORTANT: 'important',
  FUNCTION: 'function',
  OPERATOR: 'operator'
};

// CSS units
const CSS_UNITS = [
  'px', 'em', 'rem', '%', 'vh', 'vw', 'vmin', 'vmax',
  'ch', 'ex', 'cm', 'mm', 'in', 'pt', 'pc',
  'deg', 'rad', 'grad', 'turn',
  's', 'ms', 'Hz', 'kHz', 'dpi', 'dpcm', 'dppx', 'fr'
];

// CSS functions
const CSS_FUNCTIONS = [
  'rgb', 'rgba', 'hsl', 'hsla', 'url', 'calc', 'var',
  'linear-gradient', 'radial-gradient', 'conic-gradient',
  'min', 'max', 'clamp', 'attr', 'counter', 'counters',
  'env', 'fit-content', 'minmax', 'repeat', 'translate',
  'translateX', 'translateY', 'translateZ', 'translate3d',
  'rotate', 'rotateX', 'rotateY', 'rotateZ', 'rotate3d',
  'scale', 'scaleX', 'scaleY', 'scaleZ', 'scale3d',
  'skew', 'skewX', 'skewY', 'matrix', 'matrix3d',
  'perspective', 'blur', 'brightness', 'contrast',
  'drop-shadow', 'grayscale', 'hue-rotate', 'invert',
  'opacity', 'saturate', 'sepia', 'cubic-bezier', 'steps'
];

/**
 * Escape HTML special characters
 * @param {string} str - Input string
 * @returns {string} - Escaped string
 */
function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Create a span with syntax class
 * @param {string} content - Text content
 * @param {string} type - Token type
 * @returns {string} - HTML span element
 */
function createSpan(content, type) {
  if (!content) return '';
  const escaped = escapeHtml(content);
  if (!type) return escaped;
  return `<span class="syntax-${type}">${escaped}</span>`;
}

/**
 * Highlight CSS line
 * @param {string} line - CSS line to highlight
 * @returns {string} - Highlighted HTML
 */
export function highlightLine(line) {
  if (!line) return '';
  
  let result = '';
  let remaining = line;
  
  // Check for comment
  const commentMatch = remaining.match(/\/\*[\s\S]*?\*\/|\/\*.*/);
  if (commentMatch) {
    const before = remaining.slice(0, commentMatch.index);
    const comment = commentMatch[0];
    const after = remaining.slice(commentMatch.index + comment.length);
    
    if (before) result += highlightLine(before);
    result += createSpan(comment, TOKEN_TYPES.COMMENT);
    if (after) result += highlightLine(after);
    return result;
  }
  
  // Check for selector line (contains { but not : before it)
  const selectorMatch = remaining.match(/^([^{:]+)(\{)/);
  if (selectorMatch) {
    result += createSpan(selectorMatch[1], TOKEN_TYPES.SELECTOR);
    result += createSpan(selectorMatch[2], TOKEN_TYPES.BRACKET);
    remaining = remaining.slice(selectorMatch[0].length);
    if (remaining) result += highlightLine(remaining);
    return result;
  }
  
  // Check for closing bracket
  if (remaining.trim() === '}') {
    return createSpan(remaining, TOKEN_TYPES.BRACKET);
  }
  
  // Check for property: value line
  const propMatch = remaining.match(/^(\s*)([a-zA-Z-]+)(\s*:\s*)/);
  if (propMatch) {
    result += escapeHtml(propMatch[1]); // Preserve leading whitespace
    result += createSpan(propMatch[2], TOKEN_TYPES.PROPERTY);
    result += createSpan(propMatch[3], TOKEN_TYPES.OPERATOR);
    remaining = remaining.slice(propMatch[0].length);
    
    // Highlight the value part
    result += highlightValue(remaining);
    return result;
  }
  
  // Default: just escape
  return escapeHtml(line);
}

/**
 * Highlight CSS value
 * @param {string} value - CSS value string
 * @returns {string} - Highlighted HTML
 */
function highlightValue(value) {
  let result = '';
  let pos = 0;
  
  while (pos < value.length) {
    const remaining = value.slice(pos);
    
    // Check for !important
    const importantMatch = remaining.match(/^!important/i);
    if (importantMatch) {
      result += createSpan(importantMatch[0], TOKEN_TYPES.IMPORTANT);
      pos += importantMatch[0].length;
      continue;
    }
    
    // Check for string (quoted)
    const stringMatch = remaining.match(/^(['"])(?:(?!\1)[^\\]|\\.)*\1/);
    if (stringMatch) {
      result += createSpan(stringMatch[0], TOKEN_TYPES.STRING);
      pos += stringMatch[0].length;
      continue;
    }
    
    // Check for function
    const funcMatch = remaining.match(/^([a-zA-Z-]+)(\()/);
    if (funcMatch && CSS_FUNCTIONS.includes(funcMatch[1].toLowerCase())) {
      result += createSpan(funcMatch[1], TOKEN_TYPES.FUNCTION);
      result += createSpan(funcMatch[2], TOKEN_TYPES.BRACKET);
      pos += funcMatch[0].length;
      continue;
    }
    
    // Check for number with unit
    const numUnitMatch = remaining.match(/^(-?\d*\.?\d+)(px|em|rem|%|vh|vw|vmin|vmax|ch|ex|cm|mm|in|pt|pc|deg|rad|grad|turn|s|ms|Hz|kHz|dpi|dpcm|dppx|fr)?/i);
    if (numUnitMatch && numUnitMatch[0]) {
      result += createSpan(numUnitMatch[1], TOKEN_TYPES.NUMBER);
      if (numUnitMatch[2]) {
        result += createSpan(numUnitMatch[2], TOKEN_TYPES.UNIT);
      }
      pos += numUnitMatch[0].length;
      continue;
    }
    
    // Check for hex color
    const hexMatch = remaining.match(/^#[0-9a-fA-F]{3,8}/);
    if (hexMatch) {
      result += createSpan(hexMatch[0], TOKEN_TYPES.VALUE);
      pos += hexMatch[0].length;
      continue;
    }
    
    // Check for brackets
    if ('(){}[]'.includes(remaining[0])) {
      result += createSpan(remaining[0], TOKEN_TYPES.BRACKET);
      pos++;
      continue;
    }
    
    // Check for semicolon
    if (remaining[0] === ';') {
      result += createSpan(';', TOKEN_TYPES.OPERATOR);
      pos++;
      continue;
    }
    
    // Check for comma
    if (remaining[0] === ',') {
      result += createSpan(',', TOKEN_TYPES.OPERATOR);
      pos++;
      continue;
    }
    
    // Check for color keyword or other value
    const wordMatch = remaining.match(/^[a-zA-Z-]+/);
    if (wordMatch) {
      result += createSpan(wordMatch[0], TOKEN_TYPES.VALUE);
      pos += wordMatch[0].length;
      continue;
    }
    
    // Default: pass through
    result += escapeHtml(remaining[0]);
    pos++;
  }
  
  return result;
}

/**
 * Highlight entire CSS content
 * @param {string} css - CSS content
 * @returns {string} - Highlighted HTML
 */
export function highlightCSS(css) {
  return css.split('\n').map(highlightLine).join('\n');
}
