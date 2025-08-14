import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { MapPin, Calendar, User, CheckCircle, AlertCircle, MessageSquare, Image as ImageIcon, Loader2 } from 'lucide-react';
import { useCropThresholds } from '../../contexts/CropThresholdContext';
import { getBrixColor } from '../../lib/getBrixColor';
import { getBrixQuality } from '../../lib/getBrixQuality';
import { BrixDataPoint } from '../../types';
import { supabase } from '../../integrations/supabase/client';

interface SupabasePublicUrlResponse {
  data: {
    publicUrl: string;
  } | null;
  error: Error | null;
}

interface SubmissionDetailsProps {
  dataPoint: BrixDataPoint;
  showImages?: boolean;
}

const SubmissionDetails: React.FC<SubmissionDetailsProps> = ({ dataPoint, showImages = true }) => {
  const { cache: thresholdsCache } = useCropThresholds();
  const cropThresholds = dataPoint.cropType ? (thresholdsCache[dataPoint.cropType] || {
    poor: dataPoint.poorBrix,
    average: dataPoint.averageBrix,
    good: dataPoint.goodBrix,
    excellent: dataPoint.excellentBrix,
  }) : undefined;

  const colorClass = getBrixColor(dataPoint.brixLevel, cropThresholds, 'bg');
  const qualityText = getBrixQuality(dataPoint.brixLevel, cropThresholds);

  const [imagePublicUrls, setImagePublicUrls] = useState<string[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);
  const [imagesError, setImagesError] = useState<string | null>(null);

  useEffect(() => {
    const fetchImageUrls = async () => {
      console.log('--- FETCH IMAGE URLs STARTED ---');
      console.log('showImages prop:', showImages);
      console.log('dataPoint.images:', dataPoint.images);

      if (!showImages || !dataPoint.images || !Array.isArray(dataPoint.images) || dataPoint.images.length === 0) {
        console.log('Condition for fetching images not met. Setting to empty array.');
        setImagePublicUrls([]);
        setImagesLoading(false);
        return;
      }

      setImagesLoading(true);
      setImagesError(null);
      const urls: string[] = [];
      let hasOverallError = false;

      console.log(`Processing ${dataPoint.images.length} image paths.`);

      for (const imagePath of dataPoint.images) {
        console.log(`Attempting to get public URL for path: "${imagePath}"`);
        if (typeof imagePath !== 'string' || imagePath === '') {
          console.warn('Invalid image path found:', imagePath);
          continue;
        }

        try {
          const response = supabase.storage
            .from('submission-images-bucket')
            .getPublicUrl(imagePath) as SupabasePublicUrlResponse;

          console.log('Supabase getPublicUrl response:', response);

          if (response.error) {
            console.error(`Error getting public URL for ${imagePath}:`, response.error);
            urls.push(`https://placehold.co/400x300/CCCCCC/333333?text=Error`);
            hasOverallError = true;
          } else if (response.data?.publicUrl) {
            console.log(`Successfully got public URL: ${response.data.publicUrl}`);
            urls.push(response.data.publicUrl);
          } else {
            console.warn(`No public URL returned for ${imagePath}.`);
            urls.push(`https://placehold.co/400x300/CCCCCC/333333?text=Missing+URL`);
            hasOverallError = true;
          }
        } catch (err: any) {
          console.error(`Unexpected error fetching public URL for ${imagePath}:`, err);
          urls.push(`https://placehold.co/400x300/CCCCCC/333333?text=Unhandled+Error`);
          hasOverallError = true;
        }
      }

      console.log('Final image URLs to be set:', urls);
      setImagePublicUrls(urls);
      if (hasOverallError) {
        setImagesError("Some images failed to load. Check console for details.");
      }
      setImagesLoading(false);
      console.log('--- FETCH IMAGE URLs FINISHED ---');
    };

    fetchImageUrls();
  }, [dataPoint.images, showImages]);

  return (
    <Card>
      <CardHeader>
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
        {dataPoint.outlier_notes && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-gray-600" />
              <span>Outlier Notes</span>
            </h3>
            <p className="text-gray-700">{dataPoint.outlier_notes}</p>
          </div>
        )}
        {showImages && (
          <div className="pt-4 border-t border-gray-100">
            <h3 className="flex items-center space-x-2 text-lg font-bold text-gray-900 mb-4">
              <ImageIcon className="w-6 h-6 text-gray-600" />
              <span>Reference Images ({imagePublicUrls.length})</span>
            </h3>
            {imagesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                <span className="ml-3 text-gray-600">Loading images...</span>
              </div>
            ) : imagesError ? (
              <div className="text-red-600 text-center py-8">{imagesError}</div>
            ) : imagePublicUrls.length === 0 ? (
              <p className="text-gray-500 italic">No images available for this submission.</p>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {imagePublicUrls.map((url: string, index: number) => (
                  <div key={index} className="relative w-full pb-[75%] rounded-lg overflow-hidden shadow-md group">
                    <img
                      src={url}
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