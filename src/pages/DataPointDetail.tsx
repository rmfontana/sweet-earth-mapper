
import React from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Header from '../components/Layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, MapPin, Calendar, User, CheckCircle, AlertCircle, Edit, Trash2 } from 'lucide-react';
import { mockBrixData } from '../data/mockData';
import { useAuth } from '../contexts/AuthContext';

const DataPointDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const dataPoint = mockBrixData.find(point => point.id === id);

  if (!dataPoint) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="text-center py-12">
              <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Data Point Not Found</h2>
              <p className="text-gray-600 mb-6">The requested measurement could not be found.</p>
              <Link to="/map">
                <Button>Return to Map</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const getBrixColor = (brixLevel: number) => {
    if (brixLevel < 10) return 'bg-red-500';
    if (brixLevel < 15) return 'bg-orange-500';
    if (brixLevel < 20) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getBrixQuality = (brixLevel: number) => {
    if (brixLevel < 10) return 'Low';
    if (brixLevel < 15) return 'Medium';
    if (brixLevel < 20) return 'Good';
    return 'Excellent';
  };

  const isOwner = user?.username === dataPoint.submittedBy;

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Back Button */}
        <div className="mb-6">
          <Button
            variant="ghost"
            onClick={() => navigate(-1)}
            className="flex items-center space-x-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back</span>
          </Button>
        </div>

        {/* Main Content */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details */}
          <Card className="lg:col-span-2">
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-2xl flex items-center space-x-3">
                    <span>{dataPoint.cropType}</span>
                    {dataPoint.verified && (
                      <CheckCircle className="w-6 h-6 text-green-600" />
                    )}
                  </CardTitle>
                  {dataPoint.variety && (
                    <p className="text-gray-600 mt-1">{dataPoint.variety}</p>
                  )}
                </div>
                
                {isOwner && (
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm">
                      <Edit className="w-4 h-4 mr-1" />
                      Edit
                    </Button>
                    <Button variant="outline" size="sm" className="text-red-600 hover:text-red-700">
                      <Trash2 className="w-4 h-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            
            <CardContent className="space-y-6">
              {/* BRIX Reading */}
              <div className="bg-gray-50 rounded-lg p-6 text-center">
                <div className="flex items-center justify-center space-x-4 mb-4">
                  <div className={`w-16 h-16 rounded-full ${getBrixColor(dataPoint.brixLevel)} flex items-center justify-center`}>
                    <span className="text-white font-bold text-xl">{dataPoint.brixLevel}</span>
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-bold text-gray-900">{dataPoint.brixLevel} BRIX</p>
                    <p className="text-sm text-gray-600">Refractometer Reading</p>
                    <Badge className={`mt-1 ${getBrixColor(dataPoint.brixLevel)} text-white`}>
                      {getBrixQuality(dataPoint.brixLevel)} Quality
                    </Badge>
                  </div>
                </div>
              </div>

              {/* Measurement Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">Measurement Date</p>
                    <p className="font-medium">{new Date(dataPoint.measurementDate).toLocaleDateString()}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <User className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">Submitted By</p>
                    <p className="font-medium">{dataPoint.submittedBy}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="font-medium">{dataPoint.latitude.toFixed(4)}, {dataPoint.longitude.toFixed(4)}</p>
                  </div>
                </div>

                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <CheckCircle className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">Verification Status</p>
                    <p className="font-medium">{dataPoint.verified ? 'Verified' : 'Pending'}</p>
                  </div>
                </div>
              </div>

              {/* Notes */}
              {dataPoint.notes && (
                <div>
                  <h3 className="font-semibold mb-2">Notes</h3>
                  <div className="bg-gray-50 rounded-lg p-4">
                    <p className="text-gray-700">{dataPoint.notes}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Sidebar */}
          <div className="space-y-6">
            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to="/map" className="block">
                  <Button variant="outline" className="w-full">
                    <MapPin className="w-4 h-4 mr-2" />
                    View on Map
                  </Button>
                </Link>
                
                <Link to="/data" className="block">
                  <Button variant="outline" className="w-full">
                    View All Data
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Data Quality Info */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">BRIX Scale Reference</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="space-y-2 text-sm">
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-red-500"></div>
                    <span>&lt; 10 BRIX (Low)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span>10-15 BRIX (Medium)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span>15-20 BRIX (Good)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>&gt; 20 BRIX (Excellent)</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DataPointDetail;
