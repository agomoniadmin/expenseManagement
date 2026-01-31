import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import api from '@/shared/api/client';
import type { ImportJobResponse } from '@/shared/types/api';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';

export default function ImportJobDetailPage() {
  const { id } = useParams<{ id: string }>();

  const { data: job, isLoading } = useQuery({
    queryKey: ['import-job', id],
    queryFn: () => api.get<ImportJobResponse>(`/import/jobs/${id}`).then((r) => r.data),
    enabled: !!id,
  });

  if (isLoading) return <LoadingSpinner className="h-64" />;
  if (!job) return <div className="text-red-600">Job not found.</div>;

  return (
    <div className="max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Import Job</h1>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><span className="text-gray-500">Job ID:</span> <span className="font-mono">{job.jobId}</span></div>
          <div><span className="text-gray-500">Status:</span>{' '}
            <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${
              job.status === 'COMPLETED' ? 'bg-green-100 text-green-700' :
              job.status === 'FAILED' ? 'bg-red-100 text-red-700' :
              'bg-yellow-100 text-yellow-700'
            }`}>{job.status}</span>
          </div>
          <div><span className="text-gray-500">Started:</span> {new Date(job.startedAt).toLocaleString()}</div>
          <div><span className="text-gray-500">Completed:</span> {job.completedAt ? new Date(job.completedAt).toLocaleString() : '-'}</div>
        </div>

        {job.summary && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Summary</h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
              <Stat label="Total" value={job.summary.totalRecords} />
              <Stat label="Imported" value={job.summary.imported} color="green" />
              <Stat label="Duplicates" value={job.summary.duplicates} color="yellow" />
              <Stat label="Matched" value={job.summary.matched} color="blue" />
              <Stat label="Errors" value={job.summary.errors} color="red" />
            </div>
          </div>
        )}

        {job.errorDetails?.length > 0 && (
          <div>
            <h3 className="text-sm font-medium text-gray-700 mb-2">Errors</h3>
            <div className="space-y-1">
              {job.errorDetails.map((err, i) => (
                <div key={i} className="text-sm bg-red-50 rounded px-3 py-2">
                  <span className="font-medium">Line {err.line}:</span> {err.message}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value, color }: { label: string; value: number; color?: string }) {
  const colors: Record<string, string> = {
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    blue: 'text-blue-600',
    red: 'text-red-600',
  };
  return (
    <div className="text-center bg-gray-50 rounded-lg p-3">
      <p className="text-xs text-gray-500">{label}</p>
      <p className={`text-lg font-bold ${color ? colors[color] : ''}`}>{value}</p>
    </div>
  );
}
