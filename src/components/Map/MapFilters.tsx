
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import { Calendar, X } from 'lucide-react';

interface MapFiltersProps {
  filters: {
    cropTypes: string[];
    brixRange: [number, number];
    dateRange: [string, string];
    verifiedOnly: boolean;
    submittedBy: string;
  };
  onFiltersChange: (filters: any) => void;
}

const availableCrops = ['Tomato', 'Carrot', 'Apple', 'Spinach', 'Lettuce', 'Cucumber', 'Pepper', 'Strawberry'];

const MapFilters: React.FC<MapFiltersProps> = ({ filters, onFiltersChange }) => {
  const updateFilters = (key: string, value: any) => {
    onFiltersChange({ ...filters, [key]: value });
  };

  const addCropType = (crop: string) => {
    if (!filters.cropTypes.includes(crop)) {
      updateFilters('cropTypes', [...filters.cropTypes, crop]);
    }
  };

  const removeCropType = (crop: string) => {
    updateFilters('cropTypes', filters.cropTypes.filter(c => c !== crop));
  };

  const clearAllFilters = () => {
    onFiltersChange({
      cropTypes: [],
      brixRange: [0, 30],
      dateRange: ['', ''],
      verifiedOnly: false,
      submittedBy: ''
    });
  };

  return (
    <Card className="h-fit">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-lg">Filters</CardTitle>
          <Button variant="ghost" size="sm" onClick={clearAllFilters}>
            Clear All
          </Button>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Crop Types */}
        <div>
          <Label className="text-sm font-medium mb-3 block">Crop Types</Label>
          
          {/* Selected crops */}
          {filters.cropTypes.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {filters.cropTypes.map(crop => (
                <Badge key={crop} variant="secondary" className="flex items-center space-x-1">
                  <span>{crop}</span>
                  <X 
                    className="w-3 h-3 cursor-pointer" 
                    onClick={() => removeCropType(crop)}
                  />
                </Badge>
              ))}
            </div>
          )}
          
          {/* Available crops */}
          <div className="grid grid-cols-2 gap-2">
            {availableCrops.map(crop => (
              <Button
                key={crop}
                variant={filters.cropTypes.includes(crop) ? "default" : "outline"}
                size="sm"
                onClick={() => filters.cropTypes.includes(crop) ? removeCropType(crop) : addCropType(crop)}
                className="text-xs"
              >
                {crop}
              </Button>
            ))}
          </div>
        </div>

        {/* BRIX Range */}
        <div>
          <Label className="text-sm font-medium mb-3 block">BRIX Range</Label>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label htmlFor="min-brix" className="text-xs">Min</Label>
              <Input
                id="min-brix"
                type="number"
                value={filters.brixRange[0]}
                onChange={(e) => updateFilters('brixRange', [parseInt(e.target.value) || 0, filters.brixRange[1]])}
                className="text-sm"
                min="0"
                max="30"
              />
            </div>
            <div>
              <Label htmlFor="max-brix" className="text-xs">Max</Label>
              <Input
                id="max-brix"
                type="number"
                value={filters.brixRange[1]}
                onChange={(e) => updateFilters('brixRange', [filters.brixRange[0], parseInt(e.target.value) || 30])}
                className="text-sm"
                min="0"
                max="30"
              />
            </div>
          </div>
        </div>

        {/* Date Range */}
        <div>
          <Label className="text-sm font-medium mb-3 block flex items-center">
            <Calendar className="w-4 h-4 mr-1" />
            Date Range
          </Label>
          <div className="space-y-3">
            <div>
              <Label htmlFor="start-date" className="text-xs">From</Label>
              <Input
                id="start-date"
                type="date"
                value={filters.dateRange[0]}
                onChange={(e) => updateFilters('dateRange', [e.target.value, filters.dateRange[1]])}
                className="text-sm"
              />
            </div>
            <div>
              <Label htmlFor="end-date" className="text-xs">To</Label>
              <Input
                id="end-date"
                type="date"
                value={filters.dateRange[1]}
                onChange={(e) => updateFilters('dateRange', [filters.dateRange[0], e.target.value])}
                className="text-sm"
              />
            </div>
          </div>
        </div>

        {/* Submitted By */}
        <div>
          <Label htmlFor="submitted-by" className="text-sm font-medium mb-3 block">
            Submitted By
          </Label>
          <Input
            id="submitted-by"
            value={filters.submittedBy}
            onChange={(e) => updateFilters('submittedBy', e.target.value)}
            placeholder="Search by contributor..."
            className="text-sm"
          />
        </div>

        {/* Verified Only */}
        <div className="flex items-center justify-between">
          <Label htmlFor="verified-only" className="text-sm font-medium">
            Verified Only
          </Label>
          <Switch
            id="verified-only"
            checked={filters.verifiedOnly}
            onCheckedChange={(checked) => updateFilters('verifiedOnly', checked)}
          />
        </div>

        {/* Results Count */}
        <div className="pt-4 border-t">
          <p className="text-xs text-gray-600">
            Showing filtered measurements on map
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default MapFilters;
