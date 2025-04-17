import { Link } from 'react-router-dom';

interface LogoProps {
  className?: string;
}

export default function Logo({ className = '' }: LogoProps) {
  return (
    <Link to="/" className={`flex-shrink-0 ${className}`}>
      <div className="text-2xl font-bold text-blue-600">
        Notulen<span className="text-blue-500">.ai</span>
      </div>
    </Link>
  );
}
