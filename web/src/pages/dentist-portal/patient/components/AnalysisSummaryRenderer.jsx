import React from 'react';
import { useLanguage } from '../../../../contexts/LanguageContext';
import { extractAnalysisTopics, parseTextWithLists } from '../../../../utils/textFormatting';
import { stripDiagnosisIntro, cleanAIDentistOutput } from '../../../../utils/aiTextHelpers';

/**
 * Helper: Merender teks dengan format Bold (**teks**)
 * Menggunakan regex split untuk memisahkan teks biasa dan teks bold.
 */
const RichText = ({ text }) => {
  if (!text) return null;
  const safeText = String(text);

  // Split berdasarkan pola **...**
  // Capture group () membuat delimiter tetap ada di hasil array
  const parts = safeText.split(/(\*\*.*?\*\*)/g);

  return (
    <>
      {parts.map((part, i) => {
        // Cek apakah bagian ini diawali dan diakhiri **
        if (part.startsWith('**') && part.endsWith('**')) {
          // Hapus tanda ** dan render bold
          return (
            <strong key={i} className="font-bold text-primary-dark">
              {part.slice(2, -2)}
            </strong>
          );
        }
        // Render teks biasa
        return <span key={i}>{part}</span>;
      })}
    </>
  );
};

const reinsertAnalysisBreaks = (text = '') => {
  if (!text) return '';

  let s = String(text)
    .replace(/\\r\\n/g, '\n')
    .replace(/\\n/g, '\n')
    .trim();

  if (!s) return '';

  // Rebuild likely block boundaries when the backend stores everything in one line.
  if (!s.includes('\n')) {
    s = s
      .replace(/ (\*\*\d+[\.\)]\s)/g, '\n\n$1')
      .replace(/ (\d+[\.\)]\s+(?:\*\*)?[A-Za-z])/g, '\n$1')
      .replace(/ (\* (?:\*\*)?[A-Za-z])/g, '\n$1')
      .replace(/ (- (?:\*\*)?[A-Za-z])/g, '\n$1')
      .replace(/ (\*\*[A-Z][^*]{4,}:\*\*)/g, '\n\n$1')
      .replace(/ ([A-Z][A-Za-z\s]{4,45}:)(?=\s)/g, '\n\n$1');
  }

  s = s
    .replace(/([.!?])\s+(\*\*[A-Z][^*]{4,}:\*\*)/g, '$1\n\n$2')
    .replace(/([.!?])\s+(\d+[\.\)]\s+)/g, '$1\n$2')
    .replace(/\n{3,}/g, '\n\n');

  return s.trim();
};

const splitLongParagraphs = (sections = []) => {
  const output = [];

  sections.forEach((section) => {
    if (!section || section.type !== 'paragraph') {
      output.push(section);
      return;
    }

    const text = String(section.content || '').trim();
    if (!text || text.length <= 260) {
      output.push(section);
      return;
    }

    const sentences = text.match(/[^.!?]+[.!?]+/g) || [text];
    let current = '';

    sentences.forEach((sentence) => {
      const trimmed = sentence.trim();
      if (!trimmed) return;
      const next = current ? `${current} ${trimmed}` : trimmed;

      if (next.length > 220 && current) {
        output.push({ type: 'paragraph', content: current.trim() });
        current = trimmed;
      } else {
        current = next;
      }
    });

    if (current) {
      output.push({ type: 'paragraph', content: current.trim() });
    }
  });

  return output;
};

// ... (Sisa kode AnalysisSummaryRenderer sama, pastikan menggunakan <RichText /> di dalam StructuredContent)

const AnalysisSummaryRenderer = ({ summary, findings, overallAssessment }) => {
  const { t } = useLanguage();
  
  const cleanInput = (value) => {
    if (!value) return null;
    if (Array.isArray(value)) {
      const joined = value.filter(Boolean).join('\n');
      return reinsertAnalysisBreaks(cleanAIDentistOutput(joined));
    }
    return reinsertAnalysisBreaks(cleanAIDentistOutput(String(value)));
  };

  const textContent = cleanInput(overallAssessment) || cleanInput(summary) || cleanInput(findings);
  
  if (!textContent) {
    return (
      <div className="text-center py-8 text-secondary">
        {t('dentistPatient.ai.summary.empty') || 'Tidak ada ringkasan analisis'}
      </div>
    );
  }

  const topics = extractAnalysisTopics(textContent);
  
  if (topics.length > 0) {
    return (
      <div className="space-y-6">
        {topics.map((topic, topicIndex) => (
          <div key={topicIndex} className="bg-surface/50 rounded-lg p-1">
            <h4 className="text-base font-bold text-primary border-b border-primary/10 pb-2 mb-3">
              <RichText text={topic.title} />
            </h4>
            <StructuredContent content={splitLongParagraphs(parseTextWithLists(reinsertAnalysisBreaks(topic.content)))} />
          </div>
        ))}
      </div>
    );
  }

  const sections = splitLongParagraphs(parseTextWithLists(reinsertAnalysisBreaks(textContent)));

  return (
    <div className="space-y-4">
      <StructuredContent content={sections} />
    </div>
  );
};

const StructuredContent = ({ content }) => {
  let normalizedContent = content;
  if (typeof normalizedContent === 'string') {
    normalizedContent = splitLongParagraphs(parseTextWithLists(reinsertAnalysisBreaks(normalizedContent)));
  }
  if (!Array.isArray(normalizedContent)) normalizedContent = [normalizedContent];

  return (
    <>
      {normalizedContent.map((section, idx) => {
        if (!section) return null;

        if (section.type === 'header') {
          return (
            <h5 key={idx} className="text-sm font-bold text-primary mt-4 mb-2">
              <RichText text={section.content} />
            </h5>
          );
        }

        if (section.type === 'paragraph') {
          return (
            <p key={idx} className="text-sm text-primary leading-[1.85] text-left mb-3 last:mb-0">
              <RichText text={section.content} />
            </p>
          );
        }

        if (section.type === 'list') {
          return (
            <ul key={idx} className="space-y-2.5 mb-3 pl-3">
              {section.content.map((item, itemIdx) => (
                <li key={itemIdx} className="text-sm text-primary flex items-start gap-3">
                  <span className="mt-2 w-1.5 h-1.5 bg-primary/60 rounded-full flex-shrink-0" />
                  <span className="leading-[1.75] text-left">
                    <RichText text={item} />
                  </span>
                </li>
              ))}
            </ul>
          );
        }
        return null;
      })}
    </>
  );
};

export default AnalysisSummaryRenderer;