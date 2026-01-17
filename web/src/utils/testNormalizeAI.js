/**
 * AI Text Normalization Utilities
 * Handles raw API responses (often without newlines) and structures them.
 */

/**
 * CRITICAL: Injects line breaks at semantic boundaries.
 * This fixes API responses that come as one giant string.
 */
export function injectLineBreaks(text) {
  if (!text) return '';
  let processed = text;

  // 1. Inject line breaks before semantic headers (Indonesian Context)
  // Looks for sentence endings (.!?) followed by Keywords like "Mengenai", "Perawatan", etc.
  processed = processed.replace(/([.!?])\s+(Mengenai|Ketika|Perawatan|Rekomendasi|Penyebab|Tujuan|Masalah|Analisis|Kesimpulan)/gi, '$1\n\n$2');

  // 2. Split before numbered lists (e.g. "text. 1. Item") -> "text.\n1. Item"
  processed = processed.replace(/([.!?])\s+(\d+\.)/g, '$1\n$2');

  // 3. Split before bullet points if they are stuck to previous text
  processed = processed.replace(/([.!?])\s+([*-] )/g, '$1\n$2');

  return processed;
}

/**
 * Smart Summary Extractor
 * Skips generic intros like "Analisis:" and finds the first meaningful sentence.
 */
export function extractSummary(text) {
  if (!text) return '';
  
  // Clean markdown for analysis
  const cleaned = text.replace(/\*\*/g, '').replace(/\*/g, '');
  
  // Split into sentences using punctuation
  const sentences = cleaned.match(/[^.!?]+[.!?]+/g);
  
  if (sentences && sentences.length > 0) {
    // Find first meaningful sentence
    for (const sent of sentences) {
      const trimmed = sent.trim();
      
      // Filter out short labels or generic headers
      if (trimmed.length > 20 && 
          !trimmed.toLowerCase().includes('analysis') &&
          !trimmed.toLowerCase().includes('analisis dental')) {
        
        let summary = trimmed;
        
        // Truncate if too long (approx 15-20 words)
        if (summary.length > 150) {
          const words = summary.split(' ');
          summary = words.slice(0, 20).join(' ').trim() + '...';
        }
        return summary;
      }
    }
  }
  
  // Fallback if no specific sentence found
  return cleaned.substring(0, 147).trim() + '...';
}

/**
 * Section Extractor
 * Parses text into {title, content} blocks based on colons (e.g. "**Diagnosa:** ...")
 */
export function extractSections(text) {
  if (!text) return [];

  // CRITICAL: Inject line breaks FIRST so we can split by newline
  const withBreaks = injectLineBreaks(text);
  
  const sections = [];
  const lines = withBreaks.split('\n');
  
  let currentSection = null;
  let currentContent = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Check if this line is a section header (ends with colon)
    // Regex allows for bold markers like "**Diagnosa:**"
    const headerMatch = trimmed.match(/^(\**?[^:]+?\**?):\s*(.*)$/);
    
    // Validate header length to avoid false positives on long sentences
    if (headerMatch && headerMatch[1].length < 100 && headerMatch[1].length > 3) {
      
      // Save previous section if it exists
      if (currentSection && currentContent.length > 0) {
        const content = currentContent.join(' ').trim();
        if (content.length > 10) { // Only save meaningful sections
          sections.push({
            title: currentSection.replace(/\*/g, ''), // Clean asterisks from title
            content: content,
          });
        }
      }
      
      // Start new section
      currentSection = headerMatch[1].trim();
      // If there is content on the same line after the colon, add it
      currentContent = headerMatch[2] ? [headerMatch[2].trim()] : [];
    } 
    else if (currentSection) {
      // It's a continuation of the previous section
      currentContent.push(trimmed);
    }
  }
  
  // Save the final section found
  if (currentSection && currentContent.length > 0) {
    const content = currentContent.join(' ').trim();
    if (content.length > 10) {
      sections.push({
        title: currentSection.replace(/\*/g, ''),
        content: content,
      });
    }
  }
  
  return sections;
}

/**
 * Main Normalization Function
 * Use this in your React components
 */
export function normalizeAIResponse(rawText) {
  if (!rawText) return null;

  const text = typeof rawText === 'string' ? rawText : JSON.stringify(rawText);

  return {
    raw: text,
    summary: extractSummary(text),
    sections: extractSections(text)
  };
}

/**
 * Helper to strip "Diagnosis:" prefixes (Legacy support)
 */
export function stripDiagnosisIntro(text) {
  if (!text) return '';
  return text.replace(/^(Diagnosa|Diagnosis|Analisis|Temuan):\s*/i, '');
}