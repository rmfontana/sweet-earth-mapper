import React, { useState } from 'react';
import Header from '../components/Layout/Header';
import InteractiveMap from '../components/Map/InteractiveMap';
import { Card, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Locate } from 'lucide-react';
import { useToast } from '../hooks/use-toast';

const MapView = () => {
  const { toast } = useToast();
  const [userLocation, setUserLocation] = useState<{lat: number, lng: number} | null>(null);
  const [nearMeTriggered, setNearMeTriggered] = useState(false);

  const handleLocationSearch = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLoc = {
            lat: position.coords.latitude,
            lng: position.coords.longitude
          };
          setUserLocation(userLoc);
          
          setNearMeTriggered(true);
          
          toast({
            title: "Location found",
            description: "Zooming to your location on the map.",
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

  const handleNearMeHandled = () => {
    setNearMeTriggered(false);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
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
          </div>
        </div>

        <div className="grid grid-cols-1">
          <div className="lg:col-span-4">
            <Card>
              <CardContent className="p-0">
                <div className="h-[600px] w-full relative">
                  <InteractiveMap 
                    userLocation={userLocation} 
                    nearMeTriggered={nearMeTriggered}
                    onNearMeHandled={handleNearMeHandled}
                  />
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