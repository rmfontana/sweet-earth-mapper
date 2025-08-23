import React, { useState, useEffect } from 'react';
import { BrixDataPoint } from '../../types';
import { Button } from '../ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
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
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { deleteSubmission } from '../../lib/fetchSubmissions';
import { useToast } from '../ui/use-toast';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import { supabase } from '../../integrations/supabase/client';

interface SupabaseSubmission {
  id: string;
  assessment_date: string;
  crop_variety: string | null;
  brix_value: number;
  verified: boolean;
  verified_at: string | null;
  outlier_notes: string | null;
  user_id: string;
  location: { id: string; name: string; } | null;
  crop: { id: string; name: string; category: string; } | null;
  store: { id: string; name: string; } | null;
  brand: { id: string; name: string; } | null;
  user: { id: string; display_name: string; } | null;
  verifier: { id: string; display_name: string; } | null;
}

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
  const [isEditing, setIsEditing] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dataPoint, setDataPoint] = useState<BrixDataPoint | null>(initialDataPoint);
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

  // Combined useEffect for data fetching and state population
  useEffect(() => {
    async function fetchAllData() {
      if (!isOpen || !initialDataPoint) return;

      setError(null);

      try {
        const [brandsRes, cropsRes, locationsRes, storesRes, usersRes] = await Promise.all([
          supabase.from('brands').select('id, name'),
          supabase.from('crops').select('id, name, category'),
          supabase.from('locations').select('id, name'),
          supabase.from('stores').select('id, name'),
          isAdmin ? supabase.from('users').select('id, display_name') : Promise.resolve({ data: [] }),
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

        // Set state for dropdown options
        setBrands(brandsRes.data ?? []);
        setCrops(cropsRes.data ?? []);
        setLocations(locationsRes.data ?? []);
        setStores(storesRes.data ?? []);
        setUsers(usersRes.data ?? []);

        // Populate form fields with detailed data
        if (submissionData) {
          setAssessmentDate(submissionData.assessment_date ? new Date(submissionData.assessment_date).toISOString().split('T')[0] : '');
          setCropVariety(submissionData.crop_variety || '');
          setNotes(submissionData.outlier_notes || '');
          setBrixLevel(submissionData.brix_value ?? '');
          setVerified(submissionData.verified);
          setLocationId(isValidJoinedData(submissionData.location) ? submissionData.location.id : '');
          setCropId(isValidJoinedData(submissionData.crop) ? submissionData.crop.id : '');
          setStoreId(isValidJoinedData(submissionData.store) ? submissionData.store.id : '');
          setBrandId(isValidJoinedData(submissionData.brand) ? submissionData.brand.id : '');
          setVerifiedById(isValidJoinedData(submissionData.verifier) ? submissionData.verifier.id : '');
        } else {
          // This case should be rare, but good to handle
          console.error('Submission data is null or undefined.');
          setError('Failed to load submission details.');
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
    }
    fetchAllData();
  }, [isOpen, initialDataPoint, isAdmin, toast]);

  const handleDelete = async () => {
    if (!dataPoint || !user) return;
    setIsDeleting(true);
    try {
      const success = await deleteSubmission(dataPoint.id);
      if (success) {
        toast({
          title: 'Submission Deleted',
          description: `The submission for ${dataPoint.cropType} has been permanently deleted.`,
        });
        onDeleteSuccess?.(dataPoint.id);
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
    if (!dataPoint) return;
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
        .eq('id', dataPoint.id);

      if (error) throw error;
      
      const updatedLocationName = locations.find(loc => loc.id === locationId)?.name || '';
      const updatedCropName = crops.find(c => c.id === cropId)?.name || '';
      const updatedStoreName = stores.find(s => s.id === storeId)?.name || '';
      const updatedBrandName = brands.find(b => b.id === brandId)?.name || '';
      const updatedVerifiedByName = users.find(u => u.id === verifiedById)?.display_name || '';

      const updatedData: BrixDataPoint = {
        ...dataPoint,
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

  if (!dataPoint) {
    return null;
  }

  const isOwner = user?.id === dataPoint.userId;
  const canEdit = isAdmin || (isOwner && !dataPoint.verified);
  const canDelete = isAdmin || (isOwner && !dataPoint.verified);
  
  const brixColor = (brix: number): string => {
    if (
      dataPoint.excellentBrix &&
      brix >= dataPoint.excellentBrix
    )
      return 'bg-green-500 text-white';
    if (dataPoint.goodBrix && brix >= dataPoint.goodBrix)
      return 'bg-lime-500 text-white';
    if (dataPoint.averageBrix && brix >= dataPoint.averageBrix)
      return 'bg-yellow-500';
    if (dataPoint.poorBrix && brix >= dataPoint.poorBrix)
      return 'bg-orange-500';
    return 'bg-red-500 text-white';
  };

  const getBrixQuality = (brix: number): string => {
    if (
      dataPoint.excellentBrix &&
      brix >= dataPoint.excellentBrix
    )
      return 'Excellent';
    if (dataPoint.goodBrix && brix >= dataPoint.goodBrix)
      return 'Good';
    if (dataPoint.averageBrix && brix >= dataPoint.averageBrix)
      return 'Average';
    if (dataPoint.poorBrix && brix >= dataPoint.poorBrix)
      return 'Poor';
    return 'Very Poor';
  };

  const formattedDate = new Date(dataPoint.submittedAt).toLocaleDateString();
  const formattedTime = new Date(dataPoint.submittedAt).toLocaleTimeString([], {
    hour: '2-digit',
    minute: '2-digit',
  });
  const googleMapsUrl = `http://maps.google.com/?q=${dataPoint.latitude},${dataPoint.longitude}`;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md md:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex justify-between items-center">
            {isEditing ? `Edit Submission for ${dataPoint.cropType}` : `Details for ${dataPoint.cropType}`}
            {canEdit && !isEditing && (
              <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
                <Edit className="w-4 h-4" />
              </Button>
            )}
            {isEditing && (
              <Button variant="ghost" size="icon" onClick={() => setIsEditing(false)}>
                <X className="w-4 h-4" />
              </Button>
            )}
          </DialogTitle>
          <DialogDescription>
            {isEditing ? 'Make changes to this submission.' : 'View the full details of this brix measurement.'}
          </DialogDescription>
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
            <div>
              <Label className="block text-sm font-medium mb-1">Assessment Date</Label>
              <Input type="date" value={assessmentDate} onChange={e => setAssessmentDate(e.target.value)} disabled={!canEdit} />
            </div>
            <div>
              <Label className="block text-sm font-medium mb-1">Crop Variety</Label>
              <Input type="text" value={cropVariety} onChange={e => setCropVariety(e.target.value)} disabled={!canEdit} />
            </div>
            <div>
              <Label className="block text-sm font-medium mb-1">BRIX Level</Label>
              <Input type="number" value={brixLevel} onChange={e => setBrixLevel(e.target.value === '' ? '' : Number(e.target.value))} min={0} step={0.1} disabled={!canEdit} />
            </div>
            <div>
              <Label className="block text-sm font-medium mb-1">Location</Label>
              <select value={locationId} onChange={e => setLocationId(e.target.value)} disabled={!canEdit} className="w-full border rounded px-3 py-2 bg-white disabled:bg-gray-100">
                <option value="">Select Location</option>
                {locations.map(loc => (<option key={loc.id} value={loc.id}>{loc.name}</option>))}
              </select>
            </div>
            <div>
              <Label className="block text-sm font-medium mb-1">Crop</Label>
              <select value={cropId} onChange={e => setCropId(e.target.value)} disabled={!canEdit} className="w-full border rounded px-3 py-2 bg-white disabled:bg-gray-100">
                <option value="">Select Crop</option>
                {crops.map(crop => (<option key={crop.id} value={crop.id}>{crop.name} {crop.category ? `(${crop.category})` : ''}</option>))}
              </select>
            </div>
            <div>
              <Label className="block text-sm font-medium mb-1">Store</Label>
              <select value={storeId} onChange={e => setStoreId(e.target.value)} disabled={!canEdit} className="w-full border rounded px-3 py-2 bg-white disabled:bg-gray-100">
                <option value="">Select Store</option>
                {stores.map(store => (<option key={store.id} value={store.id}>{store.name}</option>))}
              </select>
            </div>
            <div>
              <Label className="block text-sm font-medium mb-1">Brand</Label>
              <select value={brandId} onChange={e => setBrandId(e.target.value)} disabled={!canEdit} className="w-full border rounded px-3 py-2 bg-white disabled:bg-gray-100">
                <option value="">Select Brand</option>
                {brands.map(brand => (<option key={brand.id} value={brand.id}>{brand.name}</option>))}
              </select>
            </div>
            <div>
              <Label className="block text-sm font-medium mb-1">Notes</Label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} disabled={!canEdit} />
            </div>
            {isAdmin && (
              <>
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
              </>
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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              {dataPoint.images && dataPoint.images.length > 0 ? (
                <div className="h-48 w-full bg-gray-100 flex items-center justify-center rounded-lg text-gray-400">
                  Image Placeholder
                </div>
              ) : (
                <div className="h-48 w-full bg-gray-100 flex items-center justify-center rounded-lg text-gray-400">
                  No Image
                </div>
              )}
            </div>
            <div className="space-y-4">
              <Table>
                <TableBody>
                  <TableRow>
                    <TableCell>
                      <Droplets className="inline-block h-4 w-4 mr-2" />
                      <strong>Brix Level</strong>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Badge
                          className={`text-lg px-3 py-1 ${brixColor(
                            dataPoint.brixLevel,
                          )}`}
                        >
                          {dataPoint.brixLevel.toFixed(1)}°
                        </Badge>
                        <span className="text-sm text-gray-500">
                          ({getBrixQuality(dataPoint.brixLevel)})
                        </span>
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Leaf className="inline-block h-4 w-4 mr-2" />
                      <strong>Crop</strong>
                    </TableCell>
                    <TableCell>
                      {dataPoint.variety || dataPoint.cropType}
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Store className="inline-block h-4 w-4 mr-2" />
                      <strong>Store</strong>
                    </TableCell>
                    <TableCell>{dataPoint.storeName || 'N/A'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Tag className="inline-block h-4 w-4 mr-2" />
                      <strong>Brand</strong>
                    </TableCell>
                    <TableCell>{dataPoint.brandName || 'N/A'}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <MapPin className="inline-block h-4 w-4 mr-2" />
                      <strong>Location</strong>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center">
                        {dataPoint.locationName || 'N/A'}
                        {dataPoint.latitude && dataPoint.longitude && (
                          <a
                            href={googleMapsUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-2 text-blue-600 hover:text-blue-800"
                            aria-label="View on Google Maps"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Calendar className="inline-block h-4 w-4 mr-2" />
                      <strong>Date</strong>
                    </TableCell>
                    <TableCell>{formattedDate}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <Clock className="inline-block h-4 w-4 mr-2" />
                      <strong>Time</strong>
                    </TableCell>
                    <TableCell>{formattedTime}</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>
                      <User className="inline-block h-4 w-4 mr-2" />
                      <strong>Submitted By</strong>
                    </TableCell>
                    <TableCell>{dataPoint.submittedBy}</TableCell>
                  </TableRow>
                  {dataPoint.verified && (
                    <TableRow>
                      <TableCell>
                        <Check className="inline-block h-4 w-4 mr-2 text-green-500" />
                        <strong>Verified</strong>
                      </TableCell>
                      <TableCell>
                        Yes by {dataPoint.verifiedBy} at{' '}
                        {dataPoint.verifiedAt ? new Date(dataPoint.verifiedAt).toLocaleDateString() : ''}
                      </TableCell>
                    </TableRow>
                  )}
                  {dataPoint.outlier_notes && (
                    <TableRow>
                      <TableCell>
                        <MessageCircle className="inline-block h-4 w-4 mr-2" />
                        <strong>Notes</strong>
                      </TableCell>
                      <TableCell>{dataPoint.outlier_notes}</TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
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
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default DataPointDetailModal;