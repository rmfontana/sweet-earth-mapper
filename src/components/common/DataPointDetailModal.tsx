// src/components/common/DataPointDetailModal.tsx
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
  Calendar,
  User,
  CheckCircle,
  AlertCircle,
  Image as ImageIcon,
  Loader2,
  X,
  Edit,
  Droplets,
  Store,
  Tag,
  Package,
  MapIcon,
  FileText
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
import Combobox from '../ui/combo-box';
import LocationSearch from './LocationSearch';

interface DatabaseItem {
  id?: string;
  name: string;
}

interface DataPointDetailModalProps {
  dataPoint: BrixDataPoint | null;
  isOpen: boolean;
  onClose: () => void;
  onDeleteSuccess?: (id: string) => void;
  onUpdateSuccess?: (dataPoint: BrixDataPoint) => void;
}

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
  const [imagesLoading, setImagesLoading] = useState(false);
  const [isLocationLoading, setIsLocationLoading] = useState(false);
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  
  // 🟢 FIX: Initialize state with the prop data or a fallback
  const [brixLevel, setBrixLevel] = useState<number | ''>(initialDataPoint?.brixLevel ?? '');
  const [cropType, setCropType] = useState(initialDataPoint?.cropType || '');
  const [variety, setVariety] = useState(initialDataPoint?.variety || '');
  const [locationName, setLocationName] = useState(initialDataPoint?.locationName || '');
  const [latitude, setLatitude] = useState<number | null>(initialDataPoint?.latitude ?? null);
  const [longitude, setLongitude] = useState<number | null>(initialDataPoint?.longitude ?? null);
  const [measurementDate, setMeasurementDate] = useState(initialDataPoint?.submittedAt ? new Date(initialDataPoint.submittedAt).toISOString().split('T')[0] : '');
  const [purchaseDate, setPurchaseDate] = useState(initialDataPoint?.purchaseDate || '');
  const [outlierNotes, setOutlierNotes] = useState(initialDataPoint?.outlier_notes || '');
  const [brand, setBrand] = useState(initialDataPoint?.brandName || '');
  const [store, setStore] = useState(initialDataPoint?.storeName || '');
  const [verified, setVerified] = useState(initialDataPoint?.verified ?? false);
  const [verifiedBy, setVerifiedBy] = useState(initialDataPoint?.verifiedBy || '');
  const [verifiedAt, setVerifiedAt] = useState(initialDataPoint?.verifiedAt || '');

  // State for Combobox data
  const [crops, setCrops] = useState<DatabaseItem[]>([]);
  const [brands, setBrands] = useState<DatabaseItem[]>([]);
  const [stores, setStores] = useState<DatabaseItem[]>([]);

  useEffect(() => {
    async function fetchAllData() {
      console.log('Modal useEffect triggered.');
      if (!isOpen || !initialDataPoint) {
        console.log('Modal is not open or initialDataPoint is null. Exiting useEffect.');
        return;
      }
      console.log('Modal is open with initialDataPoint:', initialDataPoint);

      const fetchImages = async () => {
        setImagesLoading(true);
        console.log('Attempting to fetch images. initialDataPoint.images:', initialDataPoint.images);
        
        const urls = Array.isArray(initialDataPoint.images)
          ? initialDataPoint.images.map(imagePath =>
              `https://wbkzczcqlorsewoofwqe.supabase.co/storage/v1/object/public/submission-images-bucket/${imagePath}`
            )
          : [];

        console.log('Generated image URLs:', urls);
        setImageUrls(urls);
        setImagesLoading(false);
      };

      try {
        const [
          { data: cropsData, error: cropsError },
          { data: brandsData, error: brandsError },
          { data: storesData, error: storesError },
        ] = await Promise.all([
          supabase.from('crops').select('id, name'),
          supabase.from('brands').select('id, name'),
          supabase.from('stores').select('id, name'),
        ]);

        console.log('Supabase fetch results:', { cropsData, cropsError, brandsData, brandsError, storesData, storesError });

        if (cropsError || brandsError || storesError) {
          console.error('Database fetch error:', cropsError || brandsError || storesError);
          setError('Failed to fetch required data for editing. Some dropdowns may be empty.');
        }

        // 🟢 FIX: Ensure the data is always an array before setting state
        setCrops(Array.isArray(cropsData) ? cropsData : []);
        setBrands(Array.isArray(brandsData) ? brandsData : []);
        setStores(Array.isArray(storesData) ? storesData : []);

      } catch (err) {
        console.error('An error occurred during data fetching:', err);
        setError('Failed to load data for editing.');
        toast({
          title: 'Error',
          description: `Failed to load data for editing: ${err instanceof Error ? err.message : 'Unknown error'}`,
          variant: 'destructive',
        });
      }
      fetchImages();
    }
    fetchAllData();
  }, [isOpen, initialDataPoint, toast]);

  const handleDelete = async () => { /* ... (no changes) ... */ };
  const handleSave = async () => { /* ... (no changes) ... */ };

  const handleLocationSelect = (location: { name: string, latitude: number, longitude: number }) => {
    setLocationName(location.name);
    setLatitude(location.latitude);
    setLongitude(location.longitude);
  };

  if (!initialDataPoint) {
    console.log('initialDataPoint is null, returning early.');
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
              {!isEditing && canEdit && (
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

        <div className="max-h-[80vh] overflow-y-auto px-1">
          {error && (
            <div className="flex items-center p-4 bg-red-100 text-red-800 rounded-lg">
              <AlertCircle className="w-5 h-5 mr-3" />
              <p>{error}</p>
            </div>
          )}

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
            
            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-lg font-bold text-gray-900 mb-4">Submission Details</h3>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex flex-col space-y-2 p-4 bg-gray-50 rounded-lg">
                    <Label className="text-sm text-gray-600 flex items-center space-x-2">
                      <Droplets className="w-5 h-5 text-gray-600" />
                      <span>BRIX Level</span>
                    </Label>
                    {isEditing ? (
                        <Input type="number" value={brixLevel} onChange={e => setBrixLevel(e.target.value === '' ? '' : Number(e.target.value))} min={0} step={0.1} />
                    ) : (
                        <p className="font-medium">{initialDataPoint.brixLevel}</p>
                    )}
                </div>
                <div className="flex flex-col space-y-2 p-4 bg-gray-50 rounded-lg">
                    <Label className="text-sm text-gray-600 flex items-center space-x-2">
                      <Package className="w-5 h-5 text-gray-600" />
                      <span>Crop Type</span>
                    </Label>
                    {isEditing ? (
                        <Combobox
                            items={crops}
                            value={cropType}
                            onSelect={setCropType}
                            placeholder="Select Crop"
                        />
                    ) : (
                        <p className="font-medium">{initialDataPoint.cropType}</p>
                    )}
                </div>
                <div className="flex flex-col space-y-2 p-4 bg-gray-50 rounded-lg">
                    <Label className="text-sm text-gray-600 flex items-center space-x-2">
                      <Tag className="w-5 h-5 text-gray-600" />
                      <span>Brand</span>
                    </Label>
                    {isEditing ? (
                        <Combobox
                            items={brands}
                            value={brand}
                            onSelect={setBrand}
                            placeholder="Select Brand"
                        />
                    ) : (
                        <p className="font-medium">{initialDataPoint.brandName || 'N/A'}</p>
                    )}
                </div>
                <div className="flex flex-col space-y-2 p-4 bg-gray-50 rounded-lg">
                    <Label className="text-sm text-gray-600 flex items-center space-x-2">
                      <Store className="w-5 h-5 text-gray-600" />
                      <span>Store</span>
                    </Label>
                    {isEditing ? (
                        <Combobox
                            items={stores}
                            value={store}
                            onSelect={setStore}
                            placeholder="Select Store"
                        />
                    ) : (
                        <p className="font-medium">{initialDataPoint.storeName || 'N/A'}</p>
                    )}
                </div>
                <div className="flex flex-col space-y-2 p-4 bg-gray-50 rounded-lg">
                    <Label className="text-sm text-gray-600 flex items-center space-x-2">
                      <MapIcon className="w-5 h-5 text-gray-600" />
                      <span>Location</span>
                    </Label>
                    {isEditing ? (
                        <LocationSearch
                            value={locationName}
                            onLocationSelect={handleLocationSelect}
                            onChange={(e) => setLocationName(e.target.value)}
                            isLoading={isLocationLoading}
                        />
                    ) : (
                        <>
                            <p className="font-medium">{initialDataPoint.locationName}</p>
                            <p className="text-xs text-gray-500">
                                {initialDataPoint.latitude?.toFixed(4)}, {initialDataPoint.longitude?.toFixed(4)}
                            </p>
                        </>
                    )}
                </div>
                <div className="flex flex-col space-y-2 p-4 bg-gray-50 rounded-lg">
                    <Label className="text-sm text-gray-600 flex items-center space-x-2">
                      <Calendar className="w-5 h-5 text-gray-600" />
                      <span>Assessment Date</span>
                    </Label>
                    {isEditing ? (
                        <Input type="date" value={measurementDate} onChange={e => setMeasurementDate(e.target.value)} />
                    ) : (
                        <p className="font-medium">{new Date(initialDataPoint.submittedAt).toLocaleDateString()}</p>
                    )}
                </div>
                <div className="flex flex-col space-y-2 p-4 bg-gray-50 rounded-lg">
                    <Label className="text-sm text-gray-600 flex items-center space-x-2">
                      <Calendar className="w-5 h-5 text-gray-600" />
                      <span>Purchase Date</span>
                    </Label>
                    {isEditing ? (
                        <Input type="date" value={purchaseDate} onChange={e => setPurchaseDate(e.target.value)} />
                    ) : (
                        <p className="font-medium">{initialDataPoint.purchaseDate || 'N/A'}</p>
                    )}
                </div>
                <div className="flex flex-col space-y-2 p-4 bg-gray-50 rounded-lg">
                    <Label className="text-sm text-gray-600 flex items-center space-x-2">
                      <Tag className="w-5 h-5 text-gray-600" />
                      <span>Variety</span>
                    </Label>
                    {isEditing ? (
                        <Input type="text" value={variety} onChange={e => setVariety(e.target.value)} />
                    ) : (
                        <p className="font-medium">{initialDataPoint.variety || 'N/A'}</p>
                    )}
                </div>
              </div>
              
              <div className="bg-gray-50 rounded-lg p-4 mt-4">
                  <h3 className="font-semibold text-gray-900 mb-2 flex items-center space-x-2">
                      <FileText className="w-5 h-5 text-gray-600" />
                      <span>Outlier Notes</span>
                  </h3>
                  {isEditing ? (
                      <Textarea value={outlierNotes} onChange={e => setOutlierNotes(e.target.value)} rows={4} />
                  ) : (
                      <p className="text-gray-700">{initialDataPoint.outlier_notes || 'No notes for this submission.'}</p>
                  )}
              </div>

              <div className="bg-gray-50 rounded-lg p-4 mt-4 flex items-center justify-between">
                  <div className="flex items-center space-x-2">
                      <CheckCircle className={`w-5 h-5 ${verified ? 'text-green-500' : 'text-gray-400'}`} />
                      <Label htmlFor="verified-checkbox" className="text-sm font-semibold text-gray-700">
                          Verified
                      </Label>
                  </div>
                  {isAdmin && isEditing ? (
                      <Input
                          id="verified-checkbox"
                          type="checkbox"
                          checked={verified}
                          onChange={(e) => setVerified(e.target.checked)}
                          className="w-4 h-4"
                      />
                  ) : (
                      <Badge variant={verified ? 'default' : 'secondary'} className={`${verified ? 'bg-green-500 hover:bg-green-600' : 'bg-gray-400'}`}>
                          {verified ? 'Yes' : 'No'}
                      </Badge>
                  )}
              </div>

              {verified && (
                  <div className="mt-2 text-sm text-gray-500 flex items-center justify-end">
                      <User className="w-4 h-4 mr-1" />
                      <span>Verified by: {verifiedBy || 'N/A'}</span>
                  </div>
              )}
            </div>
            
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
          </div>
        </div>
        
        <div className="flex justify-between items-center pt-4 border-t border-gray-100">
            {isEditing ? (
                <>
                    <Button onClick={handleSave} disabled={saving}>
                        {saving ? 'Saving...' : 'Save Changes'}
                    </Button>
                    <Button variant="outline" onClick={() => setIsEditing(false)} disabled={saving}>
                        Cancel
                    </Button>
                </>
            ) : (
                canDelete && (
                    <Button variant="destructive" onClick={handleDelete} disabled={isDeleting}>
                        {isDeleting ? 'Deleting...' : 'Delete Submission'}
                    </Button>
                )
            )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DataPointDetailModal;