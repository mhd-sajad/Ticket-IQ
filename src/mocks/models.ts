/* ──────────────────────────────────────────
   Mock data – Models endpoint
   ────────────────────────────────────────── */
import type { ModelsResponse, ModelPredictResponse } from '../types';

const LABELS = ['Technical', 'Customer Service', 'Billing and Payments', 'Returns and Exchanges'];

export function getMockModels(): ModelsResponse {
  const models = [
    { name: 'TF-IDF + Logistic Regression', accuracy: 0.694, precision: 0.621, recall: 0.588, f1: 0.588 },
    { name: 'TF-IDF + Linear SVM', accuracy: 0.741, precision: 0.652, recall: 0.532, f1: 0.532 },
    { name: 'TF-IDF + Naive Bayes', accuracy: 0.612, precision: 0.542, recall: 0.478, f1: 0.485 },
    { name: 'MiniLM + Logistic Regression', accuracy: 0.538, precision: 0.495, recall: 0.461, f1: 0.458 },
    { name: 'MiniLM + Linear SVM', accuracy: 0.562, precision: 0.512, recall: 0.473, f1: 0.471 },
  ];

  const confusion_matrices: ModelsResponse['confusion_matrices'] = {};
  const per_class: ModelsResponse['per_class'] = {};

  models.forEach(m => {
    const n = LABELS.length;
    const accuracy = m.accuracy;
    const matrix: number[][] = [];
    for (let i = 0; i < n; i++) {
      const row: number[] = [];
      const total = 180 + Math.floor(Math.random() * 40);
      const correct = Math.floor(total * (accuracy + (Math.random() - 0.5) * 0.08));
      const remaining = total - correct;
      for (let j = 0; j < n; j++) {
        if (i === j) {
          row.push(correct);
        } else {
          row.push(Math.max(1, Math.floor(remaining / (n - 1) + (Math.random() - 0.5) * 5)));
        }
      }
      matrix.push(row);
    }
    confusion_matrices[m.name] = { labels: LABELS, matrix };

    per_class[m.name] = LABELS.map(label => {
      const base = m.f1;
      const variance = (Math.random() - 0.5) * 0.1;
      return {
        label,
        precision: Math.min(0.99, Math.max(0.55, base + variance + (Math.random() - 0.5) * 0.04)),
        recall: Math.min(0.99, Math.max(0.55, base + variance + (Math.random() - 0.5) * 0.04)),
        f1: Math.min(0.99, Math.max(0.55, base + variance)),
      };
    });
  });

  return { models, confusion_matrices, per_class };
}

export function getMockModelPredict(_model: string, _text: string): ModelPredictResponse {
  const categories = ['Technical', 'Customer Service', 'Billing and Payments', 'Returns and Exchanges'];
  const hash = _text.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const modelIdx = ['TF-IDF + Logistic Regression', 'TF-IDF + Linear SVM', 'TF-IDF + Naive Bayes', 'MiniLM + Logistic Regression', 'MiniLM + Linear SVM'].indexOf(_model);
  const idx = (hash + modelIdx) % categories.length;
  const baseConf = [0.72, 0.82, 0.85, 0.68, 0.91];
  return {
    category: categories[idx],
    confidence: baseConf[modelIdx >= 0 ? modelIdx : 0] + (hash % 8) / 100,
  };
}
