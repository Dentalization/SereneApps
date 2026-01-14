/**
 * Utility functions for formatting and cleaning text content
 */

/**
 * CORE FUNCTION: Normalize AI explanation into structured summary + details
 * 
 * Problem: LLM returns long essay-like text all together WITHOUT line breaks
 * Solution: 
 *   1. Inject line breaks at semantic boundaries FIRST
 *   2. Extract SHORT summary (actual first sentence)
 *   3. Split into organized sections
 * 
 * Returns:
 * {
 *   summary: "Short 1-2 sentence summary (max 150 chars)",
 *   explanation: "Full detailed explanation, cleaned",
 *   sections: [{ title: "Mengenai Gigi...", content: "..." }, ...],
 *   confidence: number (0-100)
 * }
 */
export const normalizeAIExplanation = (rawData) => {
  if (!rawData) return null;
  
  // Extract the long explanation text (include summary/findings/assessment fallbacks)
  let fullText =
    rawData.description ||
    rawData.details ||
    rawData.explanation ||
    rawData.summary ||
    rawData.findings ||
    rawData.overallAssessment ||
    '';
  if (!fullText || typeof fullText !== 'string') return null;
  
  // Clean markdown first
  let cleaned = cleanMarkdownFormatting(fullText);
  
  // CRITICAL: Inject line breaks BEFORE semantic headers
  // This handles text that comes as ONE LONG BLOCK with no \n
  // Pattern: Look for text ending with ":" followed by capital letter or number
  cleaned = cleaned.replace(/([.!?])\s+(Mengenai|Ketika|Perawatan|Rekomendasi|Penyebab|Tujuan|Masalah)/gi, '$1\n\n$2');
  // Also split before numbered lists
  cleaned = cleaned.replace(/([.!?])\s+(\d+\.)/g, '$1\n$2');
  
  // Extract SUMMARY: Take ACTUAL first sentence (not placeholder)
  let summary = '';
  const sentences = cleaned.match(/[^.!?]+[.!?]+/g);
  if (sentences && sentences.length > 0) {
    // Get first meaningful sentence (not just "Analysis" or empty)
    for (const sent of sentences) {
      const trimmed = sent.trim();
      if (trimmed.length > 20 && 
          !trimmed.toLowerCase().includes('analysis') &&
          !trimmed.toLowerCase().includes('analisis dental')) {
        summary = trimmed;
        // Limit to ~150 chars for card display
        if (summary.length > 150) {
          const words = summary.split(' ');
          summary = words.slice(0, 15).join(' ').trim() + '...';
        }
        break;
      }
    }
  }
  
  // Fallback: Take first 150 chars if no good sentence found
  if (!summary) {
    summary = cleaned.substring(0, 147).trim() + '...';
  }
  
  // Extract SECTIONS: Split by semantic markers (headers ending with :)
  const sections = [];
  const lines = cleaned.split('\n');
  let currentSection = null;
  let currentContent = [];
  
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) continue;
    
    // Check if this line is a section header (ends with colon)
    // More flexible: Check if line looks like a header
    const headerMatch = trimmed.match(/^([^:]+?):\s*(.*)$/);
    
    if (headerMatch && headerMatch[1].length < 100 && headerMatch[1].length > 3) {
      // This looks like a section header
      
      // Save previous section
      if (currentSection && currentContent.length > 0) {
        const content = currentContent.join(' ').trim();
        if (content.length > 20) {
          sections.push({
            title: currentSection,
            content: content,
          });
        }
      }
      
      // Start new section
      currentSection = headerMatch[1].trim();
      currentContent = headerMatch[2] ? [headerMatch[2].trim()] : [];
    } else if (currentSection) {
      // Add line to current section content
      currentContent.push(trimmed);
    }
  }
  
  // Save final section
  if (currentSection && currentContent.length > 0) {
    const content = currentContent.join(' ').trim();
    if (content.length > 20) {
      sections.push({
        title: currentSection,
        content: content,
      });
    }
  }
  
  // If no semantic sections found, split by paragraphs (double sentence endings)
  if (sections.length === 0) {
    // Split on multiple sentences as paragraph boundaries
    const paragraphs = cleaned.split(/(?<=[.!?])\s+(?=[A-Z][a-z])/);
    paragraphs.forEach((para, idx) => {
      const trimmed = para.trim();
      if (trimmed.length > 50) {
        sections.push({
          title: `Bagian ${idx + 1}`,
          content: trimmed,
        });
      }
    });
  }
  
  // Last resort: Put everything in one section
  if (sections.length === 0) {
    sections.push({
      title: 'Penjelasan Lengkap',
      content: cleaned,
    });
  }
  
  return {
    summary: summary,
    explanation: cleaned,
    sections: sections,
    confidence: rawData.confidence || rawData.confidenceScore || 0,
  };
};

