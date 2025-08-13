// src/components/common/SubmissionTableRow.tsx

import React from 'react';
import { TableCell, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { MapPin, Calendar, CheckCircle, Edit, Trash2, Eye, MessageSquare, Clock, Lock } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrixDataPoint } from '../../types';
import { useBrixColorFromContext } from '../../lib/getBrixColor';

interface SubmissionTableRowProps {
  submission: BrixDataPoint;
  onDelete: (id: string) => void;
  isOwner: boolean; // Indicates if the current user is the owner (passed from parent)
  canDeleteByOwner: boolean; // Indicates if owner can delete (based on RLS and verified status, passed from parent)
}

const SubmissionTableRow: React.FC<SubmissionTableRowProps> = ({ submission, onDelete, isOwner, canDeleteByOwner }) => {
  // Use the useBrixColorFromContext to get the background color class
  const brixColorClass = useBrixColorFromContext(
    submission.cropType?.toLowerCase().trim() || '',
    submission.brixLevel
  );

  // Determine if the edit button should be visible (only owner can edit)
  const canEdit = isOwner;

  return (
    <TableRow
      key={submission.id}
      className="hover:bg-gray-100 transition-colors duration-200"
    >
      {/* Crop / Variety / Brand / Store Cell */}
      <TableCell className="whitespace-nowrap py-3 px-4">
        <div>
          <div className="font-semibold text-gray-900">{submission.cropType}</div>

          {submission.variety && (
            <div className="text-xs text-gray-500">{submission.variety}</div>
          )}

          {submission.brandName && (
            <div className="text-xs text-gray-800 mt-1">Brand: {submission.brandName}</div>
          )}

          {submission.storeName && (
            <div className="text-xs text-gray-700 flex items-center space-x-1 mt-1">
              <MapPin className="w-3 h-3 text-gray-500" />
              <span>{submission.storeName}</span>
            </div>
          )}
        </div>
      </TableCell>

      {/* BRIX Level Cell - uses dynamic color from useBrixColorFromContext */}
      <TableCell className="text-center py-3 px-4">
        <Badge className={`${brixColorClass} text-white px-4 py-2 rounded-full font-bold text-base shadow-sm`}>
          {brixColorClass === 'bg-gray-300' ? 'N/A' : submission.brixLevel}
        </Badge>
      </TableCell>

      {/* Location / Notes Cell */}
      <TableCell className="py-3 px-4">
        <div className="flex items-center space-x-1 text-sm text-gray-700">
          <MapPin className="w-4 h-4 text-gray-500" />
          <span>{submission.locationName}</span>
        </div>
        {submission.outlier_notes && (
          <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1 line-clamp-2">
            <MessageSquare className="w-3 h-3 flex-shrink-0 text-gray-400" />
            <span className="truncate">{submission.outlier_notes}</span>
          </div>
        )}
      </TableCell>

      {/* Assessment Date Cell */}
      <TableCell className="whitespace-nowrap py-3 px-4">
        <div className="flex items-center space-x-1 text-sm text-gray-700">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span>{new Date(submission.submittedAt).toLocaleDateString()}</span>
        </div>
      </TableCell>

      {/* Verified Status Cell - uses distinct, strong colors */}
      <TableCell className="text-center py-3 px-4">
        {submission.verified ? (
          <Badge className="flex items-center space-x-1 px-3 py-1 rounded-full bg-green-700 text-white font-semibold text-sm shadow-sm">
            <CheckCircle className="w-4 h-4" />
            <span>Verified</span>
          </Badge>
        ) : (
          <Badge className="flex items-center space-x-1 px-3 py-1 rounded-full bg-orange-500 text-white font-semibold text-sm shadow-sm">
            <Clock className="w-4 h-4" />
            <span>Pending</span>
          </Badge>
        )}
      </TableCell>

      {/* Actions Cell */}
      <TableCell className="text-center py-3 px-4">
        <div className="flex justify-center items-center space-x-1">
          <Link to={`/data-point/${submission.id}`}>
            <Button variant="ghost" size="sm" aria-label="View submission details" className="text-blue-600 hover:text-blue-800">
              <Eye className="w-5 h-5" />
            </Button>
          </Link>

          {canEdit && (
            <Link to={`/data-point/edit/${submission.id}`} state={{ from: '/your-data' }}>
              <Button variant="ghost" size="sm" aria-label="Edit submission" className="text-purple-600 hover:text-purple-800">
                <Edit className="w-5 h-5" />
              </Button>
            </Link>
          )}

          {/* Delete Button / Locked Indicator */}
          {canDeleteByOwner ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onDelete(submission.id)}
              className="text-red-600 hover:text-red-800"
              aria-label="Delete submission"
            >
              <Trash2 className="w-5 h-5" />
            </Button>
          ) : (
            // If the owner cannot delete (i.e., it's verified and they are not an admin)
            isOwner && submission.verified && (
              <span title="Verified submissions cannot be deleted by non-admins." className="cursor-not-allowed">
                <Button variant="ghost" size="sm" className="text-gray-400 opacity-70 cursor-not-allowed" disabled>
                  <Lock className="w-5 h-5" />
                </Button>
              </span>
            )
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

export default SubmissionTableRow;
