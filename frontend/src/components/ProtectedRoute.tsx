import { Navigate } from 'react-router-dom';
import type { ReactNode } from 'react'; // <--- Added "type" keyword

interface Props {
  children: ReactNode; // <--- 2. Change JSX.Element to ReactNode
  allowedRoles: string[]; // e.g. ['ADMIN', 'MODERATOR']
}

const ProtectedRoute = ({ children, allowedRoles }: Props) => {
  const token = localStorage.getItem('token');
  const userRole = localStorage.getItem('userRole'); // We need to save this on login!

  // 1. Not logged in? Go to Login.
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // 2. Logged in, but wrong role? Go to User Home.
  if (userRole && !allowedRoles.includes(userRole)) {
    return <Navigate to="/dashboard" replace />;
  }

  // 3. Access Granted.
  return children;
};

export default ProtectedRoute;