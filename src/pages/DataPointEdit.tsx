import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import Header from '../components/Layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { AlertCircle, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { fetchFormattedSubmissions } from '../lib/fetchSubmissions';
import { fetchBrixByCrop } from '../lib/fetchBrixByCrop'; 
import { supabase } from '../integrations/supabase/client';

const DataPointEdit = () => {
  const { id } = useParams();
  const { user } = useAuth();

  const navigate = useNavigate();
  const location = useLocation();

  // Check if navigation state exists and has "from"
  const fromPage = location.state?.from;

  const [userRole, setUserRole] = useState<string>('public');
  const [isAdmin, setIsAdmin] = useState(false);
  const [isContributor, setIsContributor] = useState(false);

  const [dataPoint, setDataPoint] = useState<any | null>(null);
  const [cropData, setCropData] = useState<any | null>(null);
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

  const isOwner = !!dataPoint && user?.display_name === dataPoint?.submittedBy;
  const canEdit = isAdmin || (isOwner && !dataPoint?.verified);

  const [brands, setBrands] = useState([]);
  const [crops, setCrops] = useState([]);
  const [locations, setLocations] = useState([]);
  const [stores, setStores] = useState([]);
  const [users, setUsers] = useState([]); // for verified_by field (admins only)

  // Get user permissions 
  useEffect(() => {
    const getUserRole = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
  
      if (!user) {
        setIsAdmin(false);
        setIsContributor(false);
        setUserRole('viewer');
        return;
      }
  
      const { data: profile, error } = await supabase
        .from('users')
        .select('role')
        .eq('id', user.id)
        .single();
  
      if (error || !profile) {
        setIsAdmin(false);
        setIsContributor(false);
        setUserRole('viewer');
        return;
      }
  
      setUserRole(profile.role);
      setIsAdmin(profile.role === 'admin');
      setIsContributor(profile.role === 'contributor');
    };
  
    getUserRole();
  }, []);

  useEffect(() => {
    const loadDataPointAndCrop = async () => {
      if (!id) {
        setDataPoint(null);
        setCropData(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const submissions = await fetchFormattedSubmissions();
        const found = submissions.find(point => point.id === id);
        setDataPoint(found || null);

        if (found?.cropType) {
          const cropInfo = await fetchBrixByCrop(found.cropType);
          setCropData(cropInfo);
        } else {
          setCropData(null);
        }

        if (found) {
          setBrixLevel(found.brixLevel);
        }
      } catch (error) {
        console.error('Failed to load data point or crop:', error);
        setDataPoint(null);
        setCropData(null);
      } finally {
        setLoading(false);
      }
    };

    loadDataPointAndCrop();
  }, [id]);

  useEffect(() => {
    if (!dataPoint) return;
  
    async function fetchOptions() {
      const [brandsRes, cropsRes, locationsRes, storesRes, usersRes] = await Promise.all([
        supabase.from('brands').select('id, name'),
        supabase.from('crops').select('id, name, category'),
        supabase.from('locations').select('id, name'),
        supabase.from('stores').select('id, name'),
        isAdmin ? supabase.from('users').select('id, display_name') : Promise.resolve({ data: [] })
      ]);
  
      setBrands(brandsRes.data ?? []);
      setCrops(cropsRes.data ?? []);
      setLocations(locationsRes.data ?? []);
      setStores(storesRes.data ?? []);
      setUsers(usersRes.data ?? []);
    }
  
    fetchOptions();
  }, [dataPoint, isAdmin]);

  useEffect(() => {
    if (!dataPoint) return;
  
    setAssessmentDate(dataPoint.assessmentDate || '');
    setCropVariety(dataPoint.cropVariety || '');
    setLocationId(dataPoint.locationId || '');
    setCropId(dataPoint.cropId || '');
    setStoreId(dataPoint.storeId || '');
    setBrandId(dataPoint.brandId || '');
    setVerified(dataPoint.verified || false);
    setVerifiedById(dataPoint.verifiedById || '');
    setNotes(dataPoint.notes || '');
    setBrixLevel(dataPoint.brixLevel ?? '');
  }, [dataPoint]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-8 text-center">
          <p className="text-gray-600">Loading measurement for editing...</p>
        </main>
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

  
  if (!isOwner) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-4xl mx-auto px-4 py-8 text-center">
          <p className="text-red-600 font-semibold">You do not have permission to edit this data point.</p>
          <Button onClick={() => navigate(-1)}>Back</Button>
        </main>
      </div>
    );
  }

  const handleCancel = () => {
    if (fromPage) {
      navigate(fromPage);
    } else {
      navigate(-1);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      // Build update object depending on role and permission
      const updateData: any = {
        assessment_date: assessmentDate || null,
        crop_variety: cropVariety || null,
        location_id: locationId || null,
        crop_id: cropId || null,
        store_id: storeId || null,
        brand_id: brandId || null,
        notes: notes || null,
        brix_value: brixLevel === '' ? null : Number(brixLevel),
      };
  
      // Only admins can update verified and verified_by fields
      if (isAdmin) {
        updateData.verified = verified;
        updateData.verified_by = verifiedById || null;
      }
  
      const { error } = await supabase
        .from('submissions')
        .update(updateData)
        .eq('id', dataPoint.id);
  
      if (error) throw error;

      if (fromPage) {
        navigate(fromPage);
      } else {
        navigate(`/data-point/${dataPoint.id}`); 
      }
  
    } catch (error) {
      console.error('Failed to save data point:', error);
      alert('Failed to save changes. Please try again.');
    } finally {
      setSaving(false);
    }
  };
  

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
            <CardTitle>Edit Data Point - {dataPoint.cropType}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Assessment Date */}
            <div>
              <label className="block text-sm font-medium mb-1">Assessment Date</label>
              <Input
                type="date"
                value={assessmentDate}
                onChange={e => setAssessmentDate(e.target.value)}
                disabled={!canEdit}
              />
            </div>
  
            {/* Crop Variety */}
            <div>
              <label className="block text-sm font-medium mb-1">Crop Variety</label>
              <Input
                type="text"
                value={cropVariety}
                onChange={e => setCropVariety(e.target.value)}
                disabled={!canEdit}
              />
            </div>
  
            {/* Location Select */}
            <div>
              <label className="block text-sm font-medium mb-1">Location</label>
              <select
                value={locationId}
                onChange={e => setLocationId(e.target.value)}
                disabled={!canEdit}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Select Location</option>
                {locations.map(loc => (
                  <option key={loc.id} value={loc.id}>
                    {loc.name}
                  </option>
                ))}
              </select>
            </div>
  
            {/* Crop Select */}
            <div>
              <label className="block text-sm font-medium mb-1">Crop</label>
              <select
                value={cropId}
                onChange={e => setCropId(e.target.value)}
                disabled={!canEdit}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Select Crop</option>
                {crops.map(crop => (
                  <option key={crop.id} value={crop.id}>
                    {crop.name} {crop.category ? `(${crop.category})` : ''}
                  </option>
                ))}
              </select>
            </div>
  
            {/* Store Select */}
            <div>
              <label className="block text-sm font-medium mb-1">Store</label>
              <select
                value={storeId}
                onChange={e => setStoreId(e.target.value)}
                disabled={!canEdit}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Select Store</option>
                {stores.map(store => (
                  <option key={store.id} value={store.id}>
                    {store.name}
                  </option>
                ))}
              </select>
            </div>
  
            {/* Brand Select */}
            <div>
              <label className="block text-sm font-medium mb-1">Brand</label>
              <select
                value={brandId}
                onChange={e => setBrandId(e.target.value)}
                disabled={!canEdit}
                className="w-full border rounded px-3 py-2"
              >
                <option value="">Select Brand</option>
                {brands.map(brand => (
                  <option key={brand.id} value={brand.id}>
                    {brand.name}
                  </option>
                ))}
              </select>
            </div>
  
            {/* BRIX Level */}
            <div>
              <label className="block text-sm font-medium mb-1">BRIX Level</label>
              <Input
                type="number"
                value={brixLevel}
                onChange={e => setBrixLevel(e.target.value === '' ? '' : Number(e.target.value))}
                min={0}
                step={0.1}
                disabled={!canEdit}
              />
            </div>
  
            {/* Notes */}
            <div>
              <label className="block text-sm font-medium mb-1">Notes</label>
              <Textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={4}
                disabled={!canEdit}
              />
            </div>
  
            {/* Verified Checkbox - Admin Only */}
            {isAdmin && (
              <div>
                <label className="inline-flex items-center space-x-2">
                  <input
                    type="checkbox"
                    checked={verified}
                    onChange={e => setVerified(e.target.checked)}
                    className="form-checkbox"
                  />
                  <span>Verified</span>
                </label>
              </div>
            )}
  
            {/* Verified By Select - Admin Only */}
            {isAdmin && (
              <div>
                <label className="block text-sm font-medium mb-1">Verified By</label>
                <select
                  value={verifiedById}
                  onChange={e => setVerifiedById(e.target.value)}
                  className="w-full border rounded px-3 py-2"
                >
                  <option value="">Select User</option>
                  {users.map(user => (
                    <option key={user.id} value={user.id}>
                      {user.display_name}
                    </option>
                  ))}
                </select>
              </div>
            )}
  
            {/* Buttons */}
            <div className="flex space-x-4">
              <Button onClick={handleSave} disabled={saving || !canEdit}>
                {saving ? 'Saving...' : 'Save Changes'}
              </Button>
              <Button variant="outline" onClick={handleCancel} disabled={saving}>
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
