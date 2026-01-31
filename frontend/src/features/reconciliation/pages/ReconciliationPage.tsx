import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/shared/api/client';
import type { ReconciliationCandidateResponse, ConfirmReconciliationRequest } from '@/shared/types/api';
import { CurrencyDisplay } from '@/shared/components/CurrencyDisplay';
import { LoadingSpinner } from '@/shared/components/LoadingSpinner';

export default function ReconciliationPage() {
  const queryClient = useQueryClient();

  const { data: candidates, isLoading } = useQuery({
    queryKey: ['reconciliation-candidates'],
    queryFn: () =>
      api.get<ReconciliationCandidateResponse[]>('/reconciliation/candidates').then((r) => r.data),
  });

  const confirmMutation = useMutation({
    mutationFn: (data: ConfirmReconciliationRequest) =>
      api.post('/reconciliation/confirm', data).then((r) => r.data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['reconciliation-candidates'] });
    },
  });

  if (isLoading) return <LoadingSpinner className="h-64" />;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">Reconciliation</h1>
      <p className="text-sm text-gray-500">
        Review matched transaction pairs. Confirm correct matches or skip uncertain ones.
      </p>

      {!candidates?.length ? (
        <div className="bg-white rounded-xl border border-gray-200 p-8 text-center text-sm text-gray-500">
          No reconciliation candidates found. Import a statement to generate matches.
        </div>
      ) : (
        <div className="space-y-4">
          {candidates.map((candidate) => (
            <div key={candidate.matchId} className="bg-white rounded-xl border border-gray-200 p-6">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium">Confidence:</span>
                  <span className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold ${
                    candidate.confidenceScore >= 0.9 ? 'bg-green-100 text-green-700' :
                    candidate.confidenceScore >= 0.7 ? 'bg-yellow-100 text-yellow-700' :
                    'bg-red-100 text-red-700'
                  }`}>
                    {(candidate.confidenceScore * 100).toFixed(0)}%
                  </span>
                </div>
                <button
                  onClick={() => confirmMutation.mutate({ matchId: candidate.matchId })}
                  disabled={confirmMutation.isPending}
                  className="rounded-lg bg-green-600 px-4 py-2 text-sm font-medium text-white hover:bg-green-700 disabled:opacity-50"
                >
                  Confirm Match
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TxnCard label="Your Transaction" txn={candidate.userTransaction} />
                <TxnCard label="Imported Transaction" txn={candidate.importedTransaction} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function TxnCard({ label, txn }: { label: string; txn: ReconciliationCandidateResponse['userTransaction'] }) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="text-xs font-medium text-gray-500 mb-2">{label}</p>
      <div className="space-y-1 text-sm">
        <div className="flex justify-between">
          <span className="text-gray-600">Date</span>
          <span className="font-medium">{txn.date}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Merchant</span>
          <span className="font-medium">{txn.merchant}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-gray-600">Amount</span>
          <CurrencyDisplay amount={txn.amount} className="font-medium" />
        </div>
      </div>
    </div>
  );
}
