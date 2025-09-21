import React, { useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Button } from "../ui/button";
import { Avatar, AvatarFallback } from "../ui/avatar";
import { Badge } from "../ui/badge";
import { useAuth } from "../../contexts/AuthContext";
import {
  Eye,
  Database,
  Plus,
  User,
  LogOut,
  Trophy,
  Menu,
  X,
} from "lucide-react";

const Header = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [menuOpen, setMenuOpen] = useState(false);

  const isActive = (path: string) => location.pathname === path;

  const hasRole = (role: string): boolean => {
    if (!user) return false;
    if (role === "admin") return user.role === "admin";
    if (role === "contributor")
      return user.role === "contributor" || user.role === "admin";
    return false;
  };

  const getDisplayName = (): string => {
    if (!user?.display_name) return "";
    return user.display_name.replace(/[<>]/g, "");
  };

  const getUserInitial = (): string => {
    const displayName = getDisplayName();
    return displayName ? displayName.charAt(0).toUpperCase() : "U";
  };

  const handleLogout = () => {
    logout();
  };

  const NavLinks = () => (
    <>
      <Link to="/leaderboard">
        <Button
          variant={isActive("/leaderboard") ? "default" : "ghost"}
          className={`flex items-center space-x-2 w-full justify-start ${
            isActive("/leaderboard") ? "border-b-2 border-green-600" : ""
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Leaderboard</span>
        </Button>
      </Link>

      <Link to="/map">
        <Button
          variant={isActive("/map") ? "default" : "ghost"}
          className={`flex items-center space-x-2 w-full justify-start ${
            isActive("/map") ? "border-b-2 border-green-600" : ""
          }`}
        >
          <Eye className="w-4 h-4" />
          <span>Explorer</span>
        </Button>
      </Link>

      <Link to="/data">
        <Button
          variant={isActive("/data") ? "default" : "ghost"}
          className={`flex items-center space-x-2 w-full justify-start ${
            isActive("/data") ? "border-b-2 border-green-600" : ""
          }`}
        >
          <Database className="w-4 h-4" />
          <span>Data</span>
        </Button>
      </Link>

      <Link to="/your-data">
        <Button
          variant={isActive("/your-data") ? "default" : "ghost"}
          className={`flex items-center space-x-2 w-full justify-start ${
            isActive("/your-data") ? "border-b-2 border-green-600" : ""
          }`}
        >
          <User className="w-4 h-4" />
          <span>Your Data</span>
        </Button>
      </Link>

      {hasRole("contributor") && (
        <Link to="/data-entry">
          <Button
            variant={isActive("/data-entry") ? "default" : "ghost"}
            className="flex items-center space-x-2 w-full justify-start bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="w-4 h-4" />
            <span>Submit</span>
          </Button>
        </Link>
      )}
    </>
  );

  return (
    <header className="bg-white shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/leaderboard" className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-green-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">B</span>
            </div>
            <span className="text-xl font-bold text-gray-900">BRIX</span>
          </Link>

          {/* Desktop Navigation */}
          {user && (
            <nav className="hidden md:flex space-x-1">
              <NavLinks />
            </nav>
          )}

          {/* User Menu */}
          <div className="flex items-center space-x-4">
            {user ? (
              <div className="flex items-center space-x-3">
                <Link
                  to="/profile"
                  className="flex items-center space-x-2 cursor-pointer"
                >
                  <Avatar className="w-8 h-8">
                    <AvatarFallback className="bg-green-100 text-green-700">
                      {getUserInitial()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="hidden sm:block">
                    <p className="text-sm font-medium text-gray-900">
                      {getDisplayName()}
                    </p>
                    {hasRole("admin") && (
                      <Badge variant="secondary" className="text-xs">
                        Admin
                      </Badge>
                    )}
                    {hasRole("contributor") && !hasRole("admin") && (
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

            {/* Mobile Menu Toggle */}
            {user && (
              <button
                className="md:hidden p-2 rounded-md text-gray-700 hover:bg-gray-100"
                onClick={() => setMenuOpen(!menuOpen)}
              >
                {menuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            )}
          </div>
        </div>

        {/* Mobile Navigation */}
        {menuOpen && user && (
          <nav className="md:hidden flex flex-col space-y-1 pb-4">
            <NavLinks />
          </nav>
        )}
      </div>
    </header>
  );
};

export default Header;
