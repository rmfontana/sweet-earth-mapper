
import React from 'react';
import Header from '../components/Layout/Header';
import InteractiveMap from '../components/Map/InteractiveMap';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Badge } from '../components/ui/badge';
import { Button } from '../components/ui/button';
import { MapPin, BarChart3, Users, TrendingUp, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { mockBrixData } from '../data/mockData';

const Index = () => {
  const { isAuthenticated } = useAuth();

  // Calculate some statistics for the dashboard
  const totalMeasurements = mockBrixData.length;
  const verifiedMeasurements = mockBrixData.filter(d => d.verified).length;
  const avgBrix = (mockBrixData.reduce((sum, d) => sum + d.brixLevel, 0) / mockBrixData.length).toFixed(1);
  const uniqueCrops = new Set(mockBrixData.map(d => d.cropType)).size;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Hero Section */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            Discover Crop Sweetness Worldwide
          </h1>
          <p className="text-xl text-gray-600 max-w-3xl mx-auto mb-6">
            BRIX is a collaborative platform where farmers, researchers, and enthusiasts share 
            Brix measurements to understand crop sweetness patterns across different regions and conditions.
          </p>
          {!isAuthenticated && (
            <div className="flex justify-center space-x-4">
              <Link to="/register">
                <Button size="lg" className="bg-green-600 hover:bg-green-700">
                  <Plus className="w-4 h-4 mr-2" />
                  Start Contributing
                </Button>
              </Link>
              <Link to="/data">
                <Button variant="outline" size="lg">
                  <BarChart3 className="w-4 h-4 mr-2" />
                  Explore Data
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-blue-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{totalMeasurements}</p>
                  <p className="text-sm text-gray-600">Total Measurements</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-green-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{avgBrix}°</p>
                  <p className="text-sm text-gray-600">Average Brix</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <MapPin className="w-6 h-6 text-purple-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{uniqueCrops}</p>
                  <p className="text-sm text-gray-600">Crop Types</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="flex items-center p-6">
              <div className="flex items-center space-x-4">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Users className="w-6 h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-2xl font-bold text-gray-900">{verifiedMeasurements}</p>
                  <p className="text-sm text-gray-600">Verified</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Interactive Map Section */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex justify-between items-center">
              <div>
                <CardTitle className="flex items-center space-x-2">
                  <MapPin className="w-5 h-5" />
                  <span>Interactive Brix Map</span>
                </CardTitle>
                <p className="text-gray-600 mt-1">
                  Explore Brix measurements from around the world. Click on points to see detailed information.
                </p>
              </div>
              <Link to="/data">
                <Button variant="outline">
                  View All Data
                </Button>
              </Link>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-96 w-full">
              <InteractiveMap />
            </div>
          </CardContent>
        </Card>

        {/* Recent Activity & Features */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Measurements */}
          <Card>
            <CardHeader>
              <CardTitle>Recent Measurements</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {mockBrixData.slice(0, 5).map((point) => (
                  <div key={point.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-2 h-2 rounded-full bg-green-500"></div>
                      <div>
                        <p className="font-medium">{point.cropType}</p>
                        <p className="text-sm text-gray-600">by {point.submittedBy}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <Badge className="bg-green-100 text-green-800">
                        {point.brixLevel}°
                      </Badge>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(point.measurementDate).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Platform Features */}
          <Card>
            <CardHeader>
              <CardTitle>Why Use BRIX?</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                    <MapPin className="w-4 h-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Geographic Insights</h4>
                    <p className="text-sm text-gray-600">
                      See how location affects crop sweetness and discover optimal growing regions.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center">
                    <BarChart3 className="w-4 h-4 text-green-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Data-Driven Decisions</h4>
                    <p className="text-sm text-gray-600">
                      Make informed choices about harvesting, breeding, and crop management.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Users className="w-4 h-4 text-purple-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Community Knowledge</h4>
                    <p className="text-sm text-gray-600">
                      Join a global community of farmers and researchers sharing expertise.
                    </p>
                  </div>
                </div>

                <div className="flex items-start space-x-3">
                  <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="w-4 h-4 text-orange-600" />
                  </div>
                  <div>
                    <h4 className="font-medium">Track Progress</h4>
                    <p className="text-sm text-gray-600">
                      Monitor your contributions and earn badges for your participation.
                    </p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Call to Action for unauthenticated users */}
        {!isAuthenticated && (
          <Card className="mt-8 bg-gradient-to-r from-green-50 to-blue-50 border-green-200">
            <CardContent className="text-center py-8">
              <h3 className="text-2xl font-bold text-gray-900 mb-4">
                Ready to Start Contributing?
              </h3>
              <p className="text-gray-600 mb-6 max-w-2xl mx-auto">
                Join thousands of farmers, researchers, and agricultural enthusiasts 
                who are building the world's largest database of crop sweetness data.
              </p>
              <div className="flex justify-center space-x-4">
                <Link to="/register">
                  <Button size="lg" className="bg-green-600 hover:bg-green-700">
                    Create Account
                  </Button>
                </Link>
                <Link to="/login">
                  <Button variant="outline" size="lg">
                    Sign In
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}
      </main>
    </div>
  );
};

export default Index;
