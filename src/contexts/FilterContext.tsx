import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { MapFilter } from '../types'; // Import the updated MapFilter
import { supabase } from '@/integrations/supabase/client';

// Define default filter values for consistency
export const DEFAULT_MAP_FILTERS: MapFilter = {
  cropTypes: [], // Always an array now
  brixRange: [0, 30],
  dateRange: ['', ''],
  verifiedOnly: true,
  submittedBy: '',
  place: '',
  brand: '',
  hasImage: false,
  category: '',
  location: '',
};

interface FilterContextType {
  filters: MapFilter;
  setFilters: React.Dispatch<React.SetStateAction<MapFilter>>;
  isAdmin: boolean;
  totalSubmissions: number;
  filteredCount: number;
  setFilteredCount: (count: number) => void;
}

const FilterContext = createContext<FilterContextType | undefined>(undefined);

interface FilterProviderProps {
  children: ReactNode;
}

export const FilterProvider: React.FC<FilterProviderProps> = ({ children }) => {
  const [isAdmin, setIsAdmin] = useState(false);
  const [totalSubmissions, setTotalSubmissions] = useState(0);
  const [filteredCount, setFilteredCount] = useState(0);

  // Initialize filters with the default values
  const [filters, setFilters] = useState<MapFilter>(DEFAULT_MAP_FILTERS);

  // Load user role from Supabase on mount
  useEffect(() => {
    const getUserRole = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        setIsAdmin(false);
        return;
      }
      // TODO: Implement proper role checking when profiles table is available
      // For now, setting to false as per previous instructions
      setIsAdmin(false);
    };
    getUserRole();
  }, []);

  // For non-admin users, always enforce verifiedOnly = true
  const updateFilters: React.Dispatch<React.SetStateAction<MapFilter>> = (action) => {
    setFilters(prevFilters => {
      const newFilters = typeof action === 'function' ? action(prevFilters) : action;
      if (!isAdmin) {
        return { ...newFilters, verifiedOnly: true };
      }
      return newFilters;
    });
  };

  const value: FilterContextType = {
    filters,
    setFilters: updateFilters, // Use the wrapped updateFilters
    isAdmin,
    totalSubmissions,
    filteredCount,
    setFilteredCount,
  };

  return (
    <FilterContext.Provider value={value}>
      {children}
    </FilterContext.Provider>
  );
};

export const useFilters = () => {
  const context = useContext(FilterContext);
  if (context === undefined) {
    throw new Error('useFilters must be used within a FilterProvider');
  }
  return context;
};
