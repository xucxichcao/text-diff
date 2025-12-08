/**
 * CSS Diff Engine
 * Computes differences between two CSS strings
 */

/**
 * Compute the Longest Common Subsequence (LCS) of two arrays
 * @param {string[]} a - First array of lines
 * @param {string[]} b - Second array of lines
 * @returns {number[][]} - LCS matrix
 */
function computeLCS(a, b) {
  const m = a.length;
  const n = b.length;
  const dp = Array(m + 1).fill(null).map(() => Array(n + 1).fill(0));
  
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      if (a[i - 1] === b[j - 1]) {
        dp[i][j] = dp[i - 1][j - 1] + 1;
      } else {
        dp[i][j] = Math.max(dp[i - 1][j], dp[i][j - 1]);
      }
    }
  }
  
  return dp;
}

/**
 * Backtrack through LCS matrix to find the diff
 * @param {number[][]} dp - LCS matrix
 * @param {string[]} a - Original lines
 * @param {string[]} b - Modified lines
 * @returns {Array} - Array of diff operations
 */
function backtrackDiff(dp, a, b) {
  const diff = [];
  let i = a.length;
  let j = b.length;
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && a[i - 1] === b[j - 1]) {
      diff.unshift({
        type: 'unchanged',
        leftLine: i,
        rightLine: j,
        leftContent: a[i - 1],
        rightContent: b[j - 1]
      });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      diff.unshift({
        type: 'added',
        leftLine: null,
        rightLine: j,
        leftContent: null,
        rightContent: b[j - 1]
      });
      j--;
    } else {
      diff.unshift({
        type: 'removed',
        leftLine: i,
        rightLine: null,
        leftContent: a[i - 1],
        rightContent: null
      });
      i--;
    }
  }
  
  return diff;
}

/**
 * Check if two lines are similar enough to be considered modified
 * @param {string} a - First line
 * @param {string} b - Second line
 * @returns {boolean}
 */
function areSimilar(a, b) {
  if (!a || !b) return false;
  
  // Normalize whitespace for comparison
  const normA = a.trim().replace(/\s+/g, ' ');
  const normB = b.trim().replace(/\s+/g, ' ');
  
  if (normA === normB) return true;
  
  // Check if they share common structure (e.g., same selector or property)
  const selectorA = normA.match(/^[^{]+/)?.[0]?.trim() || '';
  const selectorB = normB.match(/^[^{]+/)?.[0]?.trim() || '';
  
  if (selectorA && selectorA === selectorB) return true;
  
  // Check property names
  const propA = normA.match(/^\s*([a-z-]+)\s*:/i)?.[1] || '';
  const propB = normB.match(/^\s*([a-z-]+)\s*:/i)?.[1] || '';
  
  if (propA && propA === propB) return true;
  
  return false;
}

/**
 * Merge consecutive added/removed pairs into modifications
 * @param {Array} diff - Raw diff array
 * @returns {Array} - Processed diff with modifications
 */
function detectModifications(diff) {
  const result = [];
  let i = 0;
  
  while (i < diff.length) {
    const current = diff[i];
    const next = diff[i + 1];
    
    // Look for removed followed by added that are similar
    if (current.type === 'removed' && next?.type === 'added' && 
        areSimilar(current.leftContent, next.rightContent)) {
      result.push({
        type: 'modified',
        leftLine: current.leftLine,
        rightLine: next.rightLine,
        leftContent: current.leftContent,
        rightContent: next.rightContent
      });
      i += 2;
    } else {
      result.push(current);
      i++;
    }
  }
  
  return result;
}

/**
 * Find inline differences between two strings
 * @param {string} oldStr - Original string
 * @param {string} newStr - Modified string
 * @returns {Object} - Object with highlighted old and new strings
 */
export function findInlineDiff(oldStr, newStr) {
  const oldWords = oldStr.split(/(\s+)/);
  const newWords = newStr.split(/(\s+)/);
  
  const dp = computeLCS(oldWords, newWords);
  
  let i = oldWords.length;
  let j = newWords.length;
  
  const oldResult = [];
  const newResult = [];
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldWords[i - 1] === newWords[j - 1]) {
      oldResult.unshift({ text: oldWords[i - 1], changed: false });
      newResult.unshift({ text: newWords[j - 1], changed: false });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      newResult.unshift({ text: newWords[j - 1], changed: true });
      j--;
    } else {
      oldResult.unshift({ text: oldWords[i - 1], changed: true });
      i--;
    }
  }
  
  return { oldResult, newResult };
}

