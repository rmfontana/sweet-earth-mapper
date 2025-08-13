// src/components/SubmissionTableRow.tsx

import React from 'react';
import { TableCell, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { MapPin, Calendar, CheckCircle, Edit, Trash2, Eye, MessageSquare } from 'lucide-react';
import { Link } from 'react-router-dom';
import { BrixDataPoint } from '../../types';
import { useBrixColorFromContext } from '../../lib/getBrixColor'; // Assuming this utility is correctly fetching thresholds

interface SubmissionTableRowProps {
  submission: BrixDataPoint;
  onDelete: (id: string) => void;
  isOwner?: boolean;
}

const SubmissionTableRow: React.FC<SubmissionTableRowProps> = ({ submission, onDelete, isOwner = false }) => {
  const brixColorClass = useBrixColorFromContext(
    submission.cropType?.toLowerCase().trim() || '',
    submission.brixLevel
  );

  return (
    <TableRow
      key={submission.id}
      className="hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
    >
      <TableCell className="whitespace-nowrap">
        <div>
          <div className="font-semibold text-gray-900">{submission.cropType}</div>

          {submission.variety && (
            <div className="text-xs text-gray-500">{submission.variety}</div>
          )}

          {submission.brandName && (
            <div className="text-xs text-indigo-600 mt-1">Brand: {submission.brandName}</div>
          )}

          {submission.storeName && (
            <div className="text-xs text-green-600 flex items-center space-x-1 mt-1">
              <MapPin className="w-3 h-3" />
              <span>{submission.storeName}</span>
            </div>
          )}
        </div>
      </TableCell>

      <TableCell className="text-center">
        <Badge className={`${brixColorClass} text-white px-3 py-1 rounded-full`}>
          {brixColorClass === 'bg-gray-300' ? '...' : submission.brixLevel}
        </Badge>
      </TableCell>

      <TableCell>
        <div className="flex items-center space-x-1 text-sm text-gray-700">
          <MapPin className="w-4 h-4" />
          <span>{submission.locationName}</span>
        </div>
        {submission.outlier_notes && (
          <div className="flex items-center space-x-1 text-xs text-gray-500 mt-1">
            <MessageSquare className="w-3 h-3" />
            <span>Notes added</span>
          </div>
        )}
      </TableCell>

      <TableCell className="whitespace-nowrap">
        <div className="flex items-center space-x-1 text-sm text-gray-700">
          <Calendar className="w-4 h-4" />
          <span>{new Date(submission.submittedAt).toLocaleDateString()}</span>
        </div>
      </TableCell>

      <TableCell className="text-center">
        {submission.verified ? (
          <Badge variant="secondary" className="flex items-center space-x-1 px-2 py-1 rounded-full bg-green-100 text-green-800">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm font-medium">Verified</span>
          </Badge>
        ) : (
          <Badge variant="outline" className="text-sm font-medium px-2 py-1 rounded-full">
            Pending
          </Badge>
        )}
      </TableCell>

      <TableCell className="text-center">
        <div className="flex justify-center space-x-2">
          <Link to={`/data-point/${submission.id}`}>
            <Button variant="ghost" size="sm" aria-label="View submission">
              <Eye className="w-5 h-5" />
            </Button>
          </Link>
          {isOwner && (
            <>
              <Link to={`/data-point/${submission.id}?edit=true`} state={{ from: '/your-data' }}>
                <Button variant="ghost" size="sm" aria-label="Edit submission">
                  <Edit className="w-5 h-5" />
                </Button>
              </Link>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onDelete(submission.id)}
                className="text-red-600 hover:text-red-800"
                aria-label="Delete submission"
              >
                <Trash2 className="w-5 h-5" />
              </Button>
            </>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

export default SubmissionTableRow;
