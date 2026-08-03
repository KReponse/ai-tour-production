import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

const RoleProtectedRoute = ({
  children,
  allowedRoles,
}) => {

  const { user } = useAuth();

  // NOT LOGGED IN
  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // ROLE NOT ALLOWED
  if (
    !allowedRoles.includes(user.role)
  ) {
    return (
      <Navigate to="/" replace />
    );
  }

  return children;
};

export default RoleProtectedRoute;