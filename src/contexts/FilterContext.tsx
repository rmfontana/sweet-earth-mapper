import React, { createContext, useContext, useState, ReactNode, useEffect } from 'react';
import { MapFilter } from '../types';
import { supabase } from '@/integrations/supabase/client';

interface FilterContextType {
  filters: MapFilter;
  setFilters: (filters: MapFilter) => void;
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

  // Default filters - consistent between map and table
  const [filters, setFilters] = useState<MapFilter>({
    cropTypes: [],
    brixRange: [0, 30],
    dateRange: ['', ''],
    verifiedOnly: true, // Default to true for both admin and non-admin
    submittedBy: '',
    nearbyOnly: false,
    store: '',
    brand: '',
    hasImage: false,
    category: '',
  });

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

      // Check if user is admin - for now, just set to false
      // TODO: Implement proper role checking when profiles table is available
      setIsAdmin(false);
    };

    getUserRole();
  }, []);

  // For non-admin users, always enforce verifiedOnly = true
  const updateFilters = (newFilters: MapFilter) => {
    if (!isAdmin) {
      newFilters.verifiedOnly = true;
    }
    setFilters(newFilters);
  };

  const value: FilterContextType = {
    filters,
    setFilters: updateFilters,
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