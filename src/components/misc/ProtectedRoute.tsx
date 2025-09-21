import React from "react";
import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../contexts/AuthContext";
import LocationModal from "../common/LocationModal";

interface ProtectedRouteProps {
  children: React.ReactElement;
  requireLocation?: boolean; // 👈 new optional prop
}

const ProtectedRoute: React.FC<ProtectedRouteProps> = ({
  children,
  requireLocation = false,
}) => {
  const { isAuthenticated, isLoading, user } = useAuth();
  const location = useLocation();

  if (isLoading) {
    return (
      <div className="p-8 text-center text-sm">
        Loading user session...
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // 👇 enforce location requirement if enabled
  if (
    requireLocation &&
    (!user?.city || !user?.state || !user?.country)
  ) {
    return <LocationModal />;
  }

  return children;
};

export default ProtectedRoute;