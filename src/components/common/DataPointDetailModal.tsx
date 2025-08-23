import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { ArrowLeft, AlertCircle, Edit, Trash2, MapPin, Loader2, Lock } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { deleteSubmission } from '../../lib/fetchSubmissions';
import { fetchCropCategoryByName } from '../../lib/fetchCropCategories';
import SubmissionDetails from './SubmissionDetails';
import { BrixDataPoint } from '../../types';
import { useToast } from '../../hooks/use-toast';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '../ui/dialog';
import { DialogFooter } from '../ui/dialog';

interface DataPointDetailModalProps {
  dataPoint: BrixDataPoint | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleteSuccess: (deletedId: string) => void;
}

const DataPointDetailModal: React.FC<DataPointDetailModalProps> = ({ dataPoint, isOpen, onClose, onDeleteSuccess }) => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();

  const [category, setCategory] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showConfirmDeleteModal, setShowConfirmDeleteModal] = useState(false);

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
        description: 'You cannot delete verified submissions as a regular user.',
        variant: 'destructive'
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
        onClose(); // Close the modal after deletion
      } else {
        toast({ title: 'Failed to delete submission.', description: 'Please try again.', variant: 'destructive' });
      }
    } catch (error) {
      console.error('Error during deletion process:', error);
      toast({ title: 'An error occurred.', description: 'Could not delete submission.', variant: 'destructive' });
    } finally {
      setIsDeleting(false);
      setShowConfirmDeleteModal(false);
    }
  };

  // Guard clause for when there's no data
  if (!dataPoint) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] p-0 overflow-hidden">
        <div className="flex flex-col lg:flex-row max-h-[90vh] overflow-y-auto">
          {/* Main Details Section */}
          <div className="lg:col-span-2 p-6">
            <SubmissionDetails dataPoint={dataPoint} showImages={true} />
            {(isOwner || isAdmin) && (
              <div className="flex flex-wrap items-center space-x-2 mt-4">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    navigate(`/data-point/edit/${dataPoint.id}`);
                    onClose(); // Close modal before navigating
                  }}
                >
                  <Edit className="w-4 h-4 mr-1" />
                  Edit
                </Button>
                {isAdmin ? (
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-red-600 hover:text-red-700"
                    onClick={handleDeleteClick}
                    disabled={isDeleting}
                  >
                    {isDeleting ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4 mr-1" />
                    )}
                    {isDeleting ? 'Deleting...' : 'Delete'}
                  </Button>
                ) : (
                  canOwnerDelete ? (
                    <Button
                      variant="outline"
                      size="sm"
                      className="text-red-600 hover:text-red-700"
                      onClick={handleDeleteClick}
                      disabled={isDeleting}
                    >
                      {isDeleting ? (
                        <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                      ) : (
                        <Trash2 className="w-4 h-4 mr-1" />
                      )}
                      {isDeleting ? 'Deleting...' : 'Delete'}
                    </Button>
                  ) : (
                    isOwner && dataPoint.verified && (
                      <span className="inline-flex items-center space-x-1 px-3 py-2 rounded-lg bg-gray-100 text-gray-600 text-sm italic border border-gray-200">
                        <Lock className="w-4 h-4" />
                        <span>Verified submissions cannot be deleted.</span>
                      </span>
                    )
                  )
                )}
              </div>
            )}
          </div>
          {/* Sidebar Section */}
          <div className="lg:col-span-1 p-6 lg:p-4 border-t lg:border-t-0 lg:border-l border-gray-200 space-y-6">
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
      </DialogContent>

      {/* Delete Confirmation Dialog */}
      <Dialog open={showConfirmDeleteModal} onOpenChange={setShowConfirmDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-red-600">Confirm Deletion</DialogTitle>
            <DialogDescription className="text-gray-700">
              <p className="mb-2">Are you sure you want to delete this BRIX measurement?</p>
              <p className="font-semibold">This action cannot be undone.</p>
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="sm:justify-end gap-2">
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