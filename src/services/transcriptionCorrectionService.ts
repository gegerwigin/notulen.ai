/**
 * Transcription Correction Service
 * Provides AI-powered correction and enhancement for speech transcriptions
 */

import stringUtils from '../utils/stringUtils';
const { levenshteinDistance } = stringUtils;

/**
 * Interface for correction result
 */
export interface CorrectionResult {
  correctedText: string;
  confidence: number;
  suggestions?: string[];
}

/**
 * Apply AI-powered correction to transcription text
 * @param text The original transcription text
 * @param language The language code of the transcription
 * @returns Promise with corrected text and confidence score
 */
export const correctTranscription = async (
  text: string,
  language: string = 'id'
): Promise<CorrectionResult> => {
  if (!text || text.trim() === '') {
    return {
      correctedText: '',
      confidence: 1.0
    };
  }
  
  try {
    // Apply language-specific corrections
    let correctedText = '';
    
    // Apply corrections based on language
    if (language.startsWith('en')) {
      correctedText = applyEnglishCorrections(text);
    } else if (language.startsWith('id')) {
      correctedText = applyIndonesianCorrections(text);
    } else {
      // Default to general corrections for unsupported languages
      correctedText = applyGeneralCorrections(text);
    }
    
    // Apply general corrections that work for all languages
    correctedText = applyGeneralCorrections(correctedText);
    
    // Calculate confidence score
    const confidence = calculateConfidenceScore(text, correctedText);
    
    // Generate alternative suggestions if confidence is below threshold
    let suggestions: string[] = [];
    if (confidence < 0.8) {
      suggestions = generateSuggestions(text, correctedText);
    }
    
    return {
      correctedText,
      confidence,
      suggestions: suggestions.length > 0 ? suggestions : undefined
    };
  } catch (error) {
    console.error('Error correcting transcription:', error);
    // Return original text if correction fails
    return {
      correctedText: text,
      confidence: 1.0
    };
  }
};

/**
 * Apply English-specific corrections
 * @param text The text to correct
 * @returns Corrected text
 */
