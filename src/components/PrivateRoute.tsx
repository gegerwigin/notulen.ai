import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ReactNode } from 'react';

export default function PrivateRoute({ children }: { children: ReactNode }) {
  const { currentUser } = useAuth();

  return currentUser ? <>{children}</> : <Navigate to="/" />;
}
