// src/components/SubmissionDetails.tsx

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { MapPin, Calendar, User, CheckCircle, AlertCircle, MessageSquare, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useCropThresholds } from '../../contexts/CropThresholdContext'; // Corrected import path for context
import { getBrixColor } from '../../lib/getBrixColor';
import { getBrixQuality } from '../../lib/getBrixQuality';
import { BrixDataPoint } from '../../types';
// No longer need to import supabase directly here if `dataPoint.images` already contains public URLs

interface SubmissionDetailsProps {
  dataPoint: BrixDataPoint;
  showImages?: boolean; // Prop to control image section visibility
}

const SubmissionDetails: React.FC<SubmissionDetailsProps> = ({ dataPoint, showImages = true }) => {
  const { cache: thresholdsCache } = useCropThresholds();
  // Fallback to dataPoint's own brix thresholds if not found in cache
  const cropThresholds = dataPoint.cropType ? (thresholdsCache[dataPoint.cropType] || {
    poor: dataPoint.poorBrix,
    average: dataPoint.averageBrix,
    good: dataPoint.goodBrix,
    excellent: dataPoint.excellentBrix,
  }) : undefined;

  const colorClass = getBrixColor(dataPoint.brixLevel, cropThresholds, 'bg');
  const qualityText = getBrixQuality(dataPoint.brixLevel, cropThresholds);

  // We are now assuming dataPoint.images already contains the public URLs.
  // The state and effect for fetching public URLs is no longer needed.
  // We'll use a local state for imagesError to report issues with the provided URLs.
  const [imagesLoading, setImagesLoading] = useState(false); // No loading state needed for pre-fetched URLs
  const [imagesError, setImagesError] = useState<string | null>(null);

  useEffect(() => {
    // Check if images array exists and if any URL is problematic
    if (showImages && dataPoint.images && dataPoint.images.length > 0) {
      const hasInvalidUrl = dataPoint.images.some(url => !url || typeof url !== 'string' || !url.startsWith('http'));
      if (hasInvalidUrl) {
        setImagesError("Some image URLs are missing or invalid. Check the data source.");
      } else {
        setImagesError(null); // Clear any previous errors if URLs look good
      }
    } else if (showImages && (!dataPoint.images || dataPoint.images.length === 0)) {
      setImagesError(null); // No error, just no images
    }
    setImagesLoading(false); // Always false as we're not fetching here
  }, [dataPoint.images, showImages]);


  return (
    <Card>
      <CardHeader>
        {/* Title and Verified Status */}
        <CardTitle className="text-2xl flex items-center space-x-3">
          <span>{dataPoint.cropType}</span>
          {dataPoint.verified && (
            <CheckCircle className="w-6 h-6 text-green-600" aria-label="Verified" />
          )}
        </CardTitle>
        {dataPoint.variety && (
          <p className="text-gray-600 mt-1">{dataPoint.variety}</p>
        )}
      </CardHeader>

      <CardContent className="space-y-6">
        {/* BRIX Reading Section */}
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

        {/* Key Measurement & Submission Details Grid */}
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

          {/* Verification Status */}
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

          {/* Location Name & Coordinates */}
          <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
            <MapPin className="w-5 h-5 text-gray-600" />
            <div>
              <p className="text-sm text-gray-600">Location</p>
              <p className="font-medium">{dataPoint.locationName}</p>
              <p className="text-xs text-gray-500">
                {dataPoint.latitude?.toFixed(4)}, {dataPoint.longitude?.toFixed(4)}
              </p>
            </div>
          </div>

          {/* Store Name (Conditional) */}
          {dataPoint.storeName && (
            <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
              <MapPin className="w-5 h-5 text-gray-600" />
              <div>
                <p className="text-sm text-gray-600">Store</p>
                <p className="font-medium">{dataPoint.storeName}</p>
              </div>
            </div>
          )}

          {/* Brand Name (Conditional) */}
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

        {/* Outlier Notes Section */}
        {dataPoint.outlier_notes && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-gray-600" />
              <span>Outlier Notes</span>
            </h3>
            <p className="text-gray-700">{dataPoint.outlier_notes}</p>
          </div>
        )}

        {/* Image Section (Conditional) */}
        {showImages && (
          <div className="pt-4 border-t border-gray-100">
            <h3 className="flex items-center space-x-2 text-lg font-bold text-gray-900 mb-4">
              <ImageIcon className="w-6 h-6 text-gray-600" />
              <span>Reference Images ({dataPoint.images?.length || 0})</span>
            </h3>
            {imagesLoading ? ( // This will likely always be false now
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <span className="ml-3 text-gray-600">Loading images...</span>
              </div>
            ) : imagesError ? (
              <div className="text-red-600 text-center py-8">{imagesError}</div>
            ) : (dataPoint.images?.length === 0 || !dataPoint.images) ? (
              <p className="text-gray-500 italic">No images available for this submission.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {dataPoint.images.map((url: string, index: number) => (
                  <div key={index} className="relative w-full pb-[75%] rounded-lg overflow-hidden shadow-md group">
                    <img
                      src={url} // Directly use the URL from dataPoint.images
                      alt={`Submission image ${index + 1}`}
                      className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                      onError={(e) => {
                        e.currentTarget.src = `https://placehold.co/400x300/CCCCCC/333333?text=Image+Error`;
                        e.currentTarget.alt = "Error loading image";
                      }}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default SubmissionDetails;
