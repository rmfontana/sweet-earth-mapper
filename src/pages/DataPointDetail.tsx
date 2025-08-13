// src/pages/DataPointDetail.tsx

import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import Header from '../components/Layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { ArrowLeft, AlertCircle, Edit, Trash2, MapPin } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchSubmissionById } from '../lib/fetchSubmissions'; // Use the new function from your existing file
import { fetchCropCategoryByName } from '../lib/fetchCropCategories'; // Assuming this utility exists
import SubmissionDetails from '../components/common/SubmissionDetails';
import { BrixDataPoint } from '../types';

const DataPointDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [category, setCategory] = useState<string | null>(null); // Still used for sidebar 'BRIX Scale Reference'
  const [dataPoint, setDataPoint] = useState<BrixDataPoint | null>(null);
  const [loading, setLoading] = useState(true);

  // Load a single data point directly by ID
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
        const found = await fetchSubmissionById(id); // Use the new function
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

  // Fetch category for crop (remains as is, specific to this component's sidebar)
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
        console.error('Failed to fetch crop category:', error);
        if (isMounted) setCategory(null);
      }
    };
    fetchCategoryForCrop();
    return () => {
      isMounted = false;
    };
  }, [dataPoint?.cropType]);


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

  const isOwner = user?.display_name === dataPoint.submittedBy;

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

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Details (using the new SubmissionDetails component) */}
          <div className="lg:col-span-2">
            <SubmissionDetails dataPoint={dataPoint} showImages={true} />
            {isOwner && (
              <div className="flex space-x-2 mt-4">
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
                  Delete {/* TODO: Implement actual delete logic */}
                </Button>
              </div>
            )}
          </div>

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

            {/* Data Quality Info (remains here as it uses `category` and dataPoint's thresholds) */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">BRIX Scale Reference</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {dataPoint.poorBrix != null && dataPoint.averageBrix != null && dataPoint.goodBrix != null && dataPoint.excellentBrix != null ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-red-500"></div>
                      <span>{`Less than ${dataPoint.averageBrix} BRIX — Poor`}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                      <span>{`Between ${dataPoint.averageBrix} and ${dataPoint.goodBrix} BRIX — Average`}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-yellow-400"></div>
                      <span>{`Between ${dataPoint.goodBrix} and ${dataPoint.excellentBrix} BRIX — Good`}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-3 h-3 rounded-full bg-green-700"></div>
                      <span>{`${dataPoint.excellentBrix} BRIX and above — Excellent`}</span>
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