/**
 * Clean markdown formatting from text
 * - Removes asterisks (*) used for bold/italic
 * - Removes double asterisks (**)
 * - Removes bullet point markers (*, -, +)
 * - Normalizes whitespace
 */
export const cleanMarkdownFormatting = (text) => {
  if (!text || typeof text !== 'string') return '';
  
  // Remove **text** (bold) - multiple passes to catch nested cases
  let prevText = '';
  while (prevText !== text) {
    prevText = text;
    text = text.replace(/\*\*([^*]+)\*\*/g, '$1');
  }
  
  // Remove *text* (italic) - multiple passes
  prevText = '';
  while (prevText !== text) {
    prevText = text;
    text = text.replace(/\*([^*]+)\*/g, '$1');
  }
  
  // Remove __text__ (alt bold)
  text = text.replace(/__(.*?)__/g, '$1');
  
  // Remove _text_ (alt italic)
  text = text.replace(/_(.*?)_/g, '$1');
  
  // Remove any remaining standalone asterisks
  text = text.replace(/\*/g, '');
  
  // Remove leading bullet points at start of lines
  text = text.replace(/^\s*[\*\-\+]\s+/gm, '');

  // Remove stray probability lines like "0% probability"
  text = text.replace(/^\s*\d+%\s*probability\s*$/gim, '');
  
  // Fix multiple spaces
  text = text.replace(/\s{2,}/g, ' ');
  
  // Trim each line
  text = text.split('\n').map(line => line.trim()).join('\n');
  
  return text.trim();
};

/**
 * Parse markdown-style bullet lists and convert to structured format
 * Smart splitting by section headers (lines ending with colon) and paragraphs
 * Returns array of paragraphs and lists with proper spacing
 */
export const parseTextWithLists = (text) => {
  if (!text || typeof text !== 'string') return [];
  
  // Always work with cleaned markdown to avoid stray * characters
  const cleanedText = cleanMarkdownFormatting(text);

  // Inject line breaks before common headers to improve readability
  const injected = cleanedText.replace(/(Perawatan|Rekomendasi|Mengenai|Ringkasan|Kesimpulan)\s*:/gi, '\n$1:');
  const hasLineBreaks = injected.includes('\n');

  // If still no line breaks, split by sentence boundaries as fallback
  if (!hasLineBreaks) {
    const sections = [];
    const sentenceBlocks = injected.split(/(?<=[.!?])\s+(?=[A-Z0-9])/);
    sentenceBlocks.forEach((sent) => {
      const s = sent.trim();
      if (!s) return;
      sections.push({ type: 'paragraph', content: s });
    });
    return sections;
  }
  
  // If there are line breaks, use smarter section parsing
  const lines = injected.split('\n');
  const sections = [];
  let currentSection = {
    type: 'paragraph',
    content: [],
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    
    // Skip empty lines
    if (!trimmed) {
      // Empty line might indicate paragraph break
      if (currentSection.content.length > 0 && currentSection.type === 'paragraph') {
        // Save current paragraph and reset
        const cleanedContent = currentSection.content.join(' ').trim();
        if (cleanedContent) {
          const finalCleaned = cleanMarkdownFormatting(cleanedContent);
          sections.push({
            type: 'paragraph',
            content: finalCleaned,
          });
        }
        currentSection = { type: 'paragraph', content: [] };
      }
      continue;
    }

    // Check if line is a section header (ends with colon)
    const isSectionHeader = trimmed.endsWith(':');
    
    // Check if line is a bullet point
    const bulletMatch = trimmed.match(/^[\*\-\+]\s+(.+)$/);
    
    if (bulletMatch) {
      // This is a bullet point
      if (currentSection.type !== 'list') {
        // Save current paragraph and start new list
        if (currentSection.content.length > 0) {
          const cleanedContent = currentSection.content.join(' ').trim();
          if (cleanedContent) {
            sections.push({
              type: 'paragraph',
              content: cleanMarkdownFormatting(cleanedContent),
            });
          }
        }
        currentSection = { type: 'list', content: [] };
      }
      
      // Add bullet item - clean markdown from it
      const cleanedItem = cleanMarkdownFormatting(bulletMatch[1].trim());
      currentSection.content.push(cleanedItem);
    } else if (isSectionHeader) {
      // This is a section header
      if (currentSection.content.length > 0) {
        if (currentSection.type === 'list') {
          sections.push({
            type: 'list',
            content: currentSection.content,
          });
        } else {
          const cleanedContent = currentSection.content.join(' ').trim();
          if (cleanedContent) {
            sections.push({
              type: 'paragraph',
              content: cleanMarkdownFormatting(cleanedContent),
            });
          }
        }
      }
      
      // Add header as a paragraph with special formatting
      currentSection = {
        type: 'header',
        content: cleanMarkdownFormatting(trimmed),
      };
      sections.push(currentSection);
      currentSection = { type: 'paragraph', content: [] };
    } else if (trimmed) {
      // Regular paragraph text
      if (currentSection.type === 'list') {
        // Save current list and start new paragraph
        sections.push({
          type: 'list',
          content: currentSection.content,
        });
        currentSection = { type: 'paragraph', content: [] };
      }
      
      currentSection.content.push(trimmed);
    }
  }

  // Add final section
  if (currentSection.content.length > 0) {
    if (currentSection.type === 'list') {
      sections.push({
        type: 'list',
        content: currentSection.content,
      });
    } else {
      const cleanedContent = currentSection.content.join(' ').trim();
      if (cleanedContent) {
        const finalCleaned = cleanMarkdownFormatting(cleanedContent);
        sections.push({
          type: 'paragraph',
          content: finalCleaned,
        });
      }
    }
  }

  return sections;
};

