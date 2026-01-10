/**
 * CSS Diff Engine
 * Computes differences between two CSS strings with smart line matching
 */

/**
 * Calculate Levenshtein distance between two strings
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} - Edit distance
 */
function levenshteinDistance(a, b) {
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix = [];

  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }

  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1, // substitution
          matrix[i][j - 1] + 1,     // insertion
          matrix[i - 1][j] + 1      // deletion
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

/**
 * Calculate similarity ratio between two strings (0 to 1)
 * @param {string} a - First string
 * @param {string} b - Second string
 * @returns {number} - Similarity ratio (1 = identical, 0 = completely different)
 */
function similarityRatio(a, b) {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  
  const maxLen = Math.max(a.length, b.length);
  if (maxLen === 0) return 1;
  
  const distance = levenshteinDistance(a, b);
  return 1 - (distance / maxLen);
}

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
 * Uses multiple heuristics for better matching
 * @param {string} a - First line
 * @param {string} b - Second line
 * @param {number} threshold - Minimum similarity ratio (default 0.4)
 * @returns {Object} - { similar: boolean, ratio: number }
 */
function areSimilar(a, b, threshold = 0.4) {
  if (!a || !b) return { similar: false, ratio: 0 };
  
  // Normalize whitespace for comparison
  const normA = a.trim().replace(/\s+/g, ' ');
  const normB = b.trim().replace(/\s+/g, ' ');
  
  // Exact match after normalization
  if (normA === normB) return { similar: true, ratio: 1 };
  
  // Skip empty lines
  if (!normA || !normB) return { similar: false, ratio: 0 };
  
  // Calculate base similarity
  let ratio = similarityRatio(normA, normB);
  
  // Boost similarity for CSS-specific patterns
  
  // Same CSS property name (e.g., "color: red" vs "color: blue")
  const propA = normA.match(/^\s*([a-z-]+)\s*:/i)?.[1]?.toLowerCase();
  const propB = normB.match(/^\s*([a-z-]+)\s*:/i)?.[1]?.toLowerCase();
  if (propA && propB && propA === propB) {
    ratio = Math.max(ratio, 0.6); // Boost to at least 0.6
  }
  
  // Same selector pattern
  const selectorA = normA.match(/^([^{]+)\s*\{/)?.[1]?.trim();
  const selectorB = normB.match(/^([^{]+)\s*\{/)?.[1]?.trim();
  if (selectorA && selectorB) {
    const selectorRatio = similarityRatio(selectorA, selectorB);
    if (selectorRatio > 0.7) {
      ratio = Math.max(ratio, 0.65);
    }
  }
  
  // Both are closing braces
  if (normA === '}' && normB === '}') {
    return { similar: true, ratio: 1 };
  }
  
  // Both start with same prefix (common in CSS)
  const prefixLen = Math.min(10, Math.min(normA.length, normB.length));
  if (prefixLen > 3 && normA.substring(0, prefixLen) === normB.substring(0, prefixLen)) {
    ratio = Math.max(ratio, 0.5);
  }
  
  return { similar: ratio >= threshold, ratio };
}

/**
 * Find the best matches between removed and added lines
 * Uses Hungarian-like algorithm to find optimal pairing
 * @param {Array} removed - Array of removed line objects
 * @param {Array} added - Array of added line objects
 * @returns {Array} - Array of { removed, added, ratio } pairs
 */
function findBestMatches(removed, added) {
  if (removed.length === 0 || added.length === 0) {
    return [];
  }
  
  // Calculate similarity matrix
  const similarities = [];
  for (let i = 0; i < removed.length; i++) {
    similarities[i] = [];
    for (let j = 0; j < added.length; j++) {
      const { similar, ratio } = areSimilar(removed[i].leftContent, added[j].rightContent);
      similarities[i][j] = similar ? ratio : 0;
    }
  }
  
  // Greedy matching: repeatedly pick the best remaining match
  const matches = [];
  const usedRemoved = new Set();
  const usedAdded = new Set();
  
  while (usedRemoved.size < removed.length && usedAdded.size < added.length) {
    let bestI = -1, bestJ = -1, bestRatio = 0;
    
    for (let i = 0; i < removed.length; i++) {
      if (usedRemoved.has(i)) continue;
      for (let j = 0; j < added.length; j++) {
        if (usedAdded.has(j)) continue;
        if (similarities[i][j] > bestRatio) {
          bestRatio = similarities[i][j];
          bestI = i;
          bestJ = j;
        }
      }
    }
    
    if (bestRatio > 0) {
      matches.push({
        removedIdx: bestI,
        addedIdx: bestJ,
        removed: removed[bestI],
        added: added[bestJ],
        ratio: bestRatio
      });
      usedRemoved.add(bestI);
      usedAdded.add(bestJ);
    } else {
      break;
    }
  }
  
  return matches;
}

/**
 * Merge consecutive added/removed into modifications using smart matching
 * @param {Array} diff - Raw diff array
 * @returns {Array} - Processed diff with modifications
 */
function detectModifications(diff) {
  const result = [];
  let i = 0;
  
  while (i < diff.length) {
    // Collect consecutive removed and added lines
    const removedBlock = [];
    const addedBlock = [];
    const blockStart = i;
    
    // First, collect all consecutive removed lines
    while (i < diff.length && diff[i].type === 'removed') {
      removedBlock.push({ ...diff[i], originalIndex: i });
      i++;
    }
    
    // Then, collect all consecutive added lines
    while (i < diff.length && diff[i].type === 'added') {
      addedBlock.push({ ...diff[i], originalIndex: i });
      i++;
    }
    
    // If we found both removed and added, try to match them
    if (removedBlock.length > 0 && addedBlock.length > 0) {
      const matches = findBestMatches(removedBlock, addedBlock);
      
      // Track which items were matched
      const matchedRemoved = new Set(matches.map(m => m.removedIdx));
      const matchedAdded = new Set(matches.map(m => m.addedIdx));
      
      // Build result maintaining order
      // First, output unmatched removed lines
      for (let r = 0; r < removedBlock.length; r++) {
        if (!matchedRemoved.has(r)) {
          result.push({
            type: 'removed',
            leftLine: removedBlock[r].leftLine,
            rightLine: null,
            leftContent: removedBlock[r].leftContent,
            rightContent: null
          });
        }
      }
      
      // Then, output matched pairs as modifications (in order of removed)
      const sortedMatches = [...matches].sort((a, b) => a.removedIdx - b.removedIdx);
      for (const match of sortedMatches) {
        result.push({
          type: 'modified',
          leftLine: match.removed.leftLine,
          rightLine: match.added.rightLine,
          leftContent: match.removed.leftContent,
          rightContent: match.added.rightContent,
          similarity: match.ratio
        });
      }
      
      // Finally, output unmatched added lines
      for (let a = 0; a < addedBlock.length; a++) {
        if (!matchedAdded.has(a)) {
          result.push({
            type: 'added',
            leftLine: null,
            rightLine: addedBlock[a].rightLine,
            leftContent: null,
            rightContent: addedBlock[a].rightContent
          });
        }
      }
    } else if (removedBlock.length > 0) {
      // Only removed lines
      for (const item of removedBlock) {
        result.push({
          type: 'removed',
          leftLine: item.leftLine,
          rightLine: null,
          leftContent: item.leftContent,
          rightContent: null
        });
      }
    } else if (addedBlock.length > 0) {
      // Only added lines
      for (const item of addedBlock) {
        result.push({
          type: 'added',
          leftLine: null,
          rightLine: item.rightLine,
          leftContent: null,
          rightContent: item.rightContent
        });
      }
    } else {
      // Unchanged line
      result.push(diff[blockStart]);
      i++;
    }
  }
  
  return result;
}

/**
 * Find inline differences between two strings at character level
 * @param {string} oldStr - Original string
 * @param {string} newStr - Modified string
 * @returns {Object} - Object with highlighted old and new parts
 */
export function findInlineDiff(oldStr, newStr) {
  if (!oldStr) oldStr = '';
  if (!newStr) newStr = '';
  
  // Find common prefix
  let prefixLen = 0;
  const minLen = Math.min(oldStr.length, newStr.length);
  while (prefixLen < minLen && oldStr[prefixLen] === newStr[prefixLen]) {
    prefixLen++;
  }
  
  // Find common suffix (but don't overlap with prefix)
  let suffixLen = 0;
  while (
    suffixLen < minLen - prefixLen &&
    oldStr[oldStr.length - 1 - suffixLen] === newStr[newStr.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }
  
  // Extract the different parts
  const oldMiddle = oldStr.substring(prefixLen, oldStr.length - suffixLen);
  const newMiddle = newStr.substring(prefixLen, newStr.length - suffixLen);
  const prefix = oldStr.substring(0, prefixLen);
  const suffix = oldStr.substring(oldStr.length - suffixLen);
  
  // Build result arrays
  const oldResult = [];
  const newResult = [];
  
  if (prefix) {
    oldResult.push({ text: prefix, changed: false });
    newResult.push({ text: prefix, changed: false });
  }
  
  if (oldMiddle) {
    oldResult.push({ text: oldMiddle, changed: true });
  }
  if (newMiddle) {
    newResult.push({ text: newMiddle, changed: true });
  }
  
  if (suffix) {
    oldResult.push({ text: suffix, changed: false });
    newResult.push({ text: suffix, changed: false });
  }
  
  // Handle edge case where strings are identical
  if (oldResult.length === 0 && newResult.length === 0) {
    oldResult.push({ text: oldStr, changed: false });
    newResult.push({ text: newStr, changed: false });
  }
  
  return { oldResult, newResult };
}

/**
 * Find inline differences using word-level comparison for better readability
 * @param {string} oldStr - Original string
 * @param {string} newStr - Modified string
 * @returns {Object} - Object with highlighted old and new parts
 */
export function findInlineDiffWords(oldStr, newStr) {
  if (!oldStr) oldStr = '';
  if (!newStr) newStr = '';
  
  // Split into tokens (words and whitespace)
  const tokenize = (str) => {
    const tokens = [];
    let current = '';
    let isSpace = false;
    
    for (const char of str) {
      const charIsSpace = /\s/.test(char);
      if (current && charIsSpace !== isSpace) {
        tokens.push(current);
        current = '';
      }
      current += char;
      isSpace = charIsSpace;
    }
    if (current) tokens.push(current);
    return tokens;
  };
  
  const oldTokens = tokenize(oldStr);
  const newTokens = tokenize(newStr);
  
  // LCS on tokens
  const dp = computeLCS(oldTokens, newTokens);
  
  let i = oldTokens.length;
  let j = newTokens.length;
  
  const oldResult = [];
  const newResult = [];
  
  while (i > 0 || j > 0) {
    if (i > 0 && j > 0 && oldTokens[i - 1] === newTokens[j - 1]) {
      oldResult.unshift({ text: oldTokens[i - 1], changed: false });
      newResult.unshift({ text: newTokens[j - 1], changed: false });
      i--;
      j--;
    } else if (j > 0 && (i === 0 || dp[i][j - 1] >= dp[i - 1][j])) {
      newResult.unshift({ text: newTokens[j - 1], changed: true });
      j--;
    } else {
      oldResult.unshift({ text: oldTokens[i - 1], changed: true });
      i--;
    }
  }
  
  // Merge consecutive same-type segments
  const merge = (arr) => {
    const merged = [];
    for (const item of arr) {
      if (merged.length > 0 && merged[merged.length - 1].changed === item.changed) {
        merged[merged.length - 1].text += item.text;
      } else {
        merged.push({ ...item });
      }
    }
    return merged;
  };
  
  return { 
    oldResult: merge(oldResult), 
    newResult: merge(newResult) 
  };
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
          newContent: item.rightContent,
          similarity: item.similarity
        });
        right.push({ 
          type: 'modified', 
          content: item.rightContent, 
          lineNumber: item.rightLine,
          originalContent: item.leftContent,
          newContent: item.rightContent,
          similarity: item.similarity
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
