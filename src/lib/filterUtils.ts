import { BrixDataPoint, MapFilter } from '../types';

export function applyFilters(data: BrixDataPoint[], filters: MapFilter, isAdmin: boolean = false): BrixDataPoint[] {
  console.log(`Applying filters to ${data.length} submissions:`, {
    filters,
    isAdmin,
    samplePoint: data[0]
  });

  const filtered = data.filter((point) => {
    // Verified filter - for non-admin users, always filter to verified only
    if (!isAdmin || filters.verifiedOnly) {
      if (!point.verified) {
        return false;
      }
    }

    // Crop types filter
    if (filters.cropTypes.length > 0 && !filters.cropTypes.includes(point.cropType)) {
      return false;
    }

    // Category filter
    if (filters.category && point.category !== filters.category) {
      return false;
    }

    // Brand filter
    if (filters.brand && point.brandName !== filters.brand) {
      return false;
    }

    // Store filter
    if (filters.store && point.storeName !== filters.store) {
      return false;
    }

    // Brix range filter
    if (point.brixLevel < filters.brixRange[0] || point.brixLevel > filters.brixRange[1]) {
      return false;
    }

    // Date range filter
    if (filters.dateRange[0] || filters.dateRange[1]) {
      const submittedDate = new Date(point.submittedAt);
      
      if (filters.dateRange[0]) {
        const startDate = new Date(filters.dateRange[0]);
        if (submittedDate < startDate) {
          return false;
        }
      }
      
      if (filters.dateRange[1]) {
        const endDate = new Date(filters.dateRange[1]);
        endDate.setHours(23, 59, 59, 999); // End of day
        if (submittedDate > endDate) {
          return false;
        }
      }
    }

    // Has image filter
    if (filters.hasImage && (!point.images || point.images.length === 0)) {
      return false;
    }

    // Submitted by filter
    if (filters.submittedBy && !point.submittedBy.toLowerCase().includes(filters.submittedBy.toLowerCase())) {
      return false;
    }

    return true;
  });

  console.log(`Filtered ${data.length} submissions down to ${filtered.length}:`, {
    verifiedOnly: !isAdmin || filters.verifiedOnly,
    cropTypesCount: filters.cropTypes.length,
    brixRange: filters.brixRange,
    dateRange: filters.dateRange,
    brand: filters.brand,
    store: filters.store,
    category: filters.category,
    hasImage: filters.hasImage
  });

  return filtered;
}

export function getFilterSummary(filters: MapFilter, isAdmin: boolean): string {
  const activeFilters: string[] = [];
  
  if (!isAdmin || filters.verifiedOnly) {
    activeFilters.push('verified only');
  }
  
  if (filters.cropTypes.length > 0) {
    activeFilters.push(`${filters.cropTypes.length} crop type${filters.cropTypes.length > 1 ? 's' : ''}`);
  }
  
  if (filters.category) {
    activeFilters.push(`category: ${filters.category}`);
  }
  
  if (filters.brand) {
    activeFilters.push(`brand: ${filters.brand}`);
  }
  
  if (filters.store) {
    activeFilters.push(`store: ${filters.store}`);
  }
  
  if (filters.brixRange[0] > 0 || filters.brixRange[1] < 30) {
    activeFilters.push(`BRIX: ${filters.brixRange[0]}-${filters.brixRange[1]}`);
  }
  
  if (filters.dateRange[0] || filters.dateRange[1]) {
    const start = filters.dateRange[0] || 'start';
    const end = filters.dateRange[1] || 'end';
    activeFilters.push(`dates: ${start} to ${end}`);
  }
  
  if (filters.hasImage) {
    activeFilters.push('with images');
  }
  
  if (filters.submittedBy) {
    activeFilters.push(`by: ${filters.submittedBy}`);
  }

  return activeFilters.length > 0 ? activeFilters.join(', ') : 'no filters';
}