/**
 * Extract key information from analysis text
 * Looks for specific patterns like "Mengenai X:", "Rekomendasi:", etc.
 */
export const extractAnalysisTopics = (text) => {
  if (!text || typeof text !== 'string') return [];
  
  const topics = [];
  const lines = text.split('\n');
  
  let currentTopic = null;
  const topicContent = [];
  
  lines.forEach((line) => {
    // Check for topic header (ends with colon)
    const topicMatch = line.match(/^(\*{0,2})?([^:*]+):\s*\*{0,2}(.*)$/);
    
    if (topicMatch) {
      // Save previous topic
      if (currentTopic) {
        topics.push({
          title: cleanMarkdownFormatting(currentTopic),
          content: cleanMarkdownFormatting(topicContent.join('\n').trim()),
        });
        topicContent.length = 0;
      }
      
      currentTopic = topicMatch[2].trim();
      if (topicMatch[3]) {
        topicContent.push(topicMatch[3]);
      }
    } else if (currentTopic && line.trim()) {
      topicContent.push(line);
    }
  });
  
  // Save final topic
  if (currentTopic) {
    topics.push({
      title: cleanMarkdownFormatting(currentTopic),
      content: cleanMarkdownFormatting(topicContent.join('\n').trim()),
    });
  }
  
  return topics;
};

/**
 * Format analysis summary with proper structure
 * Cleans markdown and organizes content into readable format
 */
export const formatAnalysisSummary = (text) => {
  if (!text || typeof text !== 'string') return null;
  
  // First, clean markdown formatting
  const cleaned = cleanMarkdownFormatting(text);
  
  // Extract topics if they exist
  const topics = extractAnalysisTopics(text);
  
  if (topics.length > 0) {
    return {
      type: 'structured',
      topics: topics.map(t => ({
        title: t.title,
        content: parseTextWithLists(t.content),
      })),
    };
  }
  
  // Otherwise, parse as paragraph/list structure
  const sections = parseTextWithLists(cleaned);
  
  return {
    type: 'unstructured',
    sections,
  };
};

/**
 * Truncate text to specific length while preserving words
 */
export const truncateText = (text, maxLength = 200) => {
  if (!text || text.length <= maxLength) return text;
  
  const truncated = text.substring(0, maxLength);
  const lastSpace = truncated.lastIndexOf(' ');
  
  return lastSpace > 0 ? truncated.substring(0, lastSpace) + '...' : truncated + '...';
};
