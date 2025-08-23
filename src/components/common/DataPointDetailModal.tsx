import React, { useState, useEffect } from 'react';
import { BrixDataPoint } from '../../types';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '../ui/dialog';
import { Badge } from '../ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableRow,
} from '../ui/table';
import {
  MapPin,
  Leaf,
  Droplets,
  Calendar,
  User,
  Check,
  Store,
  Tag,
  MessageCircle,
  Clock,
  ExternalLink,
  X,
  Edit,
  AlertCircle,
  Loader2,
  Image as ImageIcon,
  CheckCircle,
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { deleteSubmission } from '../../lib/fetchSubmissions';
import { useToast } from '../ui/use-toast';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { supabase } from '../../integrations/supabase/client';
import { getBrixColor } from '../../lib/getBrixColor';
import { getBrixQuality } from '../../lib/getBrixQuality';
import { useCropThresholds } from '../../contexts/CropThresholdContext';

interface DataPointDetailModalProps {
  dataPoint: BrixDataPoint | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleteSuccess?: (id: string) => void;
  onUpdateSuccess?: (dataPoint: BrixDataPoint) => void;
}

// Type guard to check if the joined data is a valid object and not an error
const isValidJoinedData = (data: any): data is { id: string; name: string; } | { id: string; display_name: string; } => {
  if (data && typeof data === 'object' && !('error' in data)) {
    return true;
  }
  return false;
};

const DataPointDetailModal: React.FC<DataPointDetailModalProps> = ({
  dataPoint: initialDataPoint,
  isOpen,
  onClose,
  onDeleteSuccess,
  onUpdateSuccess,
}) => {
  const { isAdmin, user } = useAuth();
  const { toast } = useToast();
  const { cache: thresholdsCache } = useCropThresholds();
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [assessmentDate, setAssessmentDate] = useState('');
  const [cropVariety, setCropVariety] = useState('');
  const [notes, setNotes] = useState('');
  const [brixLevel, setBrixLevel] = useState<number | ''>('');
  const [verified, setVerified] = useState(false);
  const [verifiedById, setVerifiedById] = useState('');
  const [locationId, setLocationId] = useState('');
  const [cropId, setCropId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [brandId, setBrandId] = useState('');

  const [brands, setBrands] = useState<any[]>([]);
  const [crops, setCrops] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  const [imagesLoading, setImagesLoading] = useState(false);

  useEffect(() => {
    async function fetchAllData() {
      if (!isOpen || !initialDataPoint) return;

      setError(null);
      
      const fetchImages = async () => {
        setImagesLoading(true);
        if (!initialDataPoint.images || !Array.isArray(initialDataPoint.images) || initialDataPoint.images.length === 0) {
          setImageUrls([]);
          setImagesLoading(false);
          return;
        }

        const urls: string[] = [];
        const projectRef = 'wbkzczcqlorsewoofwqe'; 
        const bucketName = 'submission-images-bucket';

        for (const imagePath of initialDataPoint.images) {
          if (typeof imagePath === 'string' && imagePath !== '') {
            const publicUrl = `https://${projectRef}.supabase.co/storage/v1/object/public/${bucketName}/${imagePath}`;
            urls.push(publicUrl);
          }
        }
        setImageUrls(urls);
        setImagesLoading(false);
      };

      try {
        const [brandsRes, cropsRes, locationsRes, storesRes, usersRes] = await Promise.all([
          supabase.from('brands').select('id, name').order('name'),
          supabase.from('crops').select('id, name, category').order('name'),
          supabase.from('locations').select('id, name').order('name'),
          supabase.from('stores').select('id, name').order('name'),
          isAdmin ? supabase.from('users').select('id, display_name').order('display_name') : Promise.resolve({ data: [] }),
        ]);

        const { data: submissionData, error: submissionError } = await supabase.from('submissions').select(`
          id,
          assessment_date,
          crop_variety,
          brix_value,
          verified,
          verified_at,
          outlier_notes,
          user_id,
          location:location_id (id, name),
          crop:crop_id (id, name, category),
          store:store_id (id, name),
          brand:brand_id (id, name),
          user:user_id (id, display_name),
          verifier:verified_by (id, display_name)
        `).eq('id', initialDataPoint.id).single();

        if (submissionError) throw submissionError;

        setBrands(brandsRes.data ?? []);
        setCrops(cropsRes.data ?? []);
        setLocations(locationsRes.data ?? []);
        setStores(storesRes.data ?? []);
        setUsers(usersRes.data ?? []);

        if (submissionData) {
          setAssessmentDate(submissionData.assessment_date ? new Date(submissionData.assessment_date).toISOString().split('T')[0] : '');
          setCropVariety(submissionData.crop_variety || initialDataPoint.variety || '');
          setNotes(submissionData.outlier_notes || initialDataPoint.outlier_notes || '');
          setBrixLevel(submissionData.brix_value ?? initialDataPoint.brixLevel);
          setVerified(submissionData.verified);
          setLocationId(isValidJoinedData(submissionData.location) ? submissionData.location.id : '');
          setCropId(isValidJoinedData(submissionData.crop) ? submissionData.crop.id : '');
          setStoreId(isValidJoinedData(submissionData.store) ? submissionData.store.id : '');
          setBrandId(isValidJoinedData(submissionData.brand) ? submissionData.brand.id : '');
          setVerifiedById(isValidJoinedData(submissionData.verifier) ? submissionData.verifier.id : '');
        }

      } catch (err) {
        console.error('An error occurred during data fetching:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error';
        setError(`Failed to load data for editing: ${errorMessage}`);
        toast({
          title: 'Error',
          description: `Failed to load data for editing: ${errorMessage}`,
          variant: 'destructive',
        });
      }
      fetchImages();
    }
    fetchAllData();
  }, [isOpen, initialDataPoint, isAdmin, toast]);

  const handleDelete = async () => {
    if (!initialDataPoint || !user) return;
    setIsDeleting(true);
    try {
      const success = await deleteSubmission(initialDataPoint.id);
      if (success) {
        toast({
          title: 'Submission Deleted',
          description: `The submission for ${initialDataPoint.cropType} has been permanently deleted.`,
        });
        onDeleteSuccess?.(initialDataPoint.id);
      } else {
        throw new Error('Deletion failed');
      }
    } catch (err) {
      console.error('Failed to delete submission:', err);
      toast({
        title: 'Deletion Failed',
        description: 'There was an error deleting the submission. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleSave = async () => {
    if (!initialDataPoint) return;
    setSaving(true);
    try {
      const updateData: any = {
        assessment_date: assessmentDate || null,
        crop_variety: cropVariety || null,
        outlier_notes: notes || null,
        brix_value: brixLevel === '' ? null : Number(brixLevel),
        location_id: locationId || null,
        crop_id: cropId || null,
        store_id: storeId || null,
        brand_id: brandId || null,
      };

      if (isAdmin) {
        updateData.verified = verified;
        updateData.verified_by = verifiedById || null;
      }

      const { error } = await supabase
        .from('submissions')
        .update(updateData)
        .eq('id', initialDataPoint.id);

      if (error) throw error;
      
      const updatedLocationName = locations.find(loc => loc.id === locationId)?.name || '';
      const updatedCropName = crops.find(c => c.id === cropId)?.name || '';
      const updatedStoreName = stores.find(s => s.id === storeId)?.name || '';
      const updatedBrandName = brands.find(b => b.id === brandId)?.name || '';
      const updatedVerifiedByName = users.find(u => u.id === verifiedById)?.display_name || '';

      const updatedData: BrixDataPoint = {
        ...initialDataPoint,
        variety: cropVariety,
        brixLevel: brixLevel as number,
        submittedAt: assessmentDate,
        outlier_notes: notes,
        verified: verified,
        verifiedAt: verified ? new Date().toISOString() : null,
        verifiedBy: updatedVerifiedByName,
        verifiedByUserId: verifiedById,
        locationId: locationId,
        locationName: updatedLocationName,
        cropId: cropId,
        cropType: updatedCropName,
        storeId: storeId,
        storeName: updatedStoreName,
        brandId: brandId,
        brandName: updatedBrandName,
      };
      
      onUpdateSuccess?.(updatedData);
      setIsEditing(false);
      toast({
        title: 'Submission Updated',
        description: `The submission for ${updatedData.cropType} has been successfully updated.`,
      });
    } catch (error) {
      console.error('Failed to save data point:', error);
      toast({
        title: 'Update Failed',
        description: 'There was an error updating the submission. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (!initialDataPoint) {
    return null;
  }

  const isOwner = user?.id === initialDataPoint.userId;
  const canEdit = isAdmin || (isOwner && !initialDataPoint.verified);
  const canDelete = isAdmin || (isOwner && !initialDataPoint.verified);
  
  const cropThresholds = initialDataPoint.cropType ? (thresholdsCache[initialDataPoint.cropType] || {
    poor: initialDataPoint.poorBrix,
    average: initialDataPoint.averageBrix,
    good: initialDataPoint.goodBrix,
    excellent: initialDataPoint.excellentBrix,
  }) : undefined;

  const colorClass = getBrixColor(initialDataPoint.brixLevel, cropThresholds, 'bg');
  const qualityText = getBrixQuality(initialDataPoint.brixLevel, cropThresholds);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md md:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center text-2xl font-bold">
            {isEditing ? `Edit Submission` : `Details for ${initialDataPoint.cropType}`}
            <div className="flex space-x-2">
                {canEdit && !isEditing && (
                <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                    <Edit className="w-5 h-5" />
                </Button>
                )}
                <Button variant="ghost" size="icon" onClick={onClose}>
                    <X className="w-5 h-5" />
                </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        {error && (
          <div className="flex items-center p-4 bg-red-100 text-red-800 rounded-lg">
            <AlertCircle className="w-5 h-5 mr-3" />
            <p>{error}</p>
          </div>
        )}

        {isEditing ? (
          <div className="space-y-6">
            {!canEdit && (
              <div className="flex items-center p-4 bg-yellow-100 text-yellow-800 rounded-lg">
                <AlertCircle className="w-5 h-5 mr-3" />
                <p>This data point is verified and can no longer be edited, except by an administrator.</p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Droplets className="w-5 h-5 text-gray-600" />
                    <div>
                        <Label className="text-sm text-gray-600">BRIX Level</Label>
                        <Input type="number" value={brixLevel} onChange={e => setBrixLevel(e.target.value === '' ? '' : Number(e.target.value))} min={0} step={0.1} disabled={!canEdit} className="mt-1" />
                    </div>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    <div>
                        <Label className="text-sm text-gray-600">Assessment Date</Label>
                        <Input type="date" value={assessmentDate} onChange={e => setAssessmentDate(e.target.value)} disabled={!canEdit} className="mt-1" />
                    </div>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Leaf className="w-5 h-5 text-gray-600" />
                    <div>
                        <Label className="text-sm text-gray-600">Crop</Label>
                        <div className="flex mt-1">
                            <Input
                                type="text"
                                value={cropVariety}
                                onChange={e => setCropVariety(e.target.value)}
                                placeholder="Variety"
                                disabled={!canEdit}
                                className="mr-2"
                            />
                            <select value={cropId} onChange={e => setCropId(e.target.value)} disabled={!canEdit} className="w-full border rounded px-3 py-2 bg-white disabled:bg-gray-100">
                                <option value="">Select Crop</option>
                                {crops.map(crop => (<option key={crop.id} value={crop.id}>{crop.name}</option>))}
                            </select>
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <MapPin className="w-5 h-5 text-gray-600" />
                    <div>
                        <Label className="text-sm text-gray-600">Location</Label>
                        <select value={locationId} onChange={e => setLocationId(e.target.value)} disabled={!canEdit} className="w-full border rounded px-3 py-2 bg-white disabled:bg-gray-100 mt-1">
                            <option value="">Select Location</option>
                            {locations.map(loc => (<option key={loc.id} value={loc.id}>{loc.name}</option>))}
                        </select>
                    </div>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Store className="w-5 h-5 text-gray-600" />
                    <div>
                        <Label className="text-sm text-gray-600">Store</Label>
                        <div className="flex mt-1">
                            <Input
                                type="text"
                                value={initialDataPoint.storeName || ''}
                                onChange={() => {}}
                                placeholder="Store Name"
                                disabled={true}
                                className="mr-2"
                            />
                            <select value={storeId} onChange={e => setStoreId(e.target.value)} disabled={!canEdit} className="w-full border rounded px-3 py-2 bg-white disabled:bg-gray-100">
                                <option value="">Select Store</option>
                                {stores.map(store => (<option key={store.id} value={store.id}>{store.name}</option>))}
                            </select>
                        </div>
                    </div>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Tag className="w-5 h-5 text-gray-600" />
                    <div>
                        <Label className="text-sm text-gray-600">Brand</Label>
                        <div className="flex mt-1">
                            <Input
                                type="text"
                                value={initialDataPoint.brandName || ''}
                                onChange={() => {}}
                                placeholder="Brand Name"
                                disabled={true}
                                className="mr-2"
                            />
                            <select value={brandId} onChange={e => setBrandId(e.target.value)} disabled={!canEdit} className="w-full border rounded px-3 py-2 bg-white disabled:bg-gray-100">
                                <option value="">Select Brand</option>
                                {brands.map(brand => (<option key={brand.id} value={brand.id}>{brand.name}</option>))}
                            </select>
                        </div>
                    </div>
                </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
                <h3 className="font-semibold text-gray-900 mb-2 flex items-center space-x-2">
                    <MessageCircle className="w-5 h-5 text-gray-600" />
                    <span>Outlier Notes</span>
                </h3>
                <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} disabled={!canEdit} />
            </div>

            {isAdmin && (
              <div className="border-t pt-6 space-y-6">
                <h3 className="text-lg font-medium">Admin Controls</h3>
                <div>
                  <Label className="inline-flex items-center space-x-2">
                    <input type="checkbox" checked={verified} onChange={e => setVerified(e.target.checked)} className="form-checkbox h-5 w-5" disabled={!isAdmin} />
                    <span>Verified</span>
                  </Label>
                </div>
                <div>
                  <Label className="block text-sm font-medium mb-1">Verified By</Label>
                  <select value={verifiedById} onChange={e => setVerifiedById(e.target.value)} className="w-full border rounded px-3 py-2 bg-white disabled:bg-gray-100" disabled={!isAdmin}>
                    <option value="">Select User</option>
                    {users.map(u => (<option key={u.id} value={u.id}>{u.display_name}</option>))}
                  </select>
                </div>
              </div>
            )}
            <div className="flex space-x-4 pt-4">
              <Button onClick={handleSave} disabled={saving || !canEdit}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={() => setIsEditing(false)} disabled={saving}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          // Display Mode
          <div className="space-y-6">
            <div className="bg-gray-50 rounded-lg p-6 text-center">
                <div className="flex items-center justify-center space-x-4 mb-4">
                    <div className={`${colorClass} w-16 h-16 rounded-full flex items-center justify-center`}>
                        <span className="text-white font-bold text-xl">{initialDataPoint.brixLevel}</span>
                    </div>
                    <div className="text-left">
                        <p className="text-2xl font-bold text-gray-900">{initialDataPoint.brixLevel} BRIX</p>
                        <p className="text-sm text-gray-600">Refractometer Reading</p>
                        <Badge className={`${colorClass} mt-1 text-white`}>
                            {qualityText} Quality
                        </Badge>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <Calendar className="w-5 h-5 text-gray-600" />
                    <div>
                        <p className="text-sm text-gray-600">Assessment Date</p>
                        <p className="font-medium">{new Date(initialDataPoint.submittedAt).toLocaleDateString()}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <User className="w-5 h-5 text-gray-600" />
                    <div>
                        <p className="text-sm text-gray-600">Submitted By</p>
                        <p className="font-medium">{initialDataPoint.submittedBy}</p>
                    </div>
                </div>
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    {initialDataPoint.verified ? (
                        <CheckCircle className="w-5 h-5 text-green-600" />
                    ) : (
                        <AlertCircle className="w-5 h-5 text-yellow-500" />
                    )}
                    <div>
                        <p className="text-sm text-gray-600">Verification Status</p>
                        <p className="font-medium">{initialDataPoint.verified ? 'Verified' : 'Pending'}</p>
                    </div>
                </div>
                {initialDataPoint.verified && initialDataPoint.verifiedBy && (
                    <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                        <User className="w-5 h-5 text-gray-600" />
                        <div>
                            <p className="text-sm text-gray-600">Verified By</p>
                            <p className="font-medium">{initialDataPoint.verifiedBy}</p>
                        </div>
                    </div>
                )}
                <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                    <MapPin className="w-5 h-5 text-gray-600" />
                    <div>
                        <p className="text-sm text-gray-600">Location</p>
                        <p className="font-medium">{initialDataPoint.locationName}</p>
                        <p className="text-xs text-gray-500">
                            {initialDataPoint.latitude?.toFixed(4)}, {initialDataPoint.longitude?.toFixed(4)}
                        </p>
                    </div>
                </div>
                {initialDataPoint.storeName && (
                    <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                        <Store className="w-5 h-5 text-gray-600" />
                        <div>
                            <p className="text-sm text-gray-600">Store</p>
                            <p className="font-medium">{initialDataPoint.storeName}</p>
                        </div>
                    </div>
                )}
                {initialDataPoint.brandName && (
                    <div className="flex items-center space-x-3 p-4 bg-gray-50 rounded-lg">
                        <Tag className="w-5 h-5 text-gray-600" />
                        <div>
                            <p className="text-sm text-gray-600">Brand</p>
                            <p className="font-medium">{initialDataPoint.brandName}</p>
                        </div>
                    </div>
                )}
            </div>
            
            {initialDataPoint.outlier_notes && (
                <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="font-semibold text-gray-900 mb-2 flex items-center space-x-2">
                        <MessageCircle className="w-5 h-5 text-gray-600" />
                        <span>Outlier Notes</span>
                    </h3>
                    <p className="text-gray-700">{initialDataPoint.outlier_notes}</p>
                </div>
            )}
            
            <div className="pt-4 border-t border-gray-100">
                <h3 className="flex items-center space-x-2 text-lg font-bold text-gray-900 mb-4">
                    <ImageIcon className="w-6 h-6 text-gray-600" />
                    <span>Reference Images ({imageUrls.length})</span>
                </h3>
                {imagesLoading ? (
                    <div className="flex items-center justify-center py-8">
                        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                        <span className="ml-3 text-gray-600">Loading images...</span>
                    </div>
                ) : imageUrls.length === 0 ? (
                    <p className="text-gray-500 italic">No images added for this submission.</p>
                ) : (
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                        {imageUrls.map((url: string, index: number) => (
                            <div key={index} className="relative w-full pb-[75%] rounded-lg overflow-hidden shadow-md group">
                                <img
                                    src={url}
                                    alt={`Submission image ${index + 1}`}
                                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                    onError={(e) => {
                                        e.currentTarget.src = 'https://placehold.co/400x300/CCCCCC/333333?text=Image+Error';
                                        e.currentTarget.alt = 'Error loading image';
                                    }}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {canDelete && (
                <Button
                    variant="destructive"
                    onClick={handleDelete}
                    className="w-full mt-4"
                    disabled={isDeleting}
                >
                    {isDeleting ? 'Deleting...' : 'Delete Submission'}
                </Button>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DataPointDetailModal;