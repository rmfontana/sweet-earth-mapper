import React, { useState } from 'react';
import Header from '../components/Layout/Header';
import InteractiveMap from '../components/Map/InteractiveMap';
import MapFilters from '../components/Map/MapFilters';
import { useFilters } from '../contexts/FilterContext';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Filter, List, Locate } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useToast } from '../hooks/use-toast';

const MapView = () => {
  const { toast } = useToast();
  const { filters, setFilters } = useFilters();
  const [showFilters, setShowFilters] = useState(true);
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);

  const handleLocationSearch = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(userLoc);
          setFilters({ ...filters, nearbyOnly: true });
          
          toast({
            title: "Location found",
            description: "Showing measurements 5 miles of your location.",
          });
        },
        (error) => {
          toast({
            title: "Location error",
            description: "Unable to access your location. Please enable location services.",
            variant: "destructive"
          });
        }
      );
    } else {
      toast({
        title: "Not supported",
        description: "Geolocation is not supported by this browser.",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header Section */}
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              BRIX Measurement Map
            </h1>
            <p className="text-gray-600">
              Explore bionutrient density measurements from refractometer readings worldwide
            </p>
          </div>
          
          <div className="flex space-x-3 mt-4 md:mt-0">
            <Button
              variant="outline"
              onClick={handleLocationSearch}
              className="flex items-center space-x-2"
            >
              <Locate className="w-4 h-4" />
              <span>Near Me</span>
            </Button>

            <Button
              variant="outline"
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center space-x-2"
            >
              <Filter className="w-4 h-4" />
              <span>{showFilters ? 'Hide' : 'Show'} Filters</span>
            </Button>
            
            <Link to="/data">
              <Button variant="outline" className="flex items-center space-x-2">
                <List className="w-4 h-4" />
                <span>Data List</span>
              </Button>
            </Link>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Filters Sidebar */}
          {showFilters && (
            <div className="lg:col-span-1">
              <MapFilters />
            </div>
          )}
          
          {/* Map Area */}
          <div className={showFilters ? "lg:col-span-3" : "lg:col-span-4"}>
            <Card>
              <CardContent className="p-0">
                <div className="h-[600px] w-full relative">
                  <InteractiveMap userLocation={userLocation} showFilters={showFilters}/>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MapView;
