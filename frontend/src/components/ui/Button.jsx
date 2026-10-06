import { Loader2 } from 'lucide-react';

export default function Button({ variant = 'primary', size = 'md', loading, icon: Icon, children, className = '', disabled, ...rest }) {
  return (
    <button className={`btn btn-${variant} btn-${size} ${className}`} disabled={disabled || loading} {...rest}>
      {loading ? <Loader2 size={16} className="spin" /> : Icon ? <Icon size={16} /> : null}
      {children && <span>{children}</span>}
    </button>
  );
}
