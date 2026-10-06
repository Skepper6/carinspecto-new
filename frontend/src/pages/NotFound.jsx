import { Link } from 'react-router-dom';
import { Compass } from 'lucide-react';
import Button from '../components/ui/Button';

export default function NotFound() {
  return (
    <div className="notfound">
      <div className="empty">
        <span className="empty-icon"><Compass size={30} /></span>
        <h2>Page not found</h2>
        <p className="muted">The page you are looking for has taken a wrong turn.</p>
        <Link to="/"><Button>Back to home</Button></Link>
      </div>
    </div>
  );
}
