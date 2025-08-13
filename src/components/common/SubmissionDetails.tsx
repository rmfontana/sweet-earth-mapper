// src/components/SubmissionDetails.tsx

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';;
import { Badge } from  '../ui/badge';;
import { MapPin, Calendar, User, CheckCircle, AlertCircle, MessageSquare } from 'lucide-react';
import { useCropThresholds } from '../../contexts/CropThresholdContext';
import { getBrixColor } from '../../lib/getBrixColor';
import { getBrixQuality } from '../../lib/getBrixQuality';
import { BrixDataPoint } from '../../types';

interface SubmissionDetailsProps {
  dataPoint: BrixDataPoint;
  showImages?: boolean;
}

const SubmissionDetails: React.FC<SubmissionDetailsProps> = ({ dataPoint, showImages = true }) => {
  const { cache: thresholdsCache } = useCropThresholds();
  const cropThresholds = dataPoint.cropType ? thresholdsCache[dataPoint.cropType] : undefined;
  const colorClass = getBrixColor(dataPoint.brixLevel, cropThresholds, 'bg');
  const qualityText = getBrixQuality(dataPoint.brixLevel, cropThresholds);

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
                {dataPoint.latitude.toFixed(4)}, {dataPoint.longitude.toFixed(4)}
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

        {/* Outlier Notes Section - NEW! */}
        {dataPoint.outlier_notes && (
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-2 flex items-center space-x-2">
              <MessageSquare className="w-5 h-5 text-gray-600" />
              <span>Outlier Notes</span>
            </h3>
            <p className="text-gray-700">{dataPoint.outlier_notes}</p>
          </div>
        )}

        {/* Submission Images (Conditional) */}
        {showImages && dataPoint.images && dataPoint.images.length > 0 && (
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
  );
};

export default SubmissionDetails;
