import React from 'react';
import { TableCell, TableRow } from '../ui/table';
import { Badge } from '../ui/badge';
import { format } from 'date-fns';
import { CheckCircle, Clock, ExternalLink, Trash2, Edit } from 'lucide-react';
import { Button } from '../ui/button';
import { Link } from 'react-router-dom';
import { BrixDataPoint } from '../../types'; // Ensure this path is correct based on your project structure

interface SubmissionTableRowProps {
  submission: BrixDataPoint;
  onDelete: (id: string) => void;
  isOwner: boolean; // Indicates if the current user is the owner
  // New prop: indicates if the current user (who is the owner) can delete this specific submission.
  // This will be true if isOwner is true AND submission is NOT verified.
  canDeleteByOwner: boolean;
}

const SubmissionTableRow: React.FC<SubmissionTableRowProps> = ({
  submission,
  onDelete,
  isOwner,
  canDeleteByOwner, // Use the new prop
}) => {
  return (
    <TableRow key={submission.id}>
      <TableCell className="font-medium">
        <p className="text-gray-900 font-semibold">{submission.cropType}</p>
        {submission.variety && (
          <p className="text-sm text-gray-600 italic">{submission.variety}</p>
        )}
        <p className="text-sm text-gray-700">{submission.brandName}</p>
        <p className="text-xs text-gray-500">{submission.storeName}</p>
      </TableCell>
      <TableCell className="text-center font-bold text-lg">
        {submission.brixLevel.toFixed(1)}
      </TableCell>
      <TableCell>
        <p className="text-gray-900">{submission.locationName}</p>
        {submission.outlier_notes && (
          <p className="text-sm text-gray-600 italic line-clamp-2">
            Notes: {submission.outlier_notes}
          </p>
        )}
      </TableCell>
      <TableCell>
        {format(new Date(submission.submittedAt), 'MMM dd, yyyy')}
      </TableCell>
      <TableCell className="text-center">
        {submission.verified ? (
          <Badge className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs">
            <CheckCircle className="w-3 h-3 mr-1" /> Verified
          </Badge>
        ) : (
          <Badge className="bg-orange-100 text-orange-700 px-3 py-1 rounded-full text-xs">
            <Clock className="w-3 h-3 mr-1" /> Pending
          </Badge>
        )}
      </TableCell>
      <TableCell className="text-center">
        <div className="flex items-center justify-center space-x-1">
          <Link to={`/data-point/${submission.id}`}>
            <Button variant="ghost" size="sm">
              <ExternalLink className="h-4 w-4" />
            </Button>
          </Link>
          {isOwner && (
            <Link to={`/data-point/edit/${submission.id}`}>
              <Button variant="ghost" size="sm">
                <Edit className="h-4 w-4" />
              </Button>
            </Link>
          )}
          {/* Delete button: Only show if isOwner AND canDeleteByOwner */}
          {isOwner && canDeleteByOwner && (
            <Button
              variant="ghost"
              size="sm"
              className="text-red-500 hover:text-red-700"
              onClick={() => onDelete(submission.id)}
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      </TableCell>
    </TableRow>
  );
};

export default SubmissionTableRow;