import { AlertCircle, CheckCircle2, Info } from 'lucide-react';

export default function Feedback({ type = 'info', children, onClose }) {
  if (!children) return null;
  const icon = type === 'success' ? <CheckCircle2 size={18} /> : type === 'error' ? <AlertCircle size={18} /> : <Info size={18} />;
  return <div className={`feedback feedback-${type}`} role={type === 'error' ? 'alert' : 'status'}>{icon}<span>{children}</span>{onClose && <button onClick={onClose} type="button" className="ml-auto text-current/70" aria-label="Dismiss">×</button>}</div>;
}
