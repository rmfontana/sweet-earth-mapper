// src/pages/YourData.tsx

import React, { useState, useEffect } from 'react';
import Header from '../components/Layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Table, TableBody, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Plus, Beaker, CheckCircle, MapPin } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { fetchFormattedSubmissions } from '../lib/fetchSubmissions';
import SubmissionTableRow from '../components/common/SubmissionTableRow';
import { BrixDataPoint } from '../types';

const YourData = () => {
  const { user } = useAuth();
  const [userSubmissions, setUserSubmissions] = useState<BrixDataPoint[]>([]);
  const [loading, setLoading] = useState(true);

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
      } catch (e) {
        console.error("Failed to load user submissions:", e);
        setUserSubmissions([]);
      } finally {
        setLoading(false);
      }
    };
    loadSubmissions();
  }, [user?.display_name]);

  const handleDelete = (id: string) => {
    console.log('Delete submission:', id);
    // TODO: Implement actual delete functionality here, e.g.:
    // await deleteSubmissionFromSupabase(id);
    // setUserSubmissions(prev => prev.filter(sub => sub.id !== id));
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
                          <TableHead>Location / Notes</TableHead>
                          <TableHead>Assessment Date</TableHead>
                          <TableHead className="text-center">Verified?</TableHead>
                          <TableHead className="text-center">Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userSubmissions.map((submission) => (
                          <SubmissionTableRow
                            key={submission.id}
                            submission={submission}
                            onDelete={handleDelete}
                            isOwner={true} // For 'YourData', the user is always the owner
                          />
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
