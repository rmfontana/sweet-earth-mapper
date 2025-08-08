import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Header from '../components/Layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { ArrowLeft, MapPin, Calendar, User, CheckCircle, AlertCircle, Edit, Trash2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchFormattedSubmissions } from '../lib/fetchSubmissions';
import { useCropThresholds } from '../contexts/CropThresholdContext';
import { getBrixColor } from '../lib/getBrixColor';
import { getBrixQuality } from '../lib/getBrixQuality';
import { fetchCropCategoryByName } from '../lib/fetchCropCategories';

const DataPointDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const { cache: thresholdsCache, loading: thresholdsLoading } = useCropThresholds();

  const [category, setCategory] = useState<string | null>(null);
  const [dataPoint, setDataPoint] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadDataPoint = async () => {
      if (!id) {
        if (isMounted) {
          setDataPoint(null);
          setLoading(false);
        }
        return;
      }

      if (isMounted) setLoading(true);

      try {
        const submissions = await fetchFormattedSubmissions();
        const found = submissions.find(point => point.id === id);
        if (isMounted) setDataPoint(found || null);
      } catch (error) {
        console.error('Failed to load data point:', error);
        if (isMounted) setDataPoint(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadDataPoint();

    return () => {
      isMounted = false;
    };
  }, [id]);

  useEffect(() => {
    let isMounted = true;

    const fetchCategoryForCrop = async () => {
      if (!dataPoint?.cropType) {
        if (isMounted) setCategory(null);
        return;
      }

      try {
        const cropData = await fetchCropCategoryByName(dataPoint.cropType);
        if (isMounted) setCategory(cropData?.category ?? null);
      } catch (error) {
        if (isMounted) setCategory(null);
      }
    };

    fetchCategoryForCrop();

    return () => {
      isMounted = false;
    };
  }, [dataPoint?.cropType]);

  if (loading || thresholdsLoading) {
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

  const cropThresholds = dataPoint.cropType ? thresholdsCache[dataPoint.cropType] : undefined;
  const colorClass = getBrixColor(dataPoint.brixLevel, cropThresholds, 'bg');
  const qualityText = getBrixQuality(dataPoint.brixLevel, cropThresholds);

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
                  <div className={`${colorClass} w-16 h-16 rounded-full flex items-center justify-center`}>
                    <span className="text-white font-bold text-xl">{dataPoint.brixLevel}</span>
                  </div>
                  <div className="text-left">
                    <p className="text-2xl font-bold text-gray-900">{dataPoint.brixLevel} BRIX</p>
                    <p className="text-sm text-gray-600">Refractometer Reading</p>
                    <Badge className={`${colorClass} mt-1 text-white`}>
                      {qualityText} Quality
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
                {category && (
                  <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Badge variant="secondary" className="text-gray-700">
                      Category: {category}
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
                {cropThresholds ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span>{`Less than ${cropThresholds.average} BRIX — Poor`}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span>{`Between ${cropThresholds.average} and ${cropThresholds.good} BRIX — Average`}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                      <span>{`Between ${cropThresholds.good} and ${cropThresholds.excellent} BRIX — Good`}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-green-700"></div>
                      <span>{`${cropThresholds.excellent} BRIX and above — Excellent`}</span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">BRIX scale data unavailable for this crop.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
};

export default DataPointDetail;
