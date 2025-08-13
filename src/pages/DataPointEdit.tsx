import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { supabase } from '../integrations/supabase/client';

// The FormattedSubmission type must match the data returned by the new query
interface FormattedSubmission {
  id: string;
  brixLevel: number;
  verified: boolean;
  verifiedAt: string;
  label: string;
  cropType: string;
  category: string;
  latitude: number | null;
  longitude: number | null;
  locationName: string;
  storeName: string;
  brandName: string;
  submittedBy: string;
  verifiedBy: string;
  submittedAt: string;
  images: string[];
  notes: string | null;
  location: { id: string; name: string; } | null;
  crop: { id: string; name: string; category: string; } | null;
  store: { id: string; name: string; } | null;
  brand: { id: string; name: string; } | null;
  user: { id: string; display_name: string; } | null;
  verifier: { id: string; display_name: string; } | null;
}

const DataPointEdit = () => {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const fromPage = location.state?.from;

  const [isAdmin, setIsAdmin] = useState(false);
  const [dataPoint, setDataPoint] = useState<FormattedSubmission | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Editable fields state
  const [assessmentDate, setAssessmentDate] = useState('');
  const [cropVariety, setCropVariety] = useState('');
  const [locationId, setLocationId] = useState('');
  const [cropId, setCropId] = useState('');
  const [storeId, setStoreId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [verified, setVerified] = useState(false);
  const [verifiedById, setVerifiedById] = useState('');
  const [notes, setNotes] = useState('');
  const [brixLevel, setBrixLevel] = useState<number | ''>('');

  // Dropdown options state
  const [brands, setBrands] = useState<any[]>([]);
  const [crops, setCrops] = useState<any[]>([]);
  const [locations, setLocations] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Get user permissions
  useEffect(() => {
    const getUserRole = async () => {
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      const { data: profile } = await supabase
        .from('users')
        .select('role')
        .eq('id', authUser.id)
        .single();
      
      if (profile) {
        setIsAdmin(profile.role === 'admin');
      }
    };
    getUserRole();
  }, []);

  // Fetch the specific data point and pre-populate the form
  useEffect(() => {
    const loadDataPoint = async () => {
      if (!id) {
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('submissions')
          .select(`
            id,
            assessment_date,
            brix_value,
            verified,
            verified_at,
            crop_variety,
            outlier_notes,
            location:location_id (id, name),
            crop:crop_id (id, name, category),
            store:store_id (id, name),
            brand:brand_id (id, name),
            user:users!user_id (id, display_name),
            verifier:users!verified_by (id, display_name)
          `)
          .eq('id', id)
          .single();

        if (error) throw error;
        
        // This is a minimal type based on your latest error, but you'll need to adjust it
        // to match your actual schema.
        type SupabaseData = {
          id: string;
          brix_value: number;
          verified: boolean;
          verified_at: string;
          crop_variety: string;
          assessment_date: string;
          location: { id: string; name: string; } | null;
          crop: { id: string; name: string; category: string; } | null;
          store: { id: string; name: string; } | null;
          brand: { id: string; name: string; } | null;
          user: { id: string; display_name: string; } | null;
          verifier: { id: string; display_name: string; } | null;
        };

        const formattedData: FormattedSubmission = {
            id: (data as SupabaseData).id,
            brixLevel: (data as SupabaseData).brix_value,
            verified: (data as SupabaseData).verified,
            verifiedAt: (data as SupabaseData).verified_at,
            label: (data as SupabaseData).crop_variety ?? '',
            notes: (data as any).outlier_notes ?? '', 
            location: (data as SupabaseData).location,
            crop: (data as SupabaseData).crop,
            store: (data as SupabaseData).store,
            brand: (data as SupabaseData).brand,
            user: (data as SupabaseData).user,
            verifier: (data as SupabaseData).verifier,
            submittedAt: (data as SupabaseData).assessment_date,
            cropType: (data as SupabaseData).crop?.name ?? 'Unknown',
            category: (data as SupabaseData).crop?.category ?? '',
            latitude: null, longitude: null,
            locationName: (data as SupabaseData).location?.name ?? '',
            storeName: (data as SupabaseData).store?.name ?? '',
            brandName: (data as SupabaseData).brand?.name ?? '',
            submittedBy: (data as SupabaseData).user?.display_name ?? 'Anonymous',
            verifiedBy: (data as SupabaseData).verifier?.display_name ?? '',
            images: []
        };

        setDataPoint(formattedData);

        if (formattedData) {
          const date = formattedData.submittedAt ? new Date(formattedData.submittedAt).toISOString().split('T')[0] : '';
          setAssessmentDate(date);
          setCropVariety(formattedData.label || '');
          setLocationId(formattedData.location?.id || '');
          setCropId(formattedData.crop?.id || '');
          setStoreId(formattedData.store?.id || '');
          setBrandId(formattedData.brand?.id || '');
          setVerified(formattedData.verified || false);
          setVerifiedById(formattedData.verifier?.id || '');
          setNotes(formattedData.notes || '');
          setBrixLevel(formattedData.brixLevel ?? '');
        }
      } catch (error) {
        console.error('Failed to load data point:', error);
      } finally {
        setLoading(false);
      }
    };
    loadDataPoint();
  }, [id]);

  // Fetch dropdown options for the form selects
  useEffect(() => {
    if (!dataPoint) return;

    async function fetchOptions() {
      const [brandsRes, cropsRes, locationsRes, storesRes, usersRes] = await Promise.all([
        supabase.from('brands').select('id, name'),
        supabase.from('crops').select('id, name, category'),
        supabase.from('locations').select('id, name'),
        supabase.from('stores').select('id, name'),
        isAdmin ? supabase.from('users').select('id, display_name') : Promise.resolve({ data: [] }),
      ]);
      setBrands(brandsRes.data ?? []);
      setCrops(cropsRes.data ?? []);
      setLocations(locationsRes.data ?? []);
      setStores(storesRes.data ?? []);
      setUsers(usersRes.data ?? []);
    }
    fetchOptions();
  }, [dataPoint, isAdmin]);

  // Authorization logic
  const isOwner = !!dataPoint && user?.id === dataPoint?.user?.id;
  const canEdit = isAdmin || (isOwner && !dataPoint?.verified);
  const hasAccessToEditPage = isAdmin || isOwner;

  const handleSave = async () => {
    if (!dataPoint) return;
    setSaving(true);
    try {
      const updateData: any = {
        assessment_date: assessmentDate || null,
        crop_variety: cropVariety || null,
        location_id: locationId || null,
        crop_id: cropId || null,
        store_id: storeId || null,
        brand_id: brandId || null,
        outlier_notes: notes || null,
        brix_value: brixLevel === '' ? null : Number(brixLevel),
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

      navigate(fromPage || `/data-point/${dataPoint.id}`);

    } catch (error) {
      console.error('Failed to save data point:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <p className="text-gray-600">Loading measurement for editing...</p>
      </div>
    );
  }

  if (!dataPoint) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-8 text-center">
          <AlertCircle className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Data Point Not Found</h2>
          <Button onClick={() => navigate(-1)}>Back</Button>
        </main>
      </div>
    );
  }

  if (!hasAccessToEditPage) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-8 text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Permission Denied</h2>
          <p className="text-gray-600 mb-6">You do not have permission to edit this data point.</p>
          <Button onClick={() => navigate(-1)}>Back</Button>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Button variant="ghost" onClick={() => navigate(-1)} className="flex items-center space-x-2 mb-6">
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </Button>

        <Card>
          <CardHeader>
            <CardTitle>Edit Data Point</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {!canEdit && (
              <div className="flex items-center p-4 bg-yellow-100 text-yellow-800 rounded-lg">
                <AlertCircle className="w-5 h-5 mr-3" />
                <p>This data point is verified and can no longer be edited, except by an administrator.</p>
              </div>
            )}
            
            {/* Form Fields */}
            <div>
              <label className="block text-sm font-medium mb-1">Assessment Date</label>
              <Input type="date" value={assessmentDate} onChange={e => setAssessmentDate(e.target.value)} disabled={!canEdit} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Crop Variety</label>
              <Input type="text" value={cropVariety} onChange={e => setCropVariety(e.target.value)} disabled={!canEdit} />
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">BRIX Level</label>
              <Input type="number" value={brixLevel} onChange={e => setBrixLevel(e.target.value === '' ? '' : Number(e.target.value))} min={0} step={0.1} disabled={!canEdit} />
            </div>
            
            <div>
              <label className="block text-sm font-medium mb-1">Location</label>
              <select value={locationId} onChange={e => setLocationId(e.target.value)} disabled={!canEdit} className="w-full border rounded px-3 py-2 bg-white disabled:bg-gray-100">
                <option value="">Select Location</option>
                {locations.map(loc => (<option key={loc.id} value={loc.id}>{loc.name}</option>))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Crop</label>
              <select value={cropId} onChange={e => setCropId(e.target.value)} disabled={!canEdit} className="w-full border rounded px-3 py-2 bg-white disabled:bg-gray-100">
                <option value="">Select Crop</option>
                {crops.map(crop => (<option key={crop.id} value={crop.id}>{crop.name} {crop.category ? `(${crop.category})` : ''}</option>))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Store</label>
              <select value={storeId} onChange={e => setStoreId(e.target.value)} disabled={!canEdit} className="w-full border rounded px-3 py-2 bg-white disabled:bg-gray-100">
                <option value="">Select Store</option>
                {stores.map(store => (<option key={store.id} value={store.id}>{store.name}</option>))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Brand</label>
              <select value={brandId} onChange={e => setBrandId(e.target.value)} disabled={!canEdit} className="w-full border rounded px-3 py-2 bg-white disabled:bg-gray-100">
                <option value="">Select Brand</option>
                {brands.map(brand => (<option key={brand.id} value={brand.id}>{brand.name}</option>))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={4} disabled={!canEdit} />
            </div>

            {/* Admin-only fields */}
            {isAdmin && (
              <>
                <div className="border-t pt-6 space-y-6">
                  <h3 className="text-lg font-medium">Admin Controls</h3>
                  <div>
                    <label className="inline-flex items-center space-x-2">
                      <input type="checkbox" checked={verified} onChange={e => setVerified(e.target.checked)} className="form-checkbox h-5 w-5"/>
                      <span>Verified</span>
                    </label>
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-1">Verified By</label>
                    <select value={verifiedById} onChange={e => setVerifiedById(e.target.value)} className="w-full border rounded px-3 py-2 bg-white">
                      <option value="">Select User</option>
                      {users.map(user => (<option key={user.id} value={user.id}>{user.display_name}</option>))}
                    </select>
                  </div>
                </div>
              </>
            )}

            <div className="flex space-x-4 pt-4">
              <Button onClick={handleSave} disabled={saving || !canEdit}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={() => navigate(-1)} disabled={saving}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default DataPointEdit;