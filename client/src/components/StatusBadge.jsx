const LABELS = { open: 'Open', partially_fulfilled: 'Partially fulfilled', fulfilled: 'Fulfilled', cancelled: 'Cancelled', pending: 'Awaiting response', accepted: 'Accepted', rejected: 'Declined', expired: 'Expired', critical: 'Critical', high: 'High', medium: 'Medium', low: 'Low' };
export default function StatusBadge({ status = 'open' }) {
  const normalized = String(status).toLowerCase();
  return <span className={`status-badge status-${normalized}`}>{LABELS[normalized] || normalized.replaceAll('_', ' ')}</span>;
}
