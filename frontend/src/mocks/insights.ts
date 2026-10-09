/* ──────────────────────────────────────────
   Mock data – Insights endpoint
   ────────────────────────────────────────── */
import type { InsightsResponse } from '../types';

export function getMockInsights(): InsightsResponse {
  return {
    kpis: {
      tickets_analyzed: 23746,
      high_critical_pct: 31.4,
      top_category: 'Technical',
      duplicate_rate: 8.7,
    },
    topics: [
      { id: 'tp-1', label: 'Payment & Refund Issues', keywords: ['refund', 'charge', 'payment', 'billing', 'invoice', 'credit'], count: 3412 },
      { id: 'tp-2', label: 'Shipping Delays', keywords: ['shipping', 'delivery', 'tracking', 'delayed', 'transit', 'carrier'], count: 2891 },
      { id: 'tp-3', label: 'Login & Access Problems', keywords: ['login', 'password', 'authentication', 'locked', 'access', '2FA'], count: 2205 },
      { id: 'tp-4', label: 'Product Defects & Bugs', keywords: ['defective', 'broken', 'malfunction', 'error', 'crash', 'firmware'], count: 1987 },
      { id: 'tp-5', label: 'Subscription Management', keywords: ['cancel', 'subscription', 'upgrade', 'downgrade', 'renewal', 'plan'], count: 1456 },
      { id: 'tp-6', label: 'Account & Profile', keywords: ['account', 'profile', 'settings', 'email', 'notification', 'preference'], count: 896 },
    ],
    trends: (() => {
      const topics = ['Payment & Refund Issues', 'Shipping Delays', 'Login & Access Problems', 'Product Defects & Bugs', 'Subscription Management'];
      const dates: string[] = [];
      for (let i = 29; i >= 0; i--) {
        const d = new Date(2026, 8, 8); // Sept 8, 2026 (month before "now")
        d.setDate(d.getDate() + (29 - i));
        dates.push(d.toISOString().slice(0, 10));
      }
      const trends: InsightsResponse['trends'] = [];
      const baseCounts: Record<string, number> = {
        'Payment & Refund Issues': 110,
        'Shipping Delays': 95,
        'Login & Access Problems': 72,
        'Product Defects & Bugs': 65,
        'Subscription Management': 48,
      };
      dates.forEach((date, di) => {
        topics.forEach(topic => {
          const base = baseCounts[topic];
          // Add some realistic variance and a spike for shipping around day 20
          let noise = Math.sin(di * 0.5) * 15 + Math.cos(di * 0.3) * 10;
          if (topic === 'Shipping Delays' && di >= 18 && di <= 23) {
            noise += 80; // spike
          }
          if (topic === 'Login & Access Problems' && di >= 25 && di <= 28) {
            noise += 55; // spike
          }
          trends.push({ date, topic, count: Math.max(10, Math.round(base + noise + (Math.random() * 20 - 10))) });
        });
      });
      return trends;
    })(),
    spikes: [
      { topic: 'Shipping Delays', date: '2026-10-01', increase_pct: 84 },
      { topic: 'Login & Access Problems', date: '2026-10-05', increase_pct: 72 },
      { topic: 'Payment & Refund Issues', date: '2026-09-28', increase_pct: 35 },
    ],
    keywords: [
      { word: 'refund', count: 2841, category: 'Billing and Payments' },
      { word: 'return', count: 2456, category: 'Returns and Exchanges' },
      { word: 'password', count: 1892, category: 'IT Support' },
      { word: 'exchange', count: 1756, category: 'Returns and Exchanges' },
      { word: 'charged', count: 1654, category: 'Billing and Payments' },
      { word: 'login', count: 1543, category: 'IT Support' },
      { word: 'error', count: 1432, category: 'Technical Support' },
      { word: 'cancel', count: 1321, category: 'Customer Service' },
      { word: 'shipping', count: 1210, category: 'Customer Service' },
      { word: 'defective', count: 1098, category: 'Technical Support' },
      { word: 'payment', count: 987, category: 'Billing and Payments' },
      { word: 'account', count: 945, category: 'Customer Service' },
      { word: 'hardware', count: 876, category: 'Product Support' },
      { word: 'setup', count: 834, category: 'Product Support' },
      { word: 'invoice', count: 765, category: 'Billing and Payments' },
      { word: 'crash', count: 654, category: 'Technical Support' },
      { word: 'warranty', count: 623, category: 'Product Support' },
      { word: 'reset', count: 598, category: 'IT Support' },
      { word: 'broken', count: 543, category: 'Technical Support' },
      { word: 'installation', count: 487, category: 'Product Support' },
      { word: 'duplicate', count: 456, category: 'Billing and Payments' },
      { word: 'access', count: 432, category: 'Technical' },
      { word: 'firmware', count: 398, category: 'Technical' },
      { word: 'replacement', count: 345, category: 'Returns and Exchanges' },
      { word: 'order', count: 312, category: 'Customer Service' },
    ],
    category_distribution: [
      { category: 'Technical', count: 15519 },
      { category: 'Customer Service', count: 4636 },
      { category: 'Billing and Payments', count: 2418 },
      { category: 'Returns and Exchanges', count: 1173 },
    ],
    urgency_distribution: [
      { urgency: 'Low', count: 3854 },
      { urgency: 'Medium', count: 4521 },
      { urgency: 'High', count: 2987 },
      { urgency: 'Critical', count: 1485 },
    ],
  };
}
