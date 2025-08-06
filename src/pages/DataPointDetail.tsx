import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Header from '../components/Layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, MapPin, Calendar, User, CheckCircle, AlertCircle, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchFormattedSubmissions } from '../lib/fetchSubmissions';
import { fetchBrixByCrop } from '../lib/fetchBrixByCrop'; 

const DataPointDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [dataPoint, setDataPoint] = useState<any | null>(null);
  const [cropData, setCropData] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadDataPointAndCrop = async () => {
      if (!id) {
        setDataPoint(null);
        setCropData(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const submissions = await fetchFormattedSubmissions();
        const found = submissions.find(point => point.id === id);
        setDataPoint(found || null);

        if (found?.cropType) {
          const cropInfo = await fetchBrixByCrop(found.cropType);
          setCropData(cropInfo);
        } else {
          setCropData(null);
        }
      } catch (error) {
        console.error('Failed to load data point or crop:', error);
        setDataPoint(null);
        setCropData(null);
      } finally {
        setLoading(false);
      }
    };

    loadDataPointAndCrop();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <p className="text-gray-600">Loading measurement details...</p>
        </main>
      </div>
    );
  }

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
    if (!cropData) return 'bg-gray-300';
    const { poor, average, good, excellent } = cropData.brixLevels;
    if (brixLevel < poor) return 'bg-red-500';
    if (brixLevel < average) return 'bg-orange-500';
    if (brixLevel < good) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getBrixQuality = (brixLevel: number) => {
    if (!cropData) return 'Unknown';
    const { poor, average, good, excellent } = cropData.brixLevels;
    if (brixLevel < poor) return 'Poor';
    if (brixLevel < average) return 'Average';
    if (brixLevel < good) return 'Good';
    return 'Excellent';
  };

  const isOwner = user?.display_name === dataPoint.submittedBy;
  const dataPointLocationName = dataPoint.locationName || dataPoint.location?.name || 'Unknown';

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
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => navigate(`/data-point/edit/${dataPoint.id}`)}
                    >
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

              {/* Measurement & Submission Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Assessment Date */}
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <Calendar className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">Assessment Date</p>
                    <p className="font-medium">{new Date(dataPoint.submittedAt).toLocaleDateString()}</p>
                  </div>
                </div>

                {/* Submitted By */}
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <User className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">Submitted By</p>
                    <p className="font-medium">{dataPoint.submittedBy}</p>
                  </div>
                </div>

                {/* Verified Status */}
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  {dataPoint.verified ? (
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-yellow-500" />
                  )}
                  <div>
                    <p className="text-sm text-gray-600">Verification Status</p>
                    <p className="font-medium">{dataPoint.verified ? 'Verified' : 'Pending'}</p>
                  </div>
                </div>

                {/* Verified By */}
                {dataPoint.verified && dataPoint.verifiedBy && (
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <User className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-600">Verified By</p>
                      <p className="font-medium">{dataPoint.verifiedBy}</p>
                    </div>
                  </div>
                )}

                {/* Crop Variety */}
                {dataPoint.label && (
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Badge variant="outline" className="text-gray-700">
                      Variety: {dataPoint.label}
                    </Badge>
                  </div>
                )}

                {/* Crop Category */}
                {cropData?.category && (
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Badge variant="secondary" className="text-gray-700">
                      Category: {cropData.category}
                    </Badge>
                  </div>
                )}

                {/* Location Name + Coordinates */}
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                  <MapPin className="w-5 h-5 text-gray-600" />
                  <div>
                    <p className="text-sm text-gray-600">Location</p>
                    <p className="font-medium">{dataPointLocationName}</p>
                    <p className="text-xs text-gray-500">
                      {dataPoint.latitude.toFixed(4)}, {dataPoint.longitude.toFixed(4)}
                    </p>
                  </div>
                </div>

                {/* Store Name */}
                {dataPoint.storeName && (
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <MapPin className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-600">Store</p>
                      <p className="font-medium">{dataPoint.storeName}</p>
                    </div>
                  </div>
                )}

                {/* Brand Name */}
                {dataPoint.brandName && (
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <User className="w-5 h-5 text-gray-600" />
                    <div>
                      <p className="text-sm text-gray-600">Brand</p>
                      <p className="font-medium">{dataPoint.brandName}</p>
                    </div>
                  </div>
                )}
              </div>

              {/* Submission Images */}
              {dataPoint.images && dataPoint.images.length > 0 && (
                <div>
                  <h3 className="font-semibold mb-2 mt-8">Submission Images</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {dataPoint.images.map((url: string, idx: number) => (
                      <img
                        key={idx}
                        src={url}
                        alt={`Submission Image ${idx + 1}`}
                        className="rounded-lg shadow-md object-cover w-full h-32 sm:h-40"
                        loading="lazy"
                      />
                    ))}
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
                    <span>&lt; {cropData?.brixLevels?.poor ?? 10} BRIX (Poor)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                    <span>{cropData?.brixLevels?.poor ?? 10} - {cropData?.brixLevels?.average ?? 15} BRIX (Average)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                    <span>{cropData?.brixLevels?.average ?? 15} - {cropData?.brixLevels?.good ?? 20} BRIX (Good)</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <div className="w-3 h-3 rounded-full bg-green-500"></div>
                    <span>&gt; {cropData?.brixLevels?.good ?? 20} BRIX (Excellent)</span>
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
