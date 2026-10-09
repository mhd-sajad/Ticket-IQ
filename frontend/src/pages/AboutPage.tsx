/* ──────────────────────────────────────────
   About Page – VOID-Inspired Heart Disease Design System
   ────────────────────────────────────────── */
import { Card, PageHeader } from '../components/ui';

const NLP_TECHNIQUES = [
  { name: 'Text Normalization', desc: 'Lowercasing, regex sanitization, and whitespace collapsing to eliminate lexical noise.' },
  { name: 'Tokenization', desc: 'Precompiled regex token extraction preserving domain patterns (#ORD-123, $149.99, E-4012).' },
  { name: 'Stop Word Removal', desc: 'Filtered standard vocabulary while explicitly retaining negation terms (not, cant, dont).' },
  { name: 'Lemmatization', desc: 'Morphological root reduction via lean spaCy tagger with parser and NER disabled.' },
  { name: 'TF-IDF Vectorization', desc: 'Term Frequency–Inverse Document Frequency feature weighting capturing discriminative unigrams and bigrams.' },
  { name: 'Sparse Dot Product', desc: 'L2-normalized sparse matrix cosine similarity (16.6k tickets) executed in < 2ms without ONNX runtime.' },
  { name: 'Regex Named Entities', desc: 'High-speed precompiled extraction for ORDER_ID, AMOUNT, ERROR_CODE, DATE, and EMAIL.' },
  { name: 'Sentiment Analysis', desc: 'Lexicon polarity scoring quantifying customer grievance and frustration intensity.' },
  { name: 'Topic Grouping', desc: 'Predefined keyword-rule clusters discovering recurring issues (trained NMF model planned).' },
  { name: 'Active Learning Retrain', desc: 'Automated feedback ingestion retraining pipeline with test-set regression gates.' },
];

