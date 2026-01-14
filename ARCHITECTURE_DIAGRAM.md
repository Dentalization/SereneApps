# Architecture Diagram - AI Results Display

## Data Flow Architecture

```
┌─────────────────────────────────────────────────────────────┐
│           BACKEND API RESPONSE (LLM Output)                 │
│                                                              │
│  {                                                           │
│    description: "Terdapat gigi berlubang...[1500 chars]"   │
│    confidence: 0.72 or "72%" or 72                          │
│    findings: "Ketika karies tidak diobati..."               │
│  }                                                           │
└──────────────────────────┬──────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│      transformAIResults() in index.jsx                       │
│      (Line 40-101)                                          │
│                                                              │
│  const normalized = normalizeAIExplanation(r);              │
└──────────────────────────┬──────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│   normalizeAIExplanation() in textFormatting.js             │
│   (Lines 5-71)                                              │
│                                                              │
│  INPUT: rawData = { description, confidence, ... }         │
│                                                              │
│  STEP 1: cleanMarkdownFormatting(text)                      │
│          - Remove ** ** (bold)                              │
│          - Remove * * (italic)                              │
│          - Remove stray asterisks                           │
│          - Remove "0% probability" noise                    │
│          Result: "Terdapat gigi berlubang di..."            │
│                                                              │
│  STEP 2: Extract SUMMARY (first sentence)                  │
│          Regex: /[^.!?]+[.!?]+/                            │
│          Limit: max 150 characters                          │
│          Result: "Terdapat gigi berlubang di..."           │
│                                                              │
│  STEP 3: Split by SEMANTIC MARKERS                         │
│          Pattern: /^([^:]+?):\s*(.+?)(?=^[^:]+?:|$)/gsm   │
│          Splits on: "Header: content"                       │
│          Result: [                                          │
│            { title: "Mengenai", content: "..." },           │
│            { title: "Perawatan", content: "..." }           │
│          ]                                                  │
│                                                              │
│  OUTPUT: {                                                  │
│    summary: "SHORT 1-2 sentences",                          │
│    explanation: "FULL cleaned text",                        │
│    sections: [{ title, content }, ...],                     │
│    confidence: 72 (normalized to 0-100)                     │
│  }                                                          │
└──────────────────────────┬──────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│    Create Diagnosis Object (index.jsx, Line 48-58)          │
│                                                              │
│  {                                                           │
│    condition: "Hasil Analisis AI",                          │
│    description: normalized.summary,   ← SHORT ✅            │
│    details: normalized.explanation,   ← FULL ✅             │
│    probability: normalized.confidence,← CLEAN ✅            │
│    severity: null,                                          │
│    sections: normalized.sections      ← ORGANIZED ✅        │
│  }                                                          │
└──────────────────────────┬──────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│   PatientAIResult Component (PatientAIResult.jsx)           │
│                                                              │
│   Tabs:                                                      │
│   ┌─────────────────────────────────────────────────────┐   │
│   │ 📝 Summary | 📖 Explanation | 🔍 Diagnosis | ...   │   │
│   └──────────┬──────────────────┬────────────────────────┘   │
│              ↓                  ↓                            │
│        ┌──────────────┐   ┌──────────────────────┐         │
│        │ Summary Tab  │   │ Explanation Tab      │         │
│        │              │   │                      │         │
│        │ diagnosis[0] │   │ Render sections:     │         │
│        │ .description │   │                      │         │
│        │              │   │ 🔹 Mengenai...       │         │
│        │ SHORT 150ch  │   │ 🔹 Penyebab...       │         │
│        │              │   │ 🔹 Perawatan...      │         │
│        │ CARD VIEW ✅  │   │                      │         │
│        │              │   │ FULL DETAIL VIEW ✅   │         │
│        └──────────────┘   └──────────────────────┘         │
└─────────────────────────────────────────────────────────────┘
                          ↓
┌─────────────────────────────────────────────────────────────┐
│              BROWSER UI DISPLAY                              │
│                                                              │
│  ╔═══════════════════════════════════════════════════╗     │
│  ║  Hasil Analisis Gigi                    72% 🟢    ║     │
│  ╠═════════════════════════════════════════════════════╣     │
│  ║ 📝 Summary │ 📖 Explanation │ 🔍 Diagnosis │       ║     │
│  ╠═════════════════════════════════════════════════════╣     │
│  ║                                                      ║     │
│  ║  Terdapat gigi berlubang di molar kedua atas.      ║     │
│  ║                                                      ║     │
│  ╚═════════════════════════════════════════════════════╝     │
│                                                              │
│  TAB SWITCH → Explanation Tab                              │
│                                                              │
│  ╔═════════════════════════════════════════════════════╗   │
│  ║  Penjelasan Lengkap Analisis                        ║   │
│  ║  ─────────────────────────────────────────────────  ║   │
│  ║                                                      ║   │
│  ║  MENGENAI GIGI BERLUBANG                            ║   │
│  ║  ────────────────────────────                       ║   │
│  ║  Gigi berlubang adalah kondisi di mana terjadi      ║   │
│  ║  kerusakan pada struktur gigi yang disebabkan       ║   │
│  ║  oleh proses demineralisasi yang progresif...       ║   │
│  ║                                                      ║   │
│  ║  PENYEBAB                                            ║   │
│  ║  ─────────                                          ║   │
│  ║  Karies gigi terjadi ketika asam dari bakteri       ║   │
│  ║  mulut menyerang permukaan gigi...                  ║   │
│  ║                                                      ║   │
│  ║  PERAWATAN DIREKOMENDASIKAN                         ║   │
│  ║  ─────────────────────────────                      ║   │
│  ║  Perawatan untuk gigi berlubang tergantung pada     ║   │
│  ║  tingkat keparahan dan lokasi kerusakan...          ║   │
│  ║                                                      ║   │
│  ╚═════════════════════════════════════════════════════╝   │
└─────────────────────────────────────────────────────────────┘
```

## Component Interaction Model

```
PatientManagement (index.jsx)
    ↓
    ├─ transformAIResults()
    │  ├─ normalizeAIExplanation(rawData)
    │  │  ├─ cleanMarkdownFormatting(text) ✅
    │  │  └─ Extract sections by regex pattern ✅
    │  └─ Create diagnosis with summary/explanation/sections ✅
    │
    └─ setState({ diagnosis, confidence, ... })
         ↓
    PatientAIResult Component
         ├─ Display tabs: Summary | Explanation | Diagnosis
         ├─ Summary Tab: Shows diagnosis[0].description (SHORT)
         ├─ Explanation Tab: Renders diagnosis[0].sections (FULL)
         └─ Diagnosis Tab: Shows all diagnosis items
```

## Key Improvements

### ✅ Text Processing
- Input: 1500+ character LLM essay
- Output: 
  - Summary: 150 characters (clean, focused)
  - Explanation: Full text organized by sections
  - Sections: Array of {title, content} pairs

### ✅ Confidence Handling
- Input: May be decimal (0.72), string ("72%"), or number (72)
- Processing: Normalized to 0-100 percentage
- Output: Always 0-100 (e.g., 72)

### ✅ Data Architecture
- Card displays: Summary only (professional, clean)
- Detail tab: Full explanation (organized by sections)
- No more "essay in card" problem

### ✅ UI/UX
- Summary tab: Card-friendly (short, scannable)
- Explanation tab: Professional detail view
- Proper semantic organization
- Text-justified formatting
- Section separators
