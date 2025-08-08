import React, { useState, useEffect } from 'react';
import Header from '../components/Layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Plus, Edit, Trash2, Eye, MapPin, Calendar, Beaker, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchFormattedSubmissions } from '../lib/fetchSubmissions';
import { fetchBrixByCrop } from '../lib/fetchBrixByCrop'; 
import { BrixThresholds } from '../lib/getBrixQuality';
import { useBrixColorFromContext } from '../lib/getBrixColor';


const YourData = () => {
  const { user } = useAuth();
  const [userSubmissions, setUserSubmissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const [brixThresholdsByCrop, setBrixThresholdsByCrop] = useState<Record<string, BrixThresholds>>({});

  useEffect(() => {
    const loadSubmissions = async () => {
      if (!user?.display_name) {
        setUserSubmissions([]);
        setLoading(false);
        return;
      }
      setLoading(true);
      try {
        const submissions = await fetchFormattedSubmissions();
        const filtered = submissions.filter(sub => sub.submittedBy === user.display_name);
        setUserSubmissions(filtered);
  
        // Get unique crop types
        const uniqueCrops = [...new Set(filtered.map(sub => sub.cropType?.toLowerCase()).filter(Boolean))];
  
        const thresholdsEntries = await Promise.all(
          uniqueCrops.map(async (crop) => {
            const result = await fetchBrixByCrop(crop);
            return result ? [crop, result.brixLevels] : null;
          })
        );
  
        const thresholdMap = Object.fromEntries(
          thresholdsEntries.filter(Boolean) as [string, BrixThresholds][]
        );
  
        console.log('Threshold map:', thresholdMap);
        setBrixThresholdsByCrop(thresholdMap);
      } catch (e) {
        console.error(e);
        setUserSubmissions([]);
      } finally {
        setLoading(false);
      }
    };

    loadSubmissions();
  }, [user?.display_name]);

  const handleDelete = (id: string) => {
    console.log('Delete submission:', id);
    // Mock delete functionality
    // TODO Handle delete!
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <Card>
            <CardContent className="text-center py-12">
              <h2 className="text-2xl font-bold text-gray-900 mb-2">Please Log In</h2>
              <p className="text-gray-600 mb-6">
                You need to be logged in to view your data submissions.
              </p>
              <Link to="/login">
                <Button>Log In</Button>
              </Link>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50">
        <Header />
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
          <p className="text-gray-600">Loading your submissions...</p>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-gray-900 mb-2">
              Your Data
            </h1>
            <p className="text-gray-600">
              Manage and track your BRIX measurement submissions
            </p>
          </div>
          
          <Link to="/data-entry">
            <Button className="flex items-center space-x-2 bg-green-600 hover:bg-green-700">
              <Plus className="w-4 h-4" />
              <span>Add New Measurement</span>
            </Button>
          </Link>
        </div>

        <Tabs defaultValue="submissions" className="space-y-6">
          <TabsList>
            <TabsTrigger value="submissions">My Submissions</TabsTrigger>
            <TabsTrigger value="stats">Statistics</TabsTrigger>
          </TabsList>

          <TabsContent value="submissions">
            <Card>
              <CardHeader>
                <CardTitle>Submitted Measurements ({userSubmissions.length})</CardTitle>
              </CardHeader>
              <CardContent>
                {userSubmissions.length === 0 ? (
                  <div className="text-center py-12">
                    <Beaker className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">No submissions yet</h3>
                    <p className="text-gray-600 mb-6">
                      Start contributing by submitting your first BRIX measurement!
                    </p>
                    <Link to="/data-entry">
                      <Button className="bg-green-600 hover:bg-green-700">
                        <Plus className="w-4 h-4 mr-2" />
                        Submit First Measurement
                      </Button>
                    </Link>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Crop / Variety / Brand / Store</TableHead>
                        <TableHead className="text-center">BRIX</TableHead>
                        <TableHead>Location</TableHead>
                        <TableHead>Assessment Date</TableHead>
                        <TableHead className="text-center">Verified?</TableHead>
                        <TableHead className="text-center">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {userSubmissions.map((submission) => (
                        <TableRow 
                          key={submission.id} 
                          className="hover:bg-gray-100 transition-colors duration-200 cursor-pointer"
                        >
                          <TableCell className="whitespace-nowrap">
                            <div>
                              <div className="font-semibold text-gray-900">{submission.cropType}</div>

                              {submission.label && (
                                <div className="text-xs text-gray-500">{submission.label}</div>
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
                            {(() => {
                              const colorClass = useBrixColorFromContext(
                                submission.cropType?.toLowerCase().trim() || '',
                                submission.brixLevel
                              );
                              return (
                                <Badge className={`${colorClass} text-white px-3 py-1 rounded-full`}>
                                  {colorClass === 'bg-gray-300' ? '...' : submission.brixLevel}
                                </Badge>
                              );
                            })()}
                          </TableCell>

                          <TableCell>
                            <div className="flex items-center space-x-1 text-sm text-gray-700">
                              <MapPin className="w-4 h-4" />
                              <span>{submission.locationName}</span>
                            </div>
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
                              <Link to={`/data-point/${submission.id}?edit=true`} state={{ from: '/your-data' }}>
                                <Button variant="ghost" size="sm" aria-label="Edit submission">
                                  <Edit className="w-5 h-5" />
                                </Button>
                              </Link>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDelete(submission.id)}
                                className="text-red-600 hover:text-red-800"
                                aria-label="Delete submission"
                              >
                                <Trash2 className="w-5 h-5" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="stats">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <Beaker className="w-8 h-8 text-blue-600" />
                    <div>
                      <p className="text-2xl font-bold">{userSubmissions.length}</p>
                      <p className="text-sm text-gray-600">Total Submissions</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <CheckCircle className="w-8 h-8 text-green-600" />
                    <div>
                      <p className="text-2xl font-bold">
                        {userSubmissions.filter(s => s.verified).length}
                      </p>
                      <p className="text-sm text-gray-600">Verified Measurements</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardContent className="p-6">
                  <div className="flex items-center space-x-2">
                    <MapPin className="w-8 h-8 text-purple-600" />
                    <div>
                      <p className="text-2xl font-bold">
                        {new Set(userSubmissions.map(s => s.cropType)).size}
                      </p>
                      <p className="text-sm text-gray-600">Unique Crop Types</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default YourData;
