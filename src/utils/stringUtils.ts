/**
 * String utility functions for text processing and analysis
 */

/**
 * Calculate the Levenshtein distance between two strings
 * This measures the minimum number of single-character edits required to change one string into another
 * 
 * @param a First string
 * @param b Second string
 * @returns The edit distance between the strings
 */
export const levenshteinDistance = (a: string, b: string): number => {
  // Create a matrix of size (a.length+1) x (b.length+1)
  const matrix: number[][] = Array(a.length + 1)
    .fill(null)
    .map(() => Array(b.length + 1).fill(null));

  // Fill the first row and column with their indices
  for (let i = 0; i <= a.length; i++) {
    matrix[i][0] = i;
  }
  
  for (let j = 0; j <= b.length; j++) {
    matrix[0][j] = j;
  }

  // Fill the rest of the matrix
  for (let i = 1; i <= a.length; i++) {
    for (let j = 1; j <= b.length; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      
      matrix[i][j] = Math.min(
        matrix[i - 1][j] + 1, // deletion
        matrix[i][j - 1] + 1, // insertion
        matrix[i - 1][j - 1] + cost // substitution
      );
    }
  }

  // Return the bottom-right cell which contains the final distance
  return matrix[a.length][b.length];
};

/**
 * Calculate similarity between two strings as a percentage
 * 
 * @param a First string
 * @param b Second string
 * @returns Similarity percentage (0-100)
 */
export const calculateStringSimilarity = (a: string, b: string): number => {
  if (a === b) return 100;
  if (a.length === 0 || b.length === 0) return 0;
  
  const distance = levenshteinDistance(a, b);
  const maxLength = Math.max(a.length, b.length);
  const similarity = (1 - distance / maxLength) * 100;
  
  return Math.round(similarity);
};

/**
 * Normalize text by removing extra spaces, converting to lowercase, etc.
 * 
 * @param text Text to normalize
 * @returns Normalized text
 */
export const normalizeText = (text: string): string => {
  if (!text) return '';
  
  return text
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' '); // Replace multiple spaces with a single space
};

/**
 * Extract keywords from text
 * This is a simple implementation that removes common stop words
 * 
 * @param text Text to extract keywords from
 * @returns Array of keywords
 */
export const extractKeywords = (text: string): string[] => {
  if (!text) return [];
  
  // Common English and Indonesian stop words
  const stopWords = new Set([
    // English
    'a', 'an', 'the', 'and', 'or', 'but', 'is', 'are', 'was', 'were',
    'in', 'on', 'at', 'to', 'for', 'with', 'by', 'about', 'as', 'of',
    'this', 'that', 'these', 'those', 'it', 'its', 'they', 'them',
    
    // Indonesian
    'yang', 'dan', 'di', 'ke', 'dari', 'untuk', 'dengan', 'adalah',
    'pada', 'ini', 'itu', 'atau', 'juga', 'saya', 'kamu', 'dia'
  ]);
  
  // Normalize and split text into words
  const words = normalizeText(text)
    .split(' ')
    .filter(word => word.length > 2 && !stopWords.has(word));
  
  // Return unique keywords
  return [...new Set(words)];
};

// Export all functions as a module
export default {
  levenshteinDistance,
  calculateStringSimilarity,
  normalizeText,
  extractKeywords
};
