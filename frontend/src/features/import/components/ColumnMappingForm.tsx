import { useState } from 'react';

interface ColumnMappingFormProps {
  /** CSV headers for dropdown selection. When absent, fields become text inputs. */
  headers?: string[];
  onSubmit: (mapping: MappingResult) => void;
  onCancel: () => void;
  initialMapping?: {
    dateColumn: string;
    merchantColumn: string;
    amountColumn: string;
    typeColumn: string | null;
    dateFormat: string;
  };
  /** When true, always saves as profile — hides the checkbox and requires profile name. */
  alwaysSaveAsProfile?: boolean;
  initialProfileName?: string;
}

export interface MappingResult {
  dateColumn: string;
  merchantColumn: string;
  amountColumn: string;
  typeColumn: string | undefined;
  dateFormat: string;
  saveAsProfile: boolean;
  profileName: string;
}

export function ColumnMappingForm({
  headers,
  onSubmit,
  onCancel,
  initialMapping,
  alwaysSaveAsProfile,
  initialProfileName,
}: ColumnMappingFormProps) {
  const [dateColumn, setDateColumn] = useState(initialMapping?.dateColumn ?? '');
  const [merchantColumn, setMerchantColumn] = useState(initialMapping?.merchantColumn ?? '');
  const [amountColumn, setAmountColumn] = useState(initialMapping?.amountColumn ?? '');
  const [typeColumn, setTypeColumn] = useState(initialMapping?.typeColumn ?? '');
  const [dateFormat, setDateFormat] = useState(initialMapping?.dateFormat ?? 'MM/dd/yyyy');
  const [saveAsProfile, setSaveAsProfile] = useState(alwaysSaveAsProfile ?? false);
  const [profileName, setProfileName] = useState(initialProfileName ?? '');

  const effectiveSave = alwaysSaveAsProfile || saveAsProfile;
  const isValid =
    dateColumn &&
    merchantColumn &&
    amountColumn &&
    (!effectiveSave || profileName.trim());

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!isValid) return;
    onSubmit({
      dateColumn,
      merchantColumn,
      amountColumn,
      typeColumn: typeColumn || undefined,
      dateFormat,
      saveAsProfile: effectiveSave,
      profileName: profileName.trim(),
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40">
      <form
        onSubmit={handleSubmit}
        className="w-full max-w-md rounded-xl bg-white p-6 shadow-xl space-y-4"
      >
        <h3 className="text-lg font-semibold">Map CSV Columns</h3>
        <p className="text-sm text-gray-500">
          {headers
            ? 'Select which CSV column maps to each field.'
            : 'Enter the CSV column header names your bank uses.'}
        </p>

        <div className="space-y-3">
          <ColumnField label="Date Column *" value={dateColumn} onChange={setDateColumn} options={headers} />
          <ColumnField label="Merchant Column *" value={merchantColumn} onChange={setMerchantColumn} options={headers} />
          <ColumnField label="Amount Column *" value={amountColumn} onChange={setAmountColumn} options={headers} />
          <ColumnField label="Type Column" value={typeColumn} onChange={setTypeColumn} options={headers} optional />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Date Format</label>
            <input
              type="text"
              value={dateFormat}
              onChange={(e) => setDateFormat(e.target.value)}
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              placeholder="MM/dd/yyyy"
            />
            <p className="mt-1 text-xs text-gray-400">e.g. MM/dd/yyyy, yyyy-MM-dd, dd/MM/yyyy</p>
          </div>
        </div>

        {alwaysSaveAsProfile ? (
          <div className="border-t pt-3 space-y-2">
            <label className="block text-sm font-medium text-gray-700">Profile Name *</label>
            <input
              type="text"
              value={profileName}
              onChange={(e) => setProfileName(e.target.value)}
              placeholder="e.g. Chase Checking"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
            />
          </div>
        ) : (
          <div className="border-t pt-3 space-y-2">
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={saveAsProfile}
                onChange={(e) => setSaveAsProfile(e.target.checked)}
                className="rounded border-gray-300"
              />
              Save as profile for this account
            </label>
            {saveAsProfile && (
              <input
                type="text"
                value={profileName}
                onChange={(e) => setProfileName(e.target.value)}
                placeholder="Profile name (e.g. Chase Checking)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
              />
            )}
          </div>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={!isValid}
            className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
          >
            {alwaysSaveAsProfile ? 'Save Profile' : 'Apply Mapping'}
          </button>
        </div>
      </form>
    </div>
  );
}

function ColumnField({
  label, value, onChange, options, optional,
}: {
  label: string; value: string; onChange: (v: string) => void; options?: string[]; optional?: boolean;
}) {
  if (options) {
    return (
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
        >
          <option value="">{optional ? '(none)' : 'Select column...'}</option>
          {options.map((h) => (
            <option key={h} value={h}>{h}</option>
          ))}
        </select>
      </div>
    );
  }

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={optional ? '(optional)' : 'Column header name'}
        className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
      />
    </div>
  );
}