const TECH_STACK = [
  { category: 'Frontend Architecture', items: ['React 19', 'TypeScript', 'Vite', 'Tailwind CSS', 'Recharts', 'VOID Design System'] },
  { category: 'Machine Learning', items: ['scikit-learn', 'SciPy Sparse CSR', 'spaCy en_core_web_sm', 'NLTK VADER'] },
  { category: 'Backend Engine', items: ['Python 3.11', 'FastAPI', 'Uvicorn', 'Pydantic v2', 'Joblib'] },
  { category: 'Hosting & Deployment', items: ['Docker (< 350 MB RAM)', 'Vercel (Frontend)', 'Render / Spaces (Backend)'] },
];

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-8 pb-12">
      <PageHeader
        eyebrow="SYSTEM ARCHITECTURE"
        title="ABOUT TICKETIQ & ARCHITECTURAL OVERVIEW"
        description="Comprehensive technical overview of the production NLP triage engine, model choices, and memory optimizations."
      />

      {/* Architecture */}
      <Card className="p-6 lg:p-8 space-y-5">
        <h2 className="font-display text-3xl uppercase tracking-wider text-white">
          INFERENCE PIPELINE & DATA FLOW
        </h2>
        <div className="font-body text-sm text-[#888888] leading-relaxed space-y-4">
          <p>
            TicketIQ is a high-performance NLP system built to automatically triage, prioritize, and retrieve resolutions for customer support inquiries under strict low-memory constraints (&lt; 350 MB RAM). The system processes tickets through a verified invariant pipeline:
          </p>
          <ol className="list-decimal list-inside space-y-2.5 pl-2 text-white/90 font-mono text-xs">
            <li><strong className="text-[#d4f53c]">Preprocessing</strong> — Regex normalization, tokenization, stopword filtering with negation retention, and spaCy lemmatization.</li>
            <li><strong className="text-[#d4f53c]">TF-IDF Sparse Dot Product</strong> — Query vector transformed and multiplied against 16.6k training matrix ($16,622 \times 12,000$) in &lt; 2 ms.</li>
            <li><strong className="text-[#d4f53c]">Dual-Head Classification</strong> — Calibrated Logistic Regression models predict 4-class Category (69.4% Acc, 0.588 F1) and 3-class Urgency (54.7% Acc, 0.531 F1).</li>
            <li><strong className="text-[#d4f53c]">Confidence Gating</strong> — Tickets with Category &lt; 0.50 or Urgency &lt; 0.45 are routed to human reviewers, isolating high-error edge cases.</li>
            <li><strong className="text-[#d4f53c]">Entity Extraction</strong> — Precompiled regex extracts ORDER_ID, AMOUNT, ERROR_CODE, DATE, and EMAIL instantly without heavy NER models.</li>
            <li><strong className="text-[#d4f53c]">Resolution Recommendation</strong> — High-confidence matches ($\ge 0.50$) return cleaned past answers, while moderate matches ($0.40 - 0.50$) display a weak match badge.</li>
          </ol>
        </div>
      </Card>

      {/* Low-Confidence Human Review Routing */}
      <Card className="p-6 lg:p-8 space-y-5">
        <div>
          <h2 className="font-display text-3xl uppercase tracking-wider text-white">
            HUMAN-IN-THE-LOOP CONFIDENCE GATING
          </h2>
          <p className="font-mono text-xs text-[#888888] mt-1">
            Empirical test-set evaluation ($N=2,576$) isolating error-prone tickets for human oversight.
          </p>
        </div>
        <div className="overflow-x-auto bg-[#000000] border border-[#1a1a1a] rounded-xl p-4">
          <table className="w-full text-left font-mono text-xs">
            <thead>
              <tr className="border-b border-[#1a1a1a] text-[#888888]">
                <th className="pb-3 uppercase tracking-wider">Cohort</th>
                <th className="pb-3 uppercase tracking-wider">Volume</th>
                <th className="pb-3 uppercase tracking-wider">Category Acc</th>
                <th className="pb-3 uppercase tracking-wider">Category F1</th>
                <th className="pb-3 uppercase tracking-wider">Urgency Acc</th>
                <th className="pb-3 uppercase tracking-wider">Urgency F1</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1a1a1a]/60">
              <tr className="text-[#d4f53c] font-bold">
                <td className="py-3">Unflagged (Automated)</td>
                <td className="py-3">2,004 (77.8%)</td>
                <td className="py-3">73.85%</td>
                <td className="py-3">0.6297</td>
                <td className="py-3">57.44%</td>
                <td className="py-3">0.5557</td>
              </tr>
              <tr className="text-[#ff8c42]">
                <td className="py-3">Flagged (Review Queue)</td>
                <td className="py-3">572 (22.2%)</td>
                <td className="py-3">53.67%</td>
                <td className="py-3">0.4756</td>
                <td className="py-3">45.28%</td>
                <td className="py-3">0.4416</td>
              </tr>
              <tr className="text-white font-bold border-t border-[#1a1a1a]">
                <td className="py-3">All Test Tickets</td>
                <td className="py-3">2,576 (100%)</td>
                <td className="py-3">69.37%</td>
                <td className="py-3">0.5883</td>
                <td className="py-3">54.74%</td>
                <td className="py-3">0.5314</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* NLP Techniques */}
      <Card className="p-6 lg:p-8 space-y-5">
        <h2 className="font-display text-3xl uppercase tracking-wider text-white">
          NLP TECHNIQUES & ARCHITECTURES
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {NLP_TECHNIQUES.map(t => (
            <div key={t.name} className="rounded-xl border border-[#1a1a1a] bg-[#050505] p-4 hover:border-[#d4f53c]/30 transition-all space-y-1.5">
              <h4 className="font-mono text-xs font-bold uppercase tracking-wider text-[#d4f53c]">{t.name}</h4>
              <p className="font-body text-xs text-[#888888] leading-relaxed">{t.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Tech Stack */}
      <Card className="p-6 lg:p-8 space-y-5">
        <h2 className="font-display text-3xl uppercase tracking-wider text-white">
          ENGINEERING TECH STACK
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {TECH_STACK.map(group => (
            <div key={group.category} className="space-y-2">
              <h4 className="font-mono text-xs uppercase tracking-widest text-[#888888]">// {group.category}</h4>
              <div className="flex flex-wrap gap-2">
                {group.items.map(item => (
                  <span key={item} className="pill-tag !py-1 !px-3">
                    <span className="dot" />
                    <span>{item}</span>
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Links */}
      <Card className="p-6 lg:p-8 space-y-4">
        <h2 className="font-display text-3xl uppercase tracking-wider text-white">SOURCE REPOSITORIES</h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://github.com/mhd-sajad/Ticket-IQ"
            target="_blank"
            rel="noopener noreferrer"
            className="btn-outline !py-2.5 !px-5 !text-xs"
          >
            <svg className="h-4 w-4 mr-2" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
            GITHUB // TICKET-IQ REPOSITORY
          </a>
        </div>
      </Card>
    </div>
  );
}
