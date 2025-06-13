
import React, { useState } from 'react';
import Header from '../components/Layout/Header';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Badge } from '../components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Plus, Edit, Trash2, Eye, MapPin, Calendar, Beaker, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { mockBrixData } from '../data/mockData';

const YourData = () => {
  const { user } = useAuth();
  
  // Filter mock data to show only user's submissions
  const userSubmissions = mockBrixData.filter(point => 
    point.submittedBy === user?.username || point.submittedBy === 'farmerjohn'
  );

  const getBrixColor = (brixLevel: number) => {
    if (brixLevel < 10) return 'bg-red-500';
    if (brixLevel < 15) return 'bg-orange-500';
    if (brixLevel < 20) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const handleEdit = (id: string) => {
    console.log('Edit submission:', id);
    // Mock edit functionality
  };

  const handleDelete = (id: string) => {
    console.log('Delete submission:', id);
    // Mock delete functionality
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
                          <TableHead>Crop</TableHead>
                          <TableHead>BRIX</TableHead>
                          <TableHead>Location</TableHead>
                          <TableHead>Date</TableHead>
                          <TableHead>Status</TableHead>
                          <TableHead>Actions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {userSubmissions.map((submission) => (
                          <TableRow key={submission.id}>
                            <TableCell>
                              <div>
                                <div className="font-medium">{submission.cropType}</div>
                                {submission.variety && (
                                  <div className="text-sm text-gray-600">{submission.variety}</div>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge className={`${getBrixColor(submission.brixLevel)} text-white`}>
                                {submission.brixLevel}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1 text-sm">
                                <MapPin className="w-3 h-3" />
                                <span>{submission.latitude.toFixed(3)}, {submission.longitude.toFixed(3)}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center space-x-1 text-sm">
                                <Calendar className="w-3 h-3" />
                                <span>{new Date(submission.measurementDate).toLocaleDateString()}</span>
                              </div>
                            </TableCell>
                            <TableCell>
                              {submission.verified ? (
                                <Badge variant="secondary" className="flex items-center space-x-1">
                                  <CheckCircle className="w-3 h-3" />
                                  <span>Verified</span>
                                </Badge>
                              ) : (
                                <Badge variant="outline">Pending</Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <div className="flex space-x-2">
                                <Link to={`/data-point/${submission.id}`}>
                                  <Button variant="ghost" size="sm">
                                    <Eye className="w-4 h-4" />
                                  </Button>
                                </Link>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleEdit(submission.id)}
                                >
                                  <Edit className="w-4 h-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => handleDelete(submission.id)}
                                  className="text-red-600 hover:text-red-800"
                                >
                                  <Trash2 className="w-4 h-4" />
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