const applyEnglishCorrections = (text: string): string => {
  // Common English speech recognition errors
  const corrections: [RegExp, string][] = [
    [/\bI'm gonna\b/gi, "I'm going to"],
    [/\bwanna\b/gi, "want to"],
    [/\bgotta\b/gi, "got to"],
    [/\bkinda\b/gi, "kind of"],
    [/\bsorta\b/gi, "sort of"],
    [/\byeah\b/gi, "yes"],
    [/\bnope\b/gi, "no"],
    [/\bcause\b/gi, "because"],
    [/\b(\w+)in'\b/gi, "$1ing"], // Convert words like talkin' to talking
    [/\bthx\b/gi, "thanks"],
    [/\bu\b/gi, "you"],
    [/\br\b/gi, "are"],
    [/\bur\b/gi, "your"],
    [/\bbtw\b/gi, "by the way"],
    [/\bfyi\b/gi, "for your information"],
    [/\bomg\b/gi, "oh my god"],
    [/\blol\b/gi, "laugh out loud"],
    [/\basap\b/gi, "as soon as possible"]
  ];
  
  let result = text;
  
  // Apply all corrections
  for (const [pattern, replacement] of corrections) {
    result = result.replace(pattern, replacement);
  }
  
  return result;
};

/**
 * Apply Indonesian-specific corrections
 * @param text The text to correct
 * @returns Corrected text
 */
const applyIndonesianCorrections = (text: string): string => {
  // Common Indonesian speech recognition errors
  const corrections: [RegExp, string][] = [
    [/\bgak\b/gi, "tidak"],
    [/\bnggak\b/gi, "tidak"],
    [/\benggak\b/gi, "tidak"],
    [/\bgitu\b/gi, "begitu"],
    [/\bgini\b/gi, "begini"],
    [/\baku\b/gi, "saya"],
    [/\blo\b/gi, "kamu"],
    [/\blu\b/gi, "kamu"],
    [/\bkalo\b/gi, "kalau"],
    [/\bkayak\b/gi, "seperti"],
    [/\bkyk\b/gi, "seperti"],
    [/\byg\b/gi, "yang"],
    [/\bsy\b/gi, "saya"],
    [/\bsih\b/gi, "sih"],
    [/\bdong\b/gi, "dong"],
    [/\bsih\b/gi, "sih"],
    [/\bjg\b/gi, "juga"],
    [/\bsdh\b/gi, "sudah"],
    [/\bblm\b/gi, "belum"],
    [/\bbs\b/gi, "bisa"]
  ];
  
  let result = text;
  
  // Apply all corrections
  for (const [pattern, replacement] of corrections) {
    result = result.replace(pattern, replacement);
  }
  
  return result;
};

/**
 * Apply general corrections for all languages
 * @param text The text to correct
 * @returns Corrected text
 */
const applyGeneralCorrections = (text: string): string => {
  // Correct repeated words (common in speech recognition)
  const repeatedWordsPattern = /\b(\w+)(\s+\1)+\b/gi;
  let result = text.replace(repeatedWordsPattern, '$1');
  
  // Fix capitalization after periods
  result = result.replace(/\.\s+([a-z])/g, (_, letter) => `. ${letter.toUpperCase()}`);
  
  // Fix spacing around punctuation
  result = result.replace(/\s+([.,;:!?])/g, '$1');
  
  // Fix multiple spaces
  result = result.replace(/\s{2,}/g, ' ');
  
  return result;
};

/**
 * Calculate confidence score based on edit distance
 * @param original The original text
 * @param corrected The corrected text
 * @returns Confidence score between 0 and 1
 */
const calculateConfidenceScore = (original: string, corrected: string): number => {
  if (original === corrected) {
    return 1.0; // No changes, perfect confidence
  }
  
  if (!original || original.trim() === '') {
    return 0.0; // Empty original text
  }
  
  // Calculate Levenshtein distance
  const distance = levenshteinDistance(original, corrected);
  
  // Normalize by the length of the longer string
  const maxLength = Math.max(original.length, corrected.length);
  
  // Calculate similarity (1 - normalized distance)
  const similarity = 1 - (distance / maxLength);
  
  // Scale similarity to confidence score
  // We want minor corrections to still have high confidence
  // For example, fixing a few typos shouldn't drop confidence too much
  const confidence = Math.max(0, Math.min(1, 0.5 + similarity / 2));
  
  return parseFloat(confidence.toFixed(2));
};

/**
 * Generate alternative suggestions for corrected text
 * @param original The original text
 * @param corrected The corrected text
 * @returns Array of alternative suggestions
 */
const generateSuggestions = (original: string, corrected: string): string[] => {
  const suggestions: string[] = [];
  
  // Split into words
  const originalWords = original.split(/\s+/);
  const correctedWords = corrected.split(/\s+/);
  
  // Find words that differ
  const differentWords: { original: string, corrected: string, index: number }[] = [];
  
  for (let i = 0; i < Math.min(originalWords.length, correctedWords.length); i++) {
    if (originalWords[i] !== correctedWords[i]) {
      differentWords.push({
        original: originalWords[i],
        corrected: correctedWords[i],
        index: i
      });
    }
  }
  
  // Generate alternatives for each different word
  for (const diff of differentWords) {
    const alternatives = findAlternativeWords(diff.original);
    
    for (const alt of alternatives) {
      if (alt !== diff.corrected) {
        const newWords = [...correctedWords];
        newWords[diff.index] = alt;
        suggestions.push(newWords.join(' '));
        
        // Limit to 3 suggestions
        if (suggestions.length >= 3) {
          return suggestions;
        }
      }
    }
  }
  
  return suggestions;
};

/**
 * Find alternative words for a given word
 * @param word The word to find alternatives for
 * @returns Array of alternative words
 */
const findAlternativeWords = (word: string): string[] => {
  // This is a simplified implementation
  // In a real application, this would use a dictionary or ML model
  
  const alternatives: string[] = [];
  
  // Simple alternatives based on common speech recognition errors
  if (word.length > 3) {
    // Add a version with corrected capitalization
    if (word !== word.toLowerCase()) {
      alternatives.push(word.toLowerCase());
    }
    
    // Add a version with first letter capitalized
    const capitalized = word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
    if (word !== capitalized) {
      alternatives.push(capitalized);
    }
    
    // Add a version with common suffix variations
    if (word.endsWith('in')) {
      alternatives.push(word + 'g');
    }
    
    if (word.endsWith('in\'')) {
      alternatives.push(word.slice(0, -2) + 'ing');
    }
  }
  
  return alternatives;
};
