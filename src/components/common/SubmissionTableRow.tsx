import React from 'react';
import { TableCell, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { BrixDataPoint } from '../../types';
import { MapPin, Calendar, CheckCircle, Edit, Trash2, Eye, MessageSquare, Clock, Lock, User } from 'lucide-react';
import { useBrixColorFromContext } from '../../lib/getBrixColor';

interface SubmissionTableRowProps {
  submission: BrixDataPoint;
  onDelete: (id: string) => void;
  isOwner: boolean; // Indicates if the current user is the owner (passed from parent)
  canDeleteByOwner: boolean; // Indicates if owner can delete (based on RLS and verified status, passed from parent)
  onOpenModal: (submission: BrixDataPoint) => void;
}

const SubmissionTableRow: React.FC<SubmissionTableRowProps> = ({ submission, onDelete, isOwner, canDeleteByOwner, onOpenModal }) => {
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
      onClick={() => onOpenModal(submission)} // Make the whole row clickable
    >
      {/* Crop / Variety / Brand / Store Cell */}
      <TableCell className="py-3 px-4 break-words">
        <div>
          <div className="font-semibold text-gray-900">{submission.cropType}</div>

          {submission.variety && (
            <div className="text-xs text-gray-500">{submission.variety}</div>
          )}

          {submission.brandName && (
            <div className="text-xs text-gray-800 mt-1">Brand: {submission.brandName}</div>
          )}

          {submission.locationName && (
            <div className="text-xs text-gray-700 flex items-center space-x-1 mt-1">
              <MapPin className="w-3 h-3 text-gray-500" />
              <span>{submission.locationName}</span>
            </div>
          )}

          {/* NEW: Visual indicator for owned submissions */}
          {isOwner && (
            <Badge className="flex items-center space-x-1 px-2 py-1 rounded-md bg-blue-50 text-blue-700 font-medium text-xs mt-2">
              <User className="w-3 h-3" />
              <span>Your Submission</span>
            </Badge>
          )}
        </div>
      </TableCell>

      {/* BRIX Level Cell - uses dynamic color from useBrixColorFromContext */}
      <TableCell className="text-center py-3 px-4">
        <Badge
          className={`${brixColorClass} text-white px-3 py-1 rounded-xl font-bold text-base shadow-sm`} // Changed rounded-lg to rounded-xl
        >
          {brixColorClass === 'bg-gray-300' ? 'N/A' : submission.brixLevel}
        </Badge>
      </TableCell>

      {/* Location / Notes Cell */}
      <TableCell className="py-3 px-4 break-words">
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
      <TableCell className="py-3 px-4">
        <div className="flex items-center space-x-1 text-sm text-gray-700">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span>{new Date(submission.submittedAt).toLocaleDateString()}</span>
        </div>
      </TableCell>

      {/* Verified Status Cell - uses distinct, softer colors */}
      <TableCell className="text-center py-3 px-4">
        {submission.verified ? (
          <Badge className="flex items-center space-x-1 px-3 py-1 rounded-full bg-green-100 text-green-700 font-semibold text-sm shadow-sm">
            <CheckCircle className="w-4 h-4" />
            <span>Verified</span>
          </Badge>
        ) : (
          <Badge className="flex items-center space-x-1 px-3 py-1 rounded-full bg-orange-100 text-orange-700 font-semibold text-sm shadow-sm">
            <Clock className="w-4 h-4" />
            <span>Pending</span>
          </Badge>
        )}
      </TableCell>

      {/* Actions Cell */}
      <TableCell className="text-center py-3 px-4">
        <div className="flex justify-center items-center space-x-1">
          <Button
            variant="ghost"
            size="sm"
            aria-label="View submission details"
            onClick={() => onOpenModal(submission)}
          >
            <Eye className="w-5 h-5" />
            </Button>

          {canEdit && (
            <Button
              variant="ghost"
              size="sm"
              aria-label="Edit submission"
              onClick={() => (window.location.href = `/data-point/edit/${submission.id}`)}
            >
              <Edit className="w-5 h-5" />
            </Button>
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