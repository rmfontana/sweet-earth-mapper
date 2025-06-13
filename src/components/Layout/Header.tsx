
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

          {/* Navigation */}
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
              
              {(user.isAdmin || user.username === 'farmerjohn') && (
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

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                <div className="flex items-center space-x-2">
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-green-100 text-green-700">
                      {user.username.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium text-gray-900">{user.username}</p>
                    {user.isAdmin && (
                      <Badge variant="secondary" className="text-xs">Admin</Badge>
                    )}
                    {user.username === 'farmerjohn' && (
                      <Badge variant="secondary" className="text-xs">Citizen Scientist</Badge>
                    )}
                  </div>
                </div>
                
                <Button variant="ghost" size="sm" onClick={logout}>
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