/**
 * Compute diff between two CSS strings
 * @param {string} original - Original CSS content
 * @param {string} modified - Modified CSS content
 * @returns {Object} - Diff result with lines and statistics
 */
export function computeDiff(original, modified) {
  const originalLines = original.split('\n');
  const modifiedLines = modified.split('\n');
  
  const lcsMatrix = computeLCS(originalLines, modifiedLines);
  let diff = backtrackDiff(lcsMatrix, originalLines, modifiedLines);
  diff = detectModifications(diff);
  
  // Calculate statistics
  const stats = {
    added: diff.filter(d => d.type === 'added').length,
    removed: diff.filter(d => d.type === 'removed').length,
    modified: diff.filter(d => d.type === 'modified').length,
    unchanged: diff.filter(d => d.type === 'unchanged').length,
    totalOriginal: originalLines.length,
    totalModified: modifiedLines.length
  };
  
  return { diff, stats };
}

/**
 * Generate unified diff format
 * @param {Array} diff - Diff array
 * @returns {Array} - Unified diff lines
 */
export function generateUnifiedDiff(diff) {
  return diff.map(item => {
    switch (item.type) {
      case 'added':
        return {
          type: 'added',
          prefix: '+',
          content: item.rightContent,
          leftLine: null,
          rightLine: item.rightLine
        };
      case 'removed':
        return {
          type: 'removed',
          prefix: '-',
          content: item.leftContent,
          leftLine: item.leftLine,
          rightLine: null
        };
      case 'modified':
        return [
          {
            type: 'removed',
            prefix: '-',
            content: item.leftContent,
            leftLine: item.leftLine,
            rightLine: null
          },
          {
            type: 'added',
            prefix: '+',
            content: item.rightContent,
            leftLine: null,
            rightLine: item.rightLine
          }
        ];
      default:
        return {
          type: 'unchanged',
          prefix: ' ',
          content: item.leftContent,
          leftLine: item.leftLine,
          rightLine: item.rightLine
        };
    }
  }).flat();
}

/**
 * Generate split view diff data
 * @param {Array} diff - Diff array
 * @returns {Object} - Left and right pane data
 */
export function generateSplitDiff(diff) {
  const left = [];
  const right = [];
  const gutter = [];
  
  diff.forEach(item => {
    switch (item.type) {
      case 'added':
        left.push({ type: 'empty', content: '', lineNumber: null });
        right.push({ type: 'added', content: item.rightContent, lineNumber: item.rightLine });
        gutter.push({ type: 'added', symbol: '+' });
        break;
      case 'removed':
        left.push({ type: 'removed', content: item.leftContent, lineNumber: item.leftLine });
        right.push({ type: 'empty', content: '', lineNumber: null });
        gutter.push({ type: 'removed', symbol: '-' });
        break;
      case 'modified':
        left.push({ 
          type: 'modified', 
          content: item.leftContent, 
          lineNumber: item.leftLine,
          originalContent: item.leftContent,
          newContent: item.rightContent
        });
        right.push({ 
          type: 'modified', 
          content: item.rightContent, 
          lineNumber: item.rightLine,
          originalContent: item.leftContent,
          newContent: item.rightContent
        });
        gutter.push({ type: 'modified', symbol: '~' });
        break;
      default:
        left.push({ type: 'unchanged', content: item.leftContent, lineNumber: item.leftLine });
        right.push({ type: 'unchanged', content: item.rightContent, lineNumber: item.rightLine });
        gutter.push({ type: 'unchanged', symbol: '' });
    }
  });
  
  return { left, right, gutter };
}
