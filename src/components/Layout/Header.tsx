import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { useAuth } from '../../contexts/AuthContext';
import { Map, Database, Plus, User, LogOut } from 'lucide-react';

const Header = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

  const hasRole = (role: string): boolean => {
    if (!user) return false;

    switch (role) {
      case 'admin':
        return user.role === 'admin';
      case 'contributor':
        return user.role === 'contributor' || user.role === 'admin';
      default:
        return false;
    }
  };

  const getDisplayName = (): string => {
    if (!user?.display_name) return '';
    return user.display_name.replace(/[<>]/g, '');
  };

  const getUserInitial = (): string => {
    const displayName = getDisplayName();
    return displayName ? displayName.charAt(0).toUpperCase() : 'U';
  };

  const handleLogout = () => {
    logout();
  };

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <span className="text-xl font-bold text-gray-900">BRIX</span>
          </Link>

          {/* Navigation - only if authenticated */}
          {user && (
            <nav className="hidden md:flex space-x-1">
              <Link to="/map">
                <Button
                  variant={isActive('/map') ? 'default' : 'ghost'}
                  className="flex items-center space-x-2"
                >
                  <Map className="w-4 h-4" />
                  <span>Map</span>
                </Button>
              </Link>

              <Link to="/data">
                <Button
                  variant={isActive('/data') ? 'default' : 'ghost'}
                  className="flex items-center space-x-2"
                >
                  <Database className="w-4 h-4" />
                  <span>Data</span>
                </Button>
              </Link>

              <Link to="/your-data">
                <Button
                  variant={isActive('/your-data') ? 'default' : 'ghost'}
                  className="flex items-center space-x-2"
                >
                  <User className="w-4 h-4" />
                  <span>Your Data</span>
                </Button>
              </Link>

              {hasRole('contributor') && (
                <Link to="/data-entry">
                  <Button
                    variant={isActive('/data-entry') ? 'default' : 'ghost'}
                    className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Submit</span>
                  </Button>
                </Link>
              )}
            </nav>
          )}

          {/* User menu */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                {/* Link wrapping avatar + display name */}
                <Link to="/profile" className="flex items-center space-x-2 cursor-pointer">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-green-100 text-green-700">
                      {getUserInitial()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium text-gray-900">{getDisplayName()}</p>
                    {hasRole('admin') && (
                      <Badge variant="secondary" className="text-xs">
                        Admin
                      </Badge>
                    )}
                    {hasRole('contributor') && !hasRole('admin') && (
                      <Badge variant="secondary" className="text-xs">
                        Citizen Scientist
                      </Badge>
                    )}
                  </div>
                </Link>

                <Button variant="ghost" size="sm" onClick={handleLogout}>
                  <LogOut className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <div className="flex space-x-2">
                <Link to="/login">
                  <Button variant="ghost">Log In</Button>
                </Link>
                <Link to="/register">
                  <Button>Sign Up</Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;
