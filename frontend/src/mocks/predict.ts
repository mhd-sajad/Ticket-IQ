/* ──────────────────────────────────────────
   Mock data – Prediction endpoint
   ────────────────────────────────────────── */
import type { PredictionResponse } from '../types';

export const SAMPLE_TICKETS = [
  `I placed order #ORD-29481 on Sept 15 for a MacBook Pro 16" ($2,499.00) and it still shows "processing" after 3 weeks. I've contacted support twice already with no resolution. This is extremely frustrating — I need this laptop for work and the delay is costing me money. Error code E-4012 appeared when I tried to track the shipment.`,

  `Hi, I can't log into my account since yesterday. I keep getting error ERR_AUTH_503 when I enter my password. I've tried resetting my password 3 times but the reset email never arrives. My account email is john@example.com. This is urgent because I have a subscription renewal on Oct 1 and I need to update my payment method.`,

  `I was charged $149.99 twice for order #ORD-38712 placed on Oct 2. My bank statement shows two identical transactions. I'd like a refund for the duplicate charge. The product (Wireless Noise-Cancelling Headphones) hasn't even shipped yet. Please resolve this ASAP as it's putting me over my credit limit.`,

  `The SmartHome Hub Pro I received is defective — it keeps disconnecting from WiFi every 10–15 minutes and shows error code HW-ERR-7291. I've tried factory reset, firmware update to v3.2.1, and switching WiFi channels. Nothing works. Order #ORD-44210, purchased on Aug 28 for $199.00. I want a replacement or full refund.`,

  `I need to cancel my Premium subscription ($29.99/month) effective immediately. I've been trying to find the cancellation option in my account settings but there's no button. I also want a prorated refund for this month since I'm only 5 days in. My account ID is ACC-8834. Please confirm cancellation by email.`,
];

