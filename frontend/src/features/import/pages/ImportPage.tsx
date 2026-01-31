import { useState, useCallback, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import api from '@/shared/api/client';
import type {
  ImportJobResponse,
  AccountResponse,
  ImportProfileResponse,
  CreateImportProfileRequest,
  ApiError,
} from '@/shared/types/api';
import { DataTable, type Column } from '@/shared/components/DataTable';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';
import { FileDropZone } from '../components/FileDropZone';
import { ColumnMappingForm, type MappingResult } from '../components/ColumnMappingForm';
import { AxiosError } from 'axios';

const jobColumns: Column<ImportJobResponse>[] = [
  { key: 'jobId', header: 'Job ID', render: (r) => <span className="font-mono text-xs">{r.jobId.slice(0, 8)}...</span> },
  { key: 'status', header: 'Status', render: (r) => (
    <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
      r.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
      r.status === 'FAILED' ? 'bg-red-100 text-red-700' :
      'bg-yellow-100 text-yellow-700'
    }`}>{r.status}</span>
  )},
  { key: 'imported', header: 'Imported', render: (r) => r.summary?.imported ?? '-' },
  { key: 'duplicates', header: 'Duplicates', render: (r) => r.summary?.duplicates ?? '-' },
  { key: 'errors', header: 'Errors', render: (r) => r.summary?.errors ?? '-' },
  { key: 'startedAt', header: 'Started', render: (r) => new Date(r.startedAt).toLocaleString() },
];

function extractErrorMessage(error: unknown): string {
  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiError | undefined;
    if (data?.message) return data.message;
    if (data?.details?.length) return data.details.join(', ');
  }
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred.';
}

/** Fetch profile for account, returning null (not throwing) on 404. */
async function fetchProfileForAccount(accountId: string): Promise<ImportProfileResponse | null> {
  try {
    const res = await api.get<ImportProfileResponse>(`/import/profiles/account/${accountId}`);
    return res.data;
  } catch (err) {
    if (err instanceof AxiosError && err.response?.status === 404) return null;
    throw err;
  }
}

export default function ImportPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [accountId, setAccountId] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [csvHeaders, setCsvHeaders] = useState<string[] | null>(null);
  const [showMappingForm, setShowMappingForm] = useState(false);
  const [mapping, setMapping] = useState<MappingResult | null>(null);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [uploadAfterMapping, setUploadAfterMapping] = useState(false);

  // ---- Queries ----

  const { data: accounts } = useQuery({
    queryKey: ['accounts'],
    queryFn: () => api.get<AccountResponse[]>('/accounts').then((r) => r.data),
  });

  const { data: jobs, isLoading: jobsLoading } = useQuery({
    queryKey: ['import-jobs'],
    queryFn: () => api.get<ImportJobResponse[]>('/import/jobs').then((r) => r.data),
  });

  const { data: allProfiles, isLoading: profilesLoading } = useQuery({
    queryKey: ['import-profiles'],
    queryFn: () => api.get<ImportProfileResponse[]>('/import/profiles').then((r) => r.data),
  });

  const { data: savedProfile, isLoading: profileLoading } = useQuery({
    queryKey: ['import-profile', accountId],
    queryFn: () => fetchProfileForAccount(accountId),
    enabled: !!accountId,
    retry: false,
  });

  // Auto-open mapping form when headers arrive and no saved profile exists
  const [headersReady, setHeadersReady] = useState(false);
  useEffect(() => {
    if (headersReady && csvHeaders && !profileLoading && savedProfile === null) {
      setShowMappingForm(true);
      setHeadersReady(false);
    }
  }, [headersReady, csvHeaders, profileLoading, savedProfile]);

  // ---- Mutations ----

  const headersMutation = useMutation({
    mutationFn: async (file: File) => {
      const fd = new FormData();
      fd.append('file', file);
      return api.post<string[]>('/import/preview-headers', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data);
    },
    onSuccess: (headers) => {
      setCsvHeaders(headers);
      setHeadersReady(true);
    },
  });

  const deleteProfileMutation = useMutation({
    mutationFn: (profileId: string) => api.delete(`/import/profiles/${profileId}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-profile', accountId] });
      queryClient.invalidateQueries({ queryKey: ['import-profiles'] });
      setMapping(null);
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async () => {
      if (!selectedFile || !accountId) throw new Error('Missing file or account');
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('accountId', accountId);

      if (savedProfile) {
        formData.append('profileId', savedProfile.id);
      } else if (mapping) {
        formData.append('dateColumn', mapping.dateColumn);
        formData.append('merchantColumn', mapping.merchantColumn);
        formData.append('amountColumn', mapping.amountColumn);
        if (mapping.typeColumn) formData.append('typeColumn', mapping.typeColumn);
        formData.append('dateFormat', mapping.dateFormat);
      }

      return api.post<ImportJobResponse>('/import/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      }).then((r) => r.data);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['import-jobs'] });
      navigate(`/import/jobs/${data.jobId}`);
    },
    onError: (error) => {
      setUploadError(extractErrorMessage(error));
    },
  });

  const saveProfileMutation = useMutation({
    mutationFn: (req: CreateImportProfileRequest) =>
      api.post<ImportProfileResponse>('/import/profiles', req).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['import-profile', accountId] });
      queryClient.invalidateQueries({ queryKey: ['import-profiles'] });
    },
  });

  // ---- Handlers ----

  const handleFileSelect = useCallback((file: File) => {
    setSelectedFile(file);
    setUploadError(null);
    setMapping(null);
    setCsvHeaders(null);
    setHeadersReady(false);
    headersMutation.mutate(file);
  }, [headersMutation]);

  // When mapping is set after clicking Upload, trigger the actual upload
  const [pendingUpload, setPendingUpload] = useState<MappingResult | null>(null);
  useEffect(() => {
    if (pendingUpload && selectedFile && accountId) {
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('accountId', accountId);
      formData.append('dateColumn', pendingUpload.dateColumn);
      formData.append('merchantColumn', pendingUpload.merchantColumn);
      formData.append('amountColumn', pendingUpload.amountColumn);
      if (pendingUpload.typeColumn) formData.append('typeColumn', pendingUpload.typeColumn);
      formData.append('dateFormat', pendingUpload.dateFormat);

      setPendingUpload(null);
      setUploadAfterMapping(false);

      api.post<ImportJobResponse>('/import/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
        .then((r) => {
          queryClient.invalidateQueries({ queryKey: ['import-jobs'] });
          navigate(`/import/jobs/${r.data.jobId}`);
        })
        .catch((error) => {
          setUploadError(extractErrorMessage(error));
        });
    }
  }, [pendingUpload, selectedFile, accountId, queryClient, navigate]);

  function handleMappingSubmit(result: MappingResult) {
    setMapping(result);
    setShowMappingForm(false);

    if (result.saveAsProfile && accountId) {
      saveProfileMutation.mutate({
        accountId,
        profileName: result.profileName,
        dateColumn: result.dateColumn,
        merchantColumn: result.merchantColumn,
        amountColumn: result.amountColumn,
        typeColumn: result.typeColumn,
        dateFormat: result.dateFormat,
      });
    }

    if (uploadAfterMapping) {
      setPendingUpload(result);
    }
  }

  function handleUpload() {
    setUploadError(null);
    // If no mapping exists, intercept and open the mapping form first
    if (!savedProfile && !mapping) {
      if (csvHeaders) {
        setUploadAfterMapping(true);
        setShowMappingForm(true);
      }
      return;
    }
    uploadMutation.mutate();
  }

  const hasMappingReady = !!savedProfile || !!mapping;
  const canUpload = !!accountId && !!selectedFile && !!csvHeaders;

  function accountNameById(id: string): string {
    return accounts?.find((a) => a.id === id)?.name ?? id.slice(0, 8);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Import Statements</h1>

      {/* Upload Form */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Upload CSV</h2>

        {uploadError && (
          <div className="rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
            {uploadError}
          </div>
        )}

        {/* Step 1: Select Account */}
        <div className="space-y-1">
          <label className="block text-sm font-medium text-gray-700">Account</label>
          <select
            value={accountId}
            onChange={(e) => {
              setAccountId(e.target.value);
              setMapping(null);
              setSelectedFile(null);
              setCsvHeaders(null);
            }}
            className="rounded-lg border border-gray-300 px-3 py-2 text-sm w-full max-w-xs"
          >
            <option value="">Select account</option>
            {accounts?.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
          </select>
        </div>

        {/* Step 2: File drop zone */}
        {accountId && (
          <FileDropZone onFileSelect={handleFileSelect} disabled={!accountId} />
        )}

        {/* Step 3: Column mapping status */}
        {accountId && selectedFile && (
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 space-y-3">
            <h3 className="text-sm font-semibold text-gray-700">Column Mapping</h3>

            {headersMutation.isPending ? (
              <p className="text-sm text-gray-500">Reading CSV headers...</p>
            ) : profileLoading ? (
              <p className="text-sm text-gray-500">Checking for saved profile...</p>
            ) : savedProfile ? (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center gap-1.5 rounded-full bg-green-100 px-3 py-1 text-xs font-medium text-green-700">
                  <svg className="h-3.5 w-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd"/>
                  </svg>
                  Auto-mapped via "{savedProfile.profileName}"
                </span>
                <span className="text-xs text-gray-500">
                  {savedProfile.dateColumn} / {savedProfile.merchantColumn} / {savedProfile.amountColumn}
                  {savedProfile.typeColumn ? ` / ${savedProfile.typeColumn}` : ''}
                </span>
                {csvHeaders && (
                  <button
                    type="button"
                    onClick={() => setShowMappingForm(true)}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    Edit
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => deleteProfileMutation.mutate(savedProfile.id)}
                  className="text-xs text-red-600 hover:underline"
                >
                  Delete Profile
                </button>
              </div>
            ) : mapping ? (
              <div className="flex items-center gap-3 flex-wrap">
                <span className="inline-flex items-center rounded-full bg-blue-100 px-3 py-1 text-xs font-medium text-blue-700">
                  Columns mapped
                </span>
                <span className="text-xs text-gray-500">
                  {mapping.dateColumn} / {mapping.merchantColumn} / {mapping.amountColumn}
                  {mapping.typeColumn ? ` / ${mapping.typeColumn}` : ''}
                </span>
                {csvHeaders && (
                  <button
                    type="button"
                    onClick={() => setShowMappingForm(true)}
                    className="text-xs text-primary-600 hover:underline"
                  >
                    Edit
                  </button>
                )}
              </div>
            ) : csvHeaders ? (
              <div className="flex items-center gap-3">
                <p className="text-sm text-amber-700">No column mapping configured for this account.</p>
                <button
                  type="button"
                  onClick={() => setShowMappingForm(true)}
                  className="rounded-lg border border-primary-300 bg-primary-50 px-3 py-1.5 text-xs font-medium text-primary-700 hover:bg-primary-100"
                >
                  Map Columns
                </button>
              </div>
            ) : null}
          </div>
        )}

        {/* Upload button */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleUpload}
            disabled={!canUpload || uploadMutation.isPending}
            className="rounded-lg bg-primary-600 px-5 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {uploadMutation.isPending
              ? 'Uploading...'
              : !hasMappingReady && csvHeaders
                ? 'Map Columns & Upload'
                : 'Upload'}
          </button>
        </div>
      </div>

      {/* Column Mapping Modal */}
      {showMappingForm && csvHeaders && (
        <ColumnMappingForm
          headers={csvHeaders}
          onSubmit={handleMappingSubmit}
          onCancel={() => setShowMappingForm(false)}
          initialMapping={savedProfile ? {
            dateColumn: savedProfile.dateColumn,
            merchantColumn: savedProfile.merchantColumn,
            amountColumn: savedProfile.amountColumn,
            typeColumn: savedProfile.typeColumn,
            dateFormat: savedProfile.dateFormat,
          } : mapping ? {
            dateColumn: mapping.dateColumn,
            merchantColumn: mapping.merchantColumn,
            amountColumn: mapping.amountColumn,
            typeColumn: mapping.typeColumn ?? null,
            dateFormat: mapping.dateFormat,
          } : undefined}
        />
      )}

      {/* Saved Import Profiles */}
      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <h2 className="text-lg font-semibold">Saved Column Profiles</h2>
        <p className="text-sm text-gray-500">
          When you upload a CSV for an account that has a saved profile, columns are mapped automatically.
        </p>

        {profilesLoading ? (
          <LoadingSpinner className="h-20" />
        ) : allProfiles && allProfiles.length > 0 ? (
          <div className="divide-y divide-gray-100">
            {allProfiles.map((p) => (
              <div key={p.id} className="flex items-center justify-between py-3 gap-4">
                <div className="min-w-0">
                  <p className="text-sm font-medium text-gray-900 truncate">{p.profileName}</p>
                  <p className="text-xs text-gray-500">
                    Account: {accountNameById(p.accountId)}
                  </p>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Date: <span className="font-mono">{p.dateColumn}</span>
                    {' / '}Merchant: <span className="font-mono">{p.merchantColumn}</span>
                    {' / '}Amount: <span className="font-mono">{p.amountColumn}</span>
                    {p.typeColumn && <>{' / '}Type: <span className="font-mono">{p.typeColumn}</span></>}
                    {' '}({p.dateFormat})
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    if (confirm(`Delete profile "${p.profileName}"?`)) {
                      deleteProfileMutation.mutate(p.id);
                    }
                  }}
                  className="shrink-0 rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  Delete
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-400 py-4">
            No saved profiles yet. Upload a CSV and check "Save as profile" in the column mapping step.
          </p>
        )}
      </div>

      {/* Job History */}
      <div>
        <h2 className="text-lg font-semibold mb-3">Import History</h2>
        {jobsLoading ? (
          <LoadingSpinner className="h-32" />
        ) : (
          <DataTable
            columns={jobColumns}
            data={jobs ?? []}
            keyExtractor={(r) => r.jobId}
            onRowClick={(r) => navigate(`/import/jobs/${r.jobId}`)}
            emptyMessage="No imports yet."
          />
        )}
      </div>
    </div>
  );
}
