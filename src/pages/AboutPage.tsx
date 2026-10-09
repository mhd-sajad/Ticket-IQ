/* ──────────────────────────────────────────
   About Page
   ────────────────────────────────────────── */
import { Card, PageHeader } from '../components/ui';

const NLP_TECHNIQUES = [
  { name: 'Text Normalization', desc: 'Lowercasing, punctuation removal, and character standardization to reduce noise.' },
  { name: 'Tokenization', desc: 'Splitting text into individual tokens for feature extraction.' },
  { name: 'Stop Word Removal', desc: 'Filtering common words (the, is, and…) that don\'t carry discriminative meaning.' },
  { name: 'Lemmatization', desc: 'Reducing words to base/dictionary forms (running → run) for better generalization.' },
  { name: 'TF-IDF Vectorization', desc: 'Term Frequency–Inverse Document Frequency weighting to capture word importance.' },
  { name: 'Sentence Embeddings', desc: 'Dense vector representations capturing semantic meaning of entire sentences.' },
  { name: 'Named Entity Recognition', desc: 'Extracting structured entities like order IDs, products, dates, and amounts.' },
  { name: 'Sentiment Analysis', desc: 'Scoring customer frustration/satisfaction levels from ticket text.' },
  { name: 'Topic Modeling', desc: 'Unsupervised clustering to discover recurring themes across tickets.' },
  { name: 'Cosine Similarity', desc: 'Measuring ticket similarity for duplicate detection and resolution suggestions.' },
];

const TECH_STACK = [
  { category: 'Frontend', items: ['React 19', 'TypeScript', 'Vite', 'Tailwind CSS', 'Recharts', 'React Router'] },
  { category: 'NLP / ML', items: ['scikit-learn', 'spaCy', 'sentence-transformers', 'NLTK'] },
  { category: 'Backend', items: ['Python', 'FastAPI', 'PostgreSQL', 'Redis'] },
  { category: 'DevOps', items: ['Docker', 'Vercel (frontend)', 'Railway (backend)'] },
];

export default function AboutPage() {
  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader title="About TicketIQ" description="NLP-powered support ticket triage — architecture, techniques, and technology." />

      {/* Architecture */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Architecture</h2>
        <div className="text-sm text-slate-600 dark:text-slate-300 leading-relaxed space-y-3">
          <p>
            TicketIQ is a full-stack application that combines classical NLP techniques with modern machine learning to automatically triage customer support tickets. The system ingests raw ticket text and runs it through a multi-stage pipeline:
          </p>
          <ol className="list-decimal list-inside space-y-2 pl-2">
            <li><strong>Preprocessing</strong> — Text is normalized, tokenized, and lemmatized to create clean feature inputs.</li>
            <li><strong>Feature Extraction</strong> — Multiple representations are generated: Bag of Words, TF-IDF vectors, and sentence embeddings.</li>
            <li><strong>Classification</strong> — An ensemble of models (Logistic Regression, SVM, Naive Bayes) vote on category and urgency.</li>
            <li><strong>Entity Extraction</strong> — Named entities (order IDs, products, amounts, dates, error codes) are identified and highlighted.</li>
            <li><strong>Similarity Search</strong> — The ticket is compared against resolved tickets using cosine similarity on embeddings.</li>
            <li><strong>Explanation</strong> — Feature importance weights show which words drove the prediction, enabling transparency.</li>
          </ol>
          <p>
            The feedback loop allows agents to correct predictions, which are queued for model retraining — enabling continuous improvement.
          </p>
        </div>
      </Card>

      {/* Low-Confidence Human Review Routing */}
      <Card className="p-6 space-y-4">
        <div>
          <h2 className="text-lg font-bold text-slate-800 dark:text-white">Human-in-the-Loop Confidence Routing</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Thresholds calibrated on validation data (Category &lt; 0.50 or Urgency &lt; 0.45) route ambiguous predictions to the Review Queue while auto-approving high-confidence tickets.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="border-b border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400">
                <th className="pb-2 font-semibold">Cohort</th>
                <th className="pb-2 font-semibold">Volume</th>
                <th className="pb-2 font-semibold">Category Acc</th>
                <th className="pb-2 font-semibold">Category Macro F1</th>
                <th className="pb-2 font-semibold">Urgency Acc</th>
                <th className="pb-2 font-semibold">Urgency Macro F1</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800 font-mono">
              <tr className="text-emerald-600 dark:text-emerald-400 font-semibold">
                <td className="py-2 font-sans">Unflagged (Automated)</td>
                <td className="py-2">2,004 (77.8%)</td>
                <td className="py-2">73.85%</td>
                <td className="py-2">0.6297</td>
                <td className="py-2">57.44%</td>
                <td className="py-2">0.5557</td>
              </tr>
              <tr className="text-amber-600 dark:text-amber-400">
                <td className="py-2 font-sans">Flagged (Review Queue)</td>
                <td className="py-2">572 (22.2%)</td>
                <td className="py-2">53.67%</td>
                <td className="py-2">0.4756</td>
                <td className="py-2">45.28%</td>
                <td className="py-2">0.4416</td>
              </tr>
              <tr className="text-slate-700 dark:text-slate-300 font-semibold border-t border-slate-200 dark:border-slate-700">
                <td className="py-2 font-sans">All Test Tickets</td>
                <td className="py-2">2,576 (100%)</td>
                <td className="py-2">69.37%</td>
                <td className="py-2">0.5883</td>
                <td className="py-2">54.74%</td>
                <td className="py-2">0.5314</td>
              </tr>
            </tbody>
          </table>
        </div>
      </Card>

      {/* NLP Techniques */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">NLP Techniques Used</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {NLP_TECHNIQUES.map(t => (
            <div key={t.name} className="rounded-lg border border-slate-100 dark:border-slate-700/40 p-3 hover:border-indigo-200 dark:hover:border-indigo-800/50 transition-colors">
              <h4 className="text-sm font-semibold text-indigo-600 dark:text-indigo-400">{t.name}</h4>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{t.desc}</p>
            </div>
          ))}
        </div>
      </Card>

      {/* Tech Stack */}
      <Card className="p-6 space-y-4">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Tech Stack</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {TECH_STACK.map(group => (
            <div key={group.category}>
              <h4 className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-2">{group.category}</h4>
              <div className="flex flex-wrap gap-1.5">
                {group.items.map(item => (
                  <span key={item} className="rounded-full bg-slate-100 dark:bg-slate-700/60 px-2.5 py-1 text-xs font-medium text-slate-600 dark:text-slate-300">
                    {item}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {/* Links */}
      <Card className="p-6 space-y-3">
        <h2 className="text-lg font-bold text-slate-800 dark:text-white">Links</h2>
        <div className="flex flex-wrap gap-3">
          <a
            href="https://github.com/username/ticketiq"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
            Frontend Repository
          </a>
          <a
            href="https://github.com/username/ticketiq-api"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-200 dark:border-slate-600 px-4 py-2 text-sm font-medium text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/40 transition-colors"
          >
            <svg className="h-5 w-5" fill="currentColor" viewBox="0 0 24 24"><path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" /></svg>
            Backend / ML Repository
          </a>
        </div>
      </Card>

      <p className="text-center text-xs text-slate-400 dark:text-slate-600 pb-4">
        Built with ❤️ as a portfolio showcase project. All mock data is synthetic.
      </p>
    </div>
  );
}
