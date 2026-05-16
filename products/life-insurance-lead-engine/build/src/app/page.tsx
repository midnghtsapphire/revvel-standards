'use client';

import React, { useState, useCallback } from 'react';
import Papa from 'papaparse';
import { Upload, CheckCircle, AlertCircle, Download } from 'lucide-react';
import { parseFile } from '@/utils/parser';
import { dedupeLeads, DedupeResult } from '@/utils/dedupe';
import AffiliateMarketing from '@/components/AffiliateMarketing';
import Newsletter from '@/components/Newsletter';
import AccessibilityControls from '@/components/AccessibilityControls';
import LeadGenerator from '@/components/LeadGenerator/LeadGenerator';

export default function Home() {
  const [isDragging, setIsDragging] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<DedupeResult | null>(null);

  const handleDrag = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setIsDragging(true);
    } else if (e.type === 'dragleave') {
      setIsDragging(false);
    }
  }, []);

  const processFile = async (file: File) => {
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.xlsx') && !file.name.endsWith('.xls')) {
      setError('Please upload a valid CSV or Excel file.');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      const parsedData = await parseFile(file);
      const dedupedData = dedupeLeads(parsedData);
      setResult(dedupedData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred while processing the file.');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  }, []);

  const handleFileInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const downloadCsv = () => {
    if (!result?.clean) return;

    const csv = Papa.unparse(result.clean);
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'cleaned_leads.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <main className="min-h-screen bg-gray-50 flex flex-col items-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="w-full max-w-5xl space-y-8">

        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-gray-900 sm:text-4xl">
            Life Insurance Lead Engine
          </h1>
          <p className="mt-4 text-lg text-gray-500 max-w-2xl mx-auto">
            Build targeted prospect worksheets for individuals and families by zip code and life event, with tailored pitch scripts — or upload existing lists to automatically remove duplicates.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 items-start">

          {/* Main Content Area */}
          <div className="md:col-span-2 space-y-8">

            <LeadGenerator />

            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
              <h2 className="text-xl font-bold text-gray-900 mb-4">Clean Existing Lead Lists</h2>
              <p className="text-sm text-gray-600 mb-6">
                Upload your CSV or Excel files. We&apos;ll de-dupe based on email, phone, and fuzzy name matching.
              </p>

              {/* Upload Area */}
              {!result && (
                <div
                  className={`flex justify-center px-6 pt-5 pb-6 border-2 border-dashed rounded-md transition-colors ${
                    isDragging ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-gray-400 bg-gray-50'
                  }`}
                  onDragEnter={handleDrag}
                  onDragLeave={handleDrag}
                  onDragOver={handleDrag}
                  onDrop={handleDrop}
                >
                  <div className="space-y-1 text-center">
                    <Upload className="mx-auto h-12 w-12 text-gray-400" />
                    <div className="flex text-sm text-gray-600 justify-center">
                      <label
                        htmlFor="file-upload"
                        className="relative cursor-pointer rounded-md font-medium text-blue-600 hover:text-blue-500 focus-within:outline-none focus-within:ring-2 focus-within:ring-offset-2 focus-within:ring-blue-500"
                      >
                        <span>Upload a file</span>
                        <input id="file-upload" name="file-upload" type="file" className="sr-only" accept=".csv, .xlsx, .xls" onChange={handleFileInput} />
                      </label>
                      <p className="pl-1">or drag and drop</p>
                    </div>
                    <p className="text-xs text-gray-500">CSV or Excel up to 50MB</p>
                  </div>
                </div>
              )}

              {/* Processing State */}
              {isProcessing && (
                <div className="text-center py-12 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-4 text-gray-600">Processing leads and finding duplicates...</p>
                </div>
              )}

              {/* Error State */}
              {error && (
                <div className="rounded-md bg-red-50 p-4 border border-red-200 mt-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-red-400" aria-hidden="true" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Error</h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>{error}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Results Area */}
              {result && !isProcessing && (
                <div className="bg-white overflow-hidden border border-gray-200 rounded-md mt-4">
                  <div className="px-4 py-5 sm:px-6 flex justify-between items-center bg-gray-50">
                    <div>
                      <h3 className="text-lg leading-6 font-medium text-gray-900">De-Duplication Results</h3>
                    </div>
                    <button
                      onClick={() => setResult(null)}
                      className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                    >
                      Start Over
                    </button>
                  </div>
                  <div className="border-t border-gray-200">
                    <dl>
                      <div className="bg-white px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                        <dt className="text-sm font-medium text-gray-500">Original Leads</dt>
                        <dd className="mt-1 text-sm text-gray-900 sm:mt-0 sm:col-span-2">{result.stats.originalCount}</dd>
                      </div>
                      <div className="bg-gray-50 px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 border-t border-gray-200">
                        <dt className="text-sm font-medium text-green-600">Cleaned Leads</dt>
                        <dd className="mt-1 text-sm font-bold text-green-600 sm:mt-0 sm:col-span-2 flex items-center gap-2">
                          {result.stats.cleanCount} <CheckCircle className="w-4 h-4" />
                        </dd>
                      </div>
                      <div className="bg-white px-4 py-4 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6 border-t border-gray-200">
                        <dt className="text-sm font-medium text-red-600">Duplicates Removed</dt>
                        <dd className="mt-1 text-sm text-red-600 sm:mt-0 sm:col-span-2">
                          {result.stats.removedCount}
                          <span className="text-xs text-gray-500 ml-2 block sm:inline">
                            ({result.stats.emailMatches} email, {result.stats.phoneMatches} phone, {result.stats.fuzzyNameMatches} fuzzy)
                          </span>
                        </dd>
                      </div>
                    </dl>
                  </div>
                  <div className="px-4 py-4 sm:px-6 bg-gray-50 border-t border-gray-200">
                    <button
                      onClick={downloadCsv}
                      className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 items-center gap-2"
                    >
                      <Download className="w-4 h-4" />
                      Download Clean CSV
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>

          {/* Sidebar */}
          <div className="md:col-span-1 space-y-6">
            <AffiliateMarketing />
            <Newsletter />
          </div>

        </div>
      </div>
      <AccessibilityControls />
    </main>
  );
}