const makePrediction = (text: string, index: number): PredictionResponse => {
  const predictions: Omit<PredictionResponse, 'needs_review'>[] = [
    {
      category: 'Customer Service',
      category_confidence: 0.91,
      urgency: 'High',
      urgency_confidence: 0.87,
      sentiment: { label: 'negative', score: 0.82 },
      entities: [
        { text: '#ORD-29481', label: 'ORDER_ID', start: 16, end: 26 },
        { text: 'Sept 15', label: 'DATE', start: 30, end: 37 },
        { text: 'support@brand.com', label: 'EMAIL', start: 44, end: 61 },
        { text: '$2,499.00', label: 'AMOUNT', start: 61, end: 70 },
        { text: 'E-4012', label: 'ERROR_CODE', start: 294, end: 300 },
      ],
      explanation: {
        category: [
          { word: 'shipment', weight: 0.42 },
          { word: 'track', weight: 0.35 },
          { word: 'processing', weight: 0.31 },
          { word: 'order', weight: 0.28 },
          { word: 'delay', weight: 0.22 },
          { word: 'shipped', weight: 0.18 },
          { word: 'weeks', weight: 0.12 },
          { word: 'contacted', weight: -0.05 },
          { word: 'frustrating', weight: -0.08 },
          { word: 'laptop', weight: -0.15 },
        ],
        urgency: [
          { word: 'extremely', weight: 0.45 },
          { word: 'frustrating', weight: 0.38 },
          { word: 'costing', weight: 0.32 },
          { word: 'no resolution', weight: 0.29 },
          { word: 'weeks', weight: 0.25 },
          { word: 'twice', weight: 0.18 },
          { word: 'need', weight: 0.15 },
          { word: 'work', weight: 0.10 },
          { word: 'order', weight: -0.04 },
          { word: 'MacBook', weight: -0.12 },
        ],
      },
      similar_tickets: [
        { id: 'TK-1201', text: 'My order has been stuck in processing for 2 weeks, no tracking update.', similarity: 0.92, category: 'Customer Service', resolution: 'Escalated to fulfillment team. Expedited shipping applied with next-day delivery. Customer received $50 credit.' },
        { id: 'TK-1089', text: 'Order placed 10 days ago still shows processing. Error when checking status.', similarity: 0.88, category: 'Customer Service', resolution: 'Warehouse backlog identified. Order prioritized and shipped within 24 hours.' },
        { id: 'TK-0934', text: 'Tracking not updating for my laptop order, been over a week.', similarity: 0.79, category: 'Customer Service', resolution: 'Carrier issue found. Re-shipped item via express. Refunded shipping cost.' },
        { id: 'TK-0811', text: 'Still waiting for my electronics order after 3 weeks, very unhappy.', similarity: 0.74, category: 'Customer Service', resolution: 'Full refund issued and replacement order created with priority shipping.' },
        { id: 'TK-0723', text: 'Expensive item stuck in transit for weeks, need it urgently for work.', similarity: 0.68, category: 'Customer Service', resolution: 'Contacted carrier directly. Delivery rescheduled within 48 hours.' },
      ],
      suggested_resolution: 'Based on similar resolved tickets: Escalate to fulfillment team immediately. Apply expedited/priority shipping. Issue a $50 store credit for the inconvenience. If the item cannot be shipped within 48 hours, offer a full refund and create a replacement order with express delivery. Investigate error code E-4012 with the engineering team.',
      pipeline: {
        raw: text,
        normalized: text.toLowerCase().replace(/[^\w\s#\-$.@]/g, ''),
        tokens: ['placed', 'order', '#ord-29481', 'sept', '15', 'macbook', 'pro', '16', '$2499.00', 'still', 'shows', 'processing', 'after', '3', 'weeks', 'contacted', 'support', 'twice', 'already', 'no', 'resolution', 'extremely', 'frustrating', 'need', 'laptop', 'work', 'delay', 'costing', 'money', 'error', 'code', 'e-4012', 'appeared', 'tried', 'track', 'shipment'],
        without_stopwords: ['placed', 'order', '#ord-29481', 'sept', '15', 'macbook', 'pro', '16', '$2499.00', 'shows', 'processing', '3', 'weeks', 'contacted', 'support', 'twice', 'resolution', 'extremely', 'frustrating', 'need', 'laptop', 'work', 'delay', 'costing', 'money', 'error', 'code', 'e-4012', 'appeared', 'tried', 'track', 'shipment'],
        lemmas: ['place', 'order', '#ord-29481', 'sept', '15', 'macbook', 'pro', '16', '$2499.00', 'show', 'process', '3', 'week', 'contact', 'support', 'twice', 'resolution', 'extreme', 'frustrate', 'need', 'laptop', 'work', 'delay', 'cost', 'money', 'error', 'code', 'e-4012', 'appear', 'try', 'track', 'shipment'],
      },
      ticket_id: 'TK-2948',
    },
    {
      category: 'Technical',
      category_confidence: 0.94,
      urgency: 'High',
      urgency_confidence: 0.82,
      sentiment: { label: 'negative', score: 0.65 },
      entities: [
        { text: 'ERR_AUTH_503', label: 'ERROR_CODE', start: 72, end: 84 },
        { text: 'Oct 1', label: 'DATE', start: 231, end: 236 },
      ],
      explanation: {
        category: [
          { word: 'log', weight: 0.48 },
          { word: 'password', weight: 0.42 },
          { word: 'account', weight: 0.35 },
          { word: 'auth', weight: 0.32 },
          { word: 'reset', weight: 0.28 },
          { word: 'email', weight: 0.20 },
          { word: 'login', weight: 0.18 },
          { word: 'subscription', weight: -0.10 },
          { word: 'payment', weight: -0.15 },
          { word: 'renewal', weight: -0.18 },
        ],
        urgency: [
          { word: 'urgent', weight: 0.52 },
          { word: 'never arrives', weight: 0.35 },
          { word: '3 times', weight: 0.28 },
          { word: 'can\'t', weight: 0.22 },
          { word: 'need', weight: 0.18 },
          { word: 'renewal', weight: 0.15 },
          { word: 'update', weight: 0.10 },
          { word: 'yesterday', weight: 0.08 },
          { word: 'email', weight: -0.05 },
          { word: 'method', weight: -0.10 },
        ],
      },
      similar_tickets: [
        { id: 'TK-2201', text: 'Cannot access my account, password reset not working, getting auth errors.', similarity: 0.93, category: 'Technical', resolution: 'Account unlocked manually. Password reset link sent directly. Auth service cache cleared.' },
        { id: 'TK-2105', text: 'Locked out of my account after multiple failed login attempts.', similarity: 0.86, category: 'Technical', resolution: 'Account lockout timer reset. Temporary password provided via verified phone number.' },
        { id: 'TK-1998', text: 'Error 503 when trying to login, happening since this morning.', similarity: 0.81, category: 'Technical', resolution: 'Server-side auth service was experiencing high load. Issue resolved after service restart.' },
        { id: 'TK-1887', text: 'Password reset emails are not being delivered to my inbox.', similarity: 0.76, category: 'Technical', resolution: 'Email was being caught by spam filter. Added to whitelist. Reset email resent successfully.' },
        { id: 'TK-1790', text: 'Cannot login and I have an urgent payment due soon.', similarity: 0.71, category: 'Technical', resolution: 'Prioritized account recovery. Extended payment deadline by 7 days.' },
      ],
      suggested_resolution: 'Immediately unlock the account and clear any auth service caches. Send a direct password reset link (bypassing normal email flow). Check if reset emails are being caught by spam filters. If ERR_AUTH_503 persists, escalate to engineering — may be a server-side auth service issue. Extend the subscription renewal deadline to give the customer time.',
      pipeline: {
        raw: text,
        normalized: text.toLowerCase().replace(/[^\w\s#\-$.@]/g, ''),
        tokens: ['cant', 'log', 'into', 'account', 'since', 'yesterday', 'getting', 'error', 'err_auth_503', 'enter', 'password', 'tried', 'resetting', 'password', '3', 'times', 'reset', 'email', 'never', 'arrives', 'account', 'email', 'urgent', 'subscription', 'renewal', 'oct', '1', 'need', 'update', 'payment', 'method'],
        without_stopwords: ['cant', 'log', 'account', 'yesterday', 'getting', 'error', 'err_auth_503', 'enter', 'password', 'tried', 'resetting', 'password', '3', 'times', 'reset', 'email', 'never', 'arrives', 'account', 'email', 'urgent', 'subscription', 'renewal', 'oct', '1', 'need', 'update', 'payment', 'method'],
        lemmas: ['cant', 'log', 'account', 'yesterday', 'get', 'error', 'err_auth_503', 'enter', 'password', 'try', 'reset', 'password', '3', 'time', 'reset', 'email', 'never', 'arrive', 'account', 'email', 'urgent', 'subscription', 'renewal', 'oct', '1', 'need', 'update', 'payment', 'method'],
      },
      ticket_id: 'TK-3011',
    },
    {
      category: 'Billing and Payments',
      category_confidence: 0.96,
      urgency: 'Critical',
      urgency_confidence: 0.91,
      sentiment: { label: 'negative', score: 0.78 },
      entities: [
        { text: '$149.99', label: 'AMOUNT', start: 14, end: 21 },
        { text: 'billing@service.com', label: 'EMAIL', start: 135, end: 154 },
      ],
      explanation: {
        category: [
          { word: 'charged', weight: 0.50 },
          { word: 'refund', weight: 0.45 },
          { word: 'transactions', weight: 0.38 },
          { word: 'duplicate', weight: 0.32 },
          { word: 'bank', weight: 0.28 },
          { word: 'credit', weight: 0.22 },
          { word: 'payment', weight: 0.18 },
          { word: '$149.99', weight: 0.15 },
          { word: 'shipped', weight: -0.08 },
          { word: 'product', weight: -0.12 },
        ],
        urgency: [
          { word: 'credit limit', weight: 0.55 },
          { word: 'ASAP', weight: 0.48 },
          { word: 'twice', weight: 0.35 },
          { word: 'duplicate', weight: 0.28 },
          { word: 'charged', weight: 0.20 },
          { word: 'refund', weight: 0.15 },
          { word: 'bank', weight: 0.12 },
          { word: 'statement', weight: 0.08 },
          { word: 'order', weight: -0.05 },
          { word: 'headphones', weight: -0.10 },
        ],
      },
      similar_tickets: [
        { id: 'TK-3301', text: 'Double charged for my order, need immediate refund.', similarity: 0.95, category: 'Billing and Payments', resolution: 'Duplicate charge confirmed. Refund processed within 24 hours. $25 credit applied.' },
        { id: 'TK-3198', text: 'My credit card was charged twice for the same purchase.', similarity: 0.91, category: 'Billing and Payments', resolution: 'Payment gateway issue identified. Refund initiated. Customer notified via email.' },
        { id: 'TK-3050', text: 'I see two identical charges on my bank statement for one order.', similarity: 0.87, category: 'Billing and Payments', resolution: 'Escalated to payment team. Refund processed in 2 business days.' },
        { id: 'TK-2911', text: 'Overcharged for my order, the amount is wrong.', similarity: 0.72, category: 'Billing and Payments', resolution: 'Price discrepancy confirmed. Partial refund issued for the difference.' },
        { id: 'TK-2800', text: 'Billing error on my account, charged for something I didn\'t buy.', similarity: 0.65, category: 'Billing and Payments', resolution: 'Unauthorized charge investigated. Full refund issued. Security review initiated.' },
      ],
      suggested_resolution: 'Process an immediate refund for the duplicate charge of $149.99. This is critical as the customer reports being over their credit limit. Investigate the payment gateway for the duplicate transaction on order #ORD-38712. Apply a $25 goodwill credit. Notify the customer via email once the refund is processed (typically 2-3 business days).',
      pipeline: {
        raw: text,
        normalized: text.toLowerCase().replace(/[^\w\s#\-$.@]/g, ''),
        tokens: ['charged', '$149.99', 'twice', 'order', '#ord-38712', 'placed', 'oct', '2', 'bank', 'statement', 'shows', 'two', 'identical', 'transactions', 'refund', 'duplicate', 'charge', 'product', 'wireless', 'noise-cancelling', 'headphones', 'shipped', 'resolve', 'asap', 'credit', 'limit'],
        without_stopwords: ['charged', '$149.99', 'twice', 'order', '#ord-38712', 'placed', 'oct', '2', 'bank', 'statement', 'shows', 'identical', 'transactions', 'refund', 'duplicate', 'charge', 'product', 'wireless', 'noise-cancelling', 'headphones', 'shipped', 'resolve', 'asap', 'credit', 'limit'],
        lemmas: ['charge', '$149.99', 'twice', 'order', '#ord-38712', 'place', 'oct', '2', 'bank', 'statement', 'show', 'identical', 'transaction', 'refund', 'duplicate', 'charge', 'product', 'wireless', 'noise-cancel', 'headphone', 'ship', 'resolve', 'asap', 'credit', 'limit'],
      },
      ticket_id: 'TK-3871',
    },
    {
      category: 'Technical',
      category_confidence: 0.89,
      urgency: 'Medium',
      urgency_confidence: 0.76,
      sentiment: { label: 'negative', score: 0.58 },
      entities: [
        { text: 'support@iot.net', label: 'EMAIL', start: 4, end: 19 },
        { text: 'HW-ERR-7291', label: 'ERROR_CODE', start: 97, end: 109 },
        { text: 'v3.2.1', label: 'ERROR_CODE', start: 162, end: 168 },
        { text: '#ORD-44210', label: 'ORDER_ID', start: 207, end: 217 },
        { text: 'Aug 28', label: 'DATE', start: 232, end: 238 },
        { text: '$199.00', label: 'AMOUNT', start: 243, end: 250 },
      ],
      explanation: {
        category: [
          { word: 'defective', weight: 0.45 },
          { word: 'disconnecting', weight: 0.40 },
          { word: 'error code', weight: 0.35 },
          { word: 'firmware', weight: 0.30 },
          { word: 'factory reset', weight: 0.25 },
          { word: 'WiFi', weight: 0.20 },
          { word: 'channels', weight: 0.15 },
          { word: 'replacement', weight: -0.05 },
          { word: 'refund', weight: -0.12 },
          { word: 'purchased', weight: -0.18 },
        ],
        urgency: [
          { word: 'defective', weight: 0.38 },
          { word: 'nothing works', weight: 0.32 },
          { word: 'disconnecting', weight: 0.25 },
          { word: 'tried', weight: 0.18 },
          { word: 'factory reset', weight: 0.15 },
          { word: 'every 10-15 minutes', weight: 0.12 },
          { word: 'replacement', weight: 0.08 },
          { word: 'refund', weight: 0.05 },
          { word: 'purchased', weight: -0.05 },
          { word: 'channels', weight: -0.10 },
        ],
      },
      similar_tickets: [
        { id: 'TK-4001', text: 'SmartHome Hub keeps dropping WiFi connection, tried everything.', similarity: 0.89, category: 'Technical', resolution: 'Known hardware issue with batch #44xxx. Replacement unit shipped. Engineering notified.' },
        { id: 'TK-3899', text: 'My smart hub disconnects from WiFi randomly throughout the day.', similarity: 0.83, category: 'Technical', resolution: 'Firmware patch v3.2.2 released to fix WiFi stability. Customer guided through update.' },
        { id: 'TK-3756', text: 'Getting HW-ERR error on my smart home device after firmware update.', similarity: 0.77, category: 'Technical', resolution: 'Firmware rollback performed. Device stabilized. Bug reported to dev team.' },
        { id: 'TK-3650', text: 'Product keeps malfunctioning despite multiple troubleshooting attempts.', similarity: 0.69, category: 'Technical', resolution: 'Replacement authorized under warranty. Return label sent to customer.' },
        { id: 'TK-3510', text: 'Electronic device not working properly, want a refund.', similarity: 0.61, category: 'Technical', resolution: 'Full refund processed. Customer offered 15% discount on next purchase.' },
      ],
      suggested_resolution: 'This appears to be a known hardware issue with SmartHome Hub Pro batch #44xxx (based on order #ORD-44210). Ship a replacement unit immediately under warranty. Provide a prepaid return label for the defective unit. If customer prefers a refund, process $199.00 full refund. Report error code HW-ERR-7291 to the hardware engineering team for batch analysis.',
      pipeline: {
        raw: text,
        normalized: text.toLowerCase().replace(/[^\w\s#\-$.@]/g, ''),
        tokens: ['smarthome', 'hub', 'pro', 'received', 'defective', 'keeps', 'disconnecting', 'wifi', 'every', '10', '15', 'minutes', 'shows', 'error', 'code', 'hw-err-7291', 'tried', 'factory', 'reset', 'firmware', 'update', 'v3.2.1', 'switching', 'wifi', 'channels', 'nothing', 'works', 'order', '#ord-44210', 'purchased', 'aug', '28', '$199.00', 'want', 'replacement', 'full', 'refund'],
        without_stopwords: ['smarthome', 'hub', 'pro', 'received', 'defective', 'keeps', 'disconnecting', 'wifi', '10', '15', 'minutes', 'shows', 'error', 'code', 'hw-err-7291', 'tried', 'factory', 'reset', 'firmware', 'update', 'v3.2.1', 'switching', 'wifi', 'channels', 'nothing', 'works', 'order', '#ord-44210', 'purchased', 'aug', '28', '$199.00', 'want', 'replacement', 'full', 'refund'],
        lemmas: ['smarthome', 'hub', 'pro', 'receive', 'defective', 'keep', 'disconnect', 'wifi', '10', '15', 'minute', 'show', 'error', 'code', 'hw-err-7291', 'try', 'factory', 'reset', 'firmware', 'update', 'v3.2.1', 'switch', 'wifi', 'channel', 'nothing', 'work', 'order', '#ord-44210', 'purchase', 'aug', '28', '$199.00', 'want', 'replacement', 'full', 'refund'],
      },
      ticket_id: 'TK-4421',
    },
    {
      category: 'Customer Service',
      category_confidence: 0.93,
      urgency: 'Medium',
      urgency_confidence: 0.71,
      sentiment: { label: 'negative', score: 0.52 },
      entities: [
        { text: '$29.99/month', label: 'AMOUNT', start: 44, end: 56 },
        { text: 'ACC-8834', label: 'ORDER_ID', start: 276, end: 284 },
      ],
      explanation: {
        category: [
          { word: 'cancel', weight: 0.52 },
          { word: 'subscription', weight: 0.48 },
          { word: 'account', weight: 0.35 },
          { word: 'Premium', weight: 0.28 },
          { word: 'monthly', weight: 0.22 },
          { word: 'settings', weight: 0.18 },
          { word: 'prorated', weight: 0.12 },
          { word: 'refund', weight: -0.05 },
          { word: 'button', weight: -0.08 },
          { word: 'email', weight: -0.15 },
        ],
        urgency: [
          { word: 'immediately', weight: 0.42 },
          { word: 'no button', weight: 0.30 },
          { word: 'trying', weight: 0.22 },
          { word: 'cancel', weight: 0.18 },
          { word: 'refund', weight: 0.15 },
          { word: 'prorated', weight: 0.10 },
          { word: 'confirm', weight: 0.05 },
          { word: 'month', weight: -0.03 },
          { word: 'option', weight: -0.08 },
          { word: 'settings', weight: -0.12 },
        ],
      },
      similar_tickets: [
        { id: 'TK-5001', text: 'Want to cancel my subscription but can\'t find the option anywhere.', similarity: 0.91, category: 'Customer Service', resolution: 'Subscription cancelled manually. Prorated refund issued. UX team notified about missing cancellation button.' },
        { id: 'TK-4899', text: 'Please cancel my premium plan and refund the remaining balance.', similarity: 0.84, category: 'Customer Service', resolution: 'Plan cancelled. Prorated refund of $22.50 processed. Confirmation email sent.' },
        { id: 'TK-4756', text: 'The cancellation process is broken, I can\'t cancel my account.', similarity: 0.78, category: 'Customer Service', resolution: 'Bug confirmed in account settings. Cancelled via admin panel. Bug ticket created for engineering.' },
        { id: 'TK-4610', text: 'I want to downgrade my plan from premium to basic.', similarity: 0.65, category: 'Customer Service', resolution: 'Plan downgraded at end of billing cycle. Difference refunded.' },
        { id: 'TK-4520', text: 'Need help managing my subscription and billing settings.', similarity: 0.58, category: 'Customer Service', resolution: 'Walked customer through account settings. Updated billing info successfully.' },
      ],
      suggested_resolution: 'Cancel the Premium subscription for account ACC-8834 immediately via the admin panel (the missing cancellation button is a known UX issue — ticket filed with the product team). Calculate and issue a prorated refund for the remaining days in the billing cycle (~$24.99 for 25 remaining days). Send cancellation confirmation email. Flag the UX issue for the product team.',
      pipeline: {
        raw: text,
        normalized: text.toLowerCase().replace(/[^\w\s#\-$.@]/g, ''),
        tokens: ['need', 'cancel', 'premium', 'subscription', '$29.99/month', 'effective', 'immediately', 'trying', 'find', 'cancellation', 'option', 'account', 'settings', 'no', 'button', 'also', 'want', 'prorated', 'refund', 'month', 'since', 'only', '5', 'days', 'account', 'id', 'acc-8834', 'please', 'confirm', 'cancellation', 'email'],
        without_stopwords: ['need', 'cancel', 'premium', 'subscription', '$29.99/month', 'effective', 'immediately', 'trying', 'find', 'cancellation', 'option', 'account', 'settings', 'button', 'want', 'prorated', 'refund', 'month', '5', 'days', 'account', 'id', 'acc-8834', 'please', 'confirm', 'cancellation', 'email'],
        lemmas: ['need', 'cancel', 'premium', 'subscription', '$29.99/month', 'effective', 'immediate', 'try', 'find', 'cancellation', 'option', 'account', 'setting', 'button', 'want', 'prorate', 'refund', 'month', '5', 'day', 'account', 'id', 'acc-8834', 'please', 'confirm', 'cancellation', 'email'],
      },
      ticket_id: 'TK-5501',
    },
  ];
  const pred = predictions[index % predictions.length];
  return { ...pred, needs_review: pred.category_confidence < 0.50 || pred.urgency_confidence < 0.45 };
};

export function getMockPrediction(text: string): PredictionResponse {
  const idx = SAMPLE_TICKETS.indexOf(text);
  if (idx !== -1) return makePrediction(text, idx);

  // Generate a sensible response for any custom text
  const categories = ['Technical', 'Customer Service', 'Billing and Payments', 'Returns and Exchanges'];
  const urgencies: PredictionResponse['urgency'][] = ['Low', 'Medium', 'High', 'Critical'];
  const hash = text.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const cat = categories[hash % categories.length];
  const urg = urgencies[hash % urgencies.length];

  const words = text.split(/\s+/).filter(w => w.length > 3).slice(0, 10);
  return {
    category: cat,
    category_confidence: 0.72 + (hash % 20) / 100,
    urgency: urg,
    urgency_confidence: 0.65 + (hash % 25) / 100,
    sentiment: { label: 'negative', score: 0.55 + (hash % 30) / 100 },
    entities: [],
    explanation: {
      category: words.map((w, i) => ({ word: w, weight: 0.4 - i * 0.06 })),
      urgency: words.map((w, i) => ({ word: w, weight: 0.35 - i * 0.05 })),
    },
    similar_tickets: [
      { id: 'TK-9901', text: 'Generic similar ticket for custom input analysis.', similarity: 0.62, category: cat, resolution: 'Standard resolution applied based on category guidelines.' },
      { id: 'TK-9902', text: 'Another matching ticket from the knowledge base.', similarity: 0.55, category: cat, resolution: 'Escalated to specialized team for handling.' },
    ],
    suggested_resolution: `Based on the analysis, this ticket falls under the "${cat}" category. Recommended action: Follow standard ${cat.toLowerCase()} resolution procedures. Assign to the appropriate team for prompt handling.`,
    needs_review: false,
    pipeline: {
      raw: text,
      normalized: text.toLowerCase().replace(/[^\w\s]/g, ' ').replace(/\s+/g, ' ').trim(),
      tokens: text.toLowerCase().split(/\s+/).map(w => w.replace(/[^\w]/g, '')).filter(Boolean),
      without_stopwords: text.toLowerCase().split(/\s+/).map(w => w.replace(/[^\w]/g, '')).filter(w => w.length > 2 && !['the', 'and', 'for', 'that', 'this', 'with', 'are', 'was', 'has', 'have', 'been', 'not'].includes(w)),
      lemmas: text.toLowerCase().split(/\s+/).map(w => w.replace(/[^\w]/g, '').replace(/ing$|ed$|s$/, '')).filter(w => w.length > 2 && !['the', 'and', 'for', 'that', 'this', 'with', 'are', 'was', 'has', 'have', 'been', 'not'].includes(w)),
    },
    ticket_id: `TK-${hash % 9000 + 1000}`,
  };
}
