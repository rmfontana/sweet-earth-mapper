import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import {
  ArrowLeft,
  Edit,
  Trash2,
  MapPin,
  Loader2,
  Lock,
  Plus,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { deleteSubmission } from '../../lib/fetchSubmissions';
import { fetchCropCategoryByName } from '../../lib/fetchCropCategories';
import SubmissionDetails from './SubmissionDetails';
import { BrixDataPoint } from '../../types';
import { useToast } from '../../hooks/use-toast';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '../ui/dialog';
import { DialogFooter } from '../ui/dialog';

interface DataPointDetailModalProps {
  dataPoint: BrixDataPoint | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleteSuccess: (deletedId: string) => void;
}

const DataPointDetailModal: React.FC<DataPointDetailModalProps> = ({
  dataPoint,
  isOpen,
  onClose,
  onDeleteSuccess,
}) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);

  // This useEffect is good, so we'll keep it as is.
  useEffect(() => {
    let isMounted = true;
    const fetchCategoryForCrop = async () => {
      if (!dataPoint?.cropType) return;
      try {
        await fetchCropCategoryByName(dataPoint.cropType);
      } catch (error) {
        console.error('Failed to fetch crop category:', error);
      }
    };
    fetchCategoryForCrop();
    return () => {
      isMounted = false;
    };
  }, [dataPoint?.cropType]);

  const isOwner = user?.id === dataPoint?.userId;
  const canOwnerDelete = isOwner && dataPoint && !dataPoint.verified;
  const isAdmin = user?.role === 'admin';

  const handleDeleteClick = () => {
    setShowConfirmDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!dataPoint || !dataPoint.id) return;

    if (!isAdmin && dataPoint.verified) {
      toast({
        title: 'Deletion Restricted',
        description: 'You cannot delete a verified submission.',
        variant: 'destructive',
      });
      setShowConfirmDeleteModal(false);
      return;
    }

    setIsDeleting(true);
    try {
      const success = await deleteSubmission(dataPoint.id);
      if (success) {
        toast({ title: 'Submission deleted successfully!', variant: 'default' });
        onDeleteSuccess(dataPoint.id);
        onClose();
      } else {
        toast({
          title: 'Failed to delete submission.',
          description: 'Please try again.',
          variant: 'destructive',
        });
      }
    } catch (error) {
      console.error('Error during deletion process:', error);
      toast({
        title: 'An error occurred.',
        description: 'Could not delete submission.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
      setShowConfirmDeleteModal(false);
    }
  };

  if (!dataPoint) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-3xl p-0 overflow-hidden rounded-xl">
        <div className="grid grid-cols-1 lg:grid-cols-3 max-h-[90vh] overflow-y-auto">
          {/* Main Details Section */}
          <div className="lg:col-span-2 p-6">
            <DialogHeader className="pb-4 border-b border-gray-200">
              <DialogTitle className="text-2xl font-bold text-gray-900">
                Submission Details
              </DialogTitle>
              <DialogDescription className="text-gray-600">
                Review the full details of this BRIX measurement.
              </DialogDescription>
            </DialogHeader>

            <div className="py-6">
              <SubmissionDetails dataPoint={dataPoint} showImages={true} />
            </div>

            {/* Action Buttons */}
            <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-200">
              <Button
                variant="outline"
                onClick={() => {
                  navigate(`/data-point/edit/${dataPoint.id}`);
                  onClose();
                }}
              >
                <Edit className="w-4 h-4 mr-2" />
                Edit
              </Button>
              {isAdmin || canOwnerDelete ? (
                <Button
                  variant="destructive"
                  onClick={handleDeleteClick}
                  disabled={isDeleting}
                >
                  {isDeleting ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Trash2 className="w-4 h-4 mr-2" />
                  )}
                  {isDeleting ? 'Deleting...' : 'Delete'}
                </Button>
              ) : (
                isOwner &&
                dataPoint.verified && (
                  <span className="inline-flex items-center space-x-1 px-3 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm italic border border-gray-200">
                    <Lock className="w-4 h-4" />
                    <span>Verified submissions cannot be deleted.</span>
                  </span>
                )
              )}
            </div>
          </div>

          {/* Sidebar Section */}
          <div className="lg:col-span-1 p-6 lg:border-l border-gray-200 flex flex-col space-y-6">
            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">Quick Actions</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Link to="/map" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <MapPin className="w-4 h-4 mr-2" />
                    View on Map
                  </Button>
                </Link>
                <Link to="/data" className="block">
                  <Button variant="outline" className="w-full justify-start">
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    View All Submissions
                  </Button>
                </Link>
              </CardContent>
            </Card>

            <Card className="bg-white shadow-sm">
              <CardHeader>
                <CardTitle className="text-xl font-semibold">BRIX Scale Reference</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {dataPoint.poorBrix != null &&
                dataPoint.averageBrix != null &&
                dataPoint.goodBrix != null &&
                dataPoint.excellentBrix != null ? (
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded-full bg-red-500 flex-shrink-0"></div>
                      <span>
                        <strong className="font-medium">Poor:</strong> Less than {dataPoint.averageBrix} BRIX
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded-full bg-orange-500 flex-shrink-0"></div>
                      <span>
                        <strong className="font-medium">Average:</strong> Between {dataPoint.averageBrix} and {dataPoint.goodBrix} BRIX
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded-full bg-yellow-400 flex-shrink-0"></div>
                      <span>
                        <strong className="font-medium">Good:</strong> Between {dataPoint.goodBrix} and {dataPoint.excellentBrix} BRIX
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <div className="w-4 h-4 rounded-full bg-green-700 flex-shrink-0"></div>
                      <span>
                        <strong className="font-medium">Excellent:</strong> {dataPoint.excellentBrix} BRIX and above
                      </span>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-gray-500 italic">
                    BRIX scale data unavailable for this crop.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showConfirmDeleteModal} onOpenChange={setShowConfirmDeleteModal}>
        <DialogContent className="sm:max-w-md p-6">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold text-red-600">
              Confirm Deletion
            </DialogTitle>
            <DialogDescription className="text-gray-700 mt-2">
              <p className="mb-2">Are you sure you want to delete this BRIX measurement?</p>
              <p className="font-semibold">This action cannot be undone.</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="mt-6 flex justify-end gap-3">
            <Button
              variant="outline"
              onClick={() => setShowConfirmDeleteModal(false)}
              disabled={isDeleting}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleConfirmDelete}
              disabled={isDeleting}
            >
              {isDeleting ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Trash2 className="w-4 h-4 mr-2" />
              )}
              {isDeleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
};

export default DataPointDetailModal;