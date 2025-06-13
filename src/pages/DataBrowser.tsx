
import React from 'react';
import Header from '../components/Layout/Header';
import DataTable from '../components/DataBrowser/DataTable';

const DataBrowser = () => {
  return (
    <div className="min-h-screen bg-gray-50">
      <Header />
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <DataTable />
      </main>
    </div>
  );
};

export default DataBrowser;
