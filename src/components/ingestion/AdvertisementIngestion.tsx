import { useState } from 'react';
import { AlertCircle, CheckCircle, FileUp, Plus, Upload, X } from 'lucide-react';
import { toast } from 'sonner';
import Modal from '../ui/Modal';
import { useApp } from '../../context/AppContext';
import {
  parseImportFile, rawRowToInput, validateImportRows,
  type ImportValidationResult,
} from '../../lib/ingestion';
import type { CollectionMethod, Platform } from '../../types';

interface AdvertisementIngestionProps {
  open: boolean;
  onClose: () => void;
}

const PLATFORMS: Platform[] = ['Instagram', 'Facebook', 'Telegram', 'Other'];

function localDateTimeValue(): string {
  return new Date().toISOString().slice(0, 16);
}

function resetManual() {
  return {
    text: '', sourceUrl: '', platform: 'Telegram' as Platform,
    capturedAt: localDateTimeValue(), collectionMethod: 'manual_entry' as CollectionMethod,
  };
}

export default function AdvertisementIngestion({ open, onClose }: AdvertisementIngestionProps) {
  const { state, addImportedAdvertisements } = useApp();
  const [mode, setMode] = useState<'file' | 'manual'>('file');
  const [preview, setPreview] = useState<ImportValidationResult | null>(null);
  const [fileName, setFileName] = useState('');
  const [fileError, setFileError] = useState('');
  const [manual, setManual] = useState(resetManual);

  function clearPreview() {
    setPreview(null);
    setFileError('');
    setFileName('');
  }

  function close() {
    clearPreview();
    setManual(resetManual());
    setMode('file');
    onClose();
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    setFileName(file.name);
    setFileError('');
    setPreview(null);
    try {
      const extension = file.name.toLowerCase().endsWith('.json') ? 'json_import' : 'csv_import';
      const rawRows = await parseImportFile(file);
      const inputs = rawRows.map(row => rawRowToInput(row, extension));
      setPreview(validateImportRows(inputs, state.advertisements));
    } catch (error) {
      setFileError(error instanceof Error ? error.message : 'Unable to read this file.');
    }
  }

  function validateManual() {
    const input = {
      ...manual,
      capturedAt: new Date(manual.capturedAt).toISOString(),
    };
    setPreview(validateImportRows([input], state.advertisements));
  }

  function handleImport() {
    if (!preview || preview.validRecords.length === 0) {
      toast.error('There are no valid, unique advertisements to import.');
      return;
    }
    addImportedAdvertisements(preview.validRecords);
    if (preview.invalidCount || preview.duplicateCount) {
      toast.success(`Imported ${preview.validRecords.length} records; ${preview.invalidCount + preview.duplicateCount} skipped.`);
    } else {
      toast.success(`Imported ${preview.validRecords.length} advertisement${preview.validRecords.length === 1 ? '' : 's'}.`);
    }
    close();
  }

  return (
    <Modal open={open} onClose={close} title="Import Advertisements" size="xl">
      <div className="p-6 space-y-5">
        <div className="bg-accent-light rounded-xl px-4 py-3 text-sm text-navy-3 flex gap-3">
          <AlertCircle className="w-5 h-5 text-accent flex-shrink-0 mt-0.5" />
          <p>Import only public advertisement data you are authorized to use. TRACE//FIN does not scrape websites or bypass platform restrictions.</p>
        </div>

        <div className="flex gap-1 p-1 bg-surface-2 rounded-lg w-fit">
          <button type="button" onClick={() => { setMode('file'); clearPreview(); }} className={mode === 'file' ? 'btn-primary text-xs' : 'btn-ghost text-xs'}>
            <FileUp className="w-3.5 h-3.5" /> Upload CSV / JSON
          </button>
          <button type="button" onClick={() => { setMode('manual'); clearPreview(); }} className={mode === 'manual' ? 'btn-primary text-xs' : 'btn-ghost text-xs'}>
            <Plus className="w-3.5 h-3.5" /> Add manually
          </button>
        </div>

        {mode === 'file' ? (
          <div className="space-y-4">
            <label className="block border-2 border-dashed border-border-2 rounded-xl p-8 text-center cursor-pointer hover:border-accent hover:bg-accent-light/40 transition-colors">
              <Upload className="w-7 h-7 mx-auto text-accent mb-2" />
              <span className="text-sm font-semibold text-navy block">Choose a CSV or JSON file</span>
              <span className="text-xs text-muted mt-1 block">Maximum 2 MB · headers required for CSV</span>
              <input type="file" accept=".csv,.json,text/csv,application/json" className="sr-only" onChange={e => handleFile(e.target.files?.[0])} />
            </label>
            {fileName && <p className="text-xs text-muted">Selected: <span className="font-semibold text-navy">{fileName}</span></p>}
            {fileError && <p className="text-sm text-critical flex gap-2 items-center"><X className="w-4 h-4" />{fileError}</p>}
            <div className="bg-surface-2 rounded-xl p-4 text-xs text-muted leading-relaxed">
              <p className="font-semibold text-navy mb-1">Accepted fields</p>
              <p>CSV headers or JSON properties: <code>text</code> / <code>content</code>, optional <code>title</code>, <code>sourceUrl</code> / <code>url</code>, <code>platform</code>, <code>capturedAt</code> / <code>timestamp</code>, and <code>collectionMethod</code>. Missing capture time defaults to now; unknown non-empty platforms are normalized to Other.</p>
            </div>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="field-label">Advertisement text *</label>
              <textarea className="textarea min-h-32" value={manual.text} onChange={e => setManual(value => ({ ...value, text: e.target.value }))} placeholder="Paste the publicly available advertisement text…" />
            </div>
            <div>
              <label className="field-label">Platform *</label>
              <select className="select w-full" value={manual.platform} onChange={e => setManual(value => ({ ...value, platform: e.target.value as Platform }))}>
                {PLATFORMS.map(platform => <option key={platform} value={platform}>{platform}</option>)}
              </select>
            </div>
            <div>
              <label className="field-label">Collection method</label>
              <select className="select w-full" value={manual.collectionMethod} onChange={e => setManual(value => ({ ...value, collectionMethod: e.target.value as CollectionMethod }))}>
                <option value="manual_entry">Manual entry</option>
                <option value="public_source">Imported public dataset</option>
              </select>
            </div>
            <div>
              <label className="field-label">Source URL</label>
              <input className="input" value={manual.sourceUrl} onChange={e => setManual(value => ({ ...value, sourceUrl: e.target.value }))} placeholder="https://…" />
            </div>
            <div>
              <label className="field-label">Capture timestamp</label>
              <input type="datetime-local" className="input" value={manual.capturedAt} onChange={e => setManual(value => ({ ...value, capturedAt: e.target.value }))} />
            </div>
            <div className="md:col-span-2 flex justify-end">
              <button type="button" className="btn-secondary" onClick={validateManual}><CheckCircle className="w-4 h-4" /> Validate entry</button>
            </div>
          </div>
        )}

        {preview && (
          <div className="border-t border-border pt-5 space-y-3">
            <div className="flex flex-wrap gap-3 items-center justify-between">
              <div>
                <p className="eyebrow">Import preview</p>
                <h3 className="font-display text-lg font-semibold text-navy">Review before saving</h3>
              </div>
              <div className="flex flex-wrap gap-2 text-xs">
                <span className="chip">Total {preview.rows.length}</span>
                <span className="chip text-low">Valid {preview.validRecords.length}</span>
                <span className="chip text-critical">Invalid {preview.invalidCount}</span>
                <span className="chip text-high">Duplicates {preview.duplicateCount}</span>
              </div>
            </div>
            <div className="max-h-52 overflow-y-auto rounded-xl bg-surface-2 divide-y divide-border">
              {preview.rows.map(row => (
                <div key={row.rowNumber} className="p-3 flex gap-3 items-start text-xs">
                  {row.errors.length ? <X className="w-4 h-4 text-critical flex-shrink-0 mt-0.5" /> : <CheckCircle className="w-4 h-4 text-low flex-shrink-0 mt-0.5" />}
                  <div className="min-w-0">
                    <p className="font-semibold text-navy">Row {row.rowNumber}: {row.input?.text.slice(0, 90) || 'No advertisement text'}</p>
                    {row.errors.length > 0 && <p className="text-critical mt-1">{row.errors.join(' ')}</p>}
                    {row.advertisement && <p className="text-muted mt-1">{row.advertisement.platform} · {row.advertisement.riskLevel} risk · {row.advertisement.riskScore}/100</p>}
                  </div>
                </div>
              ))}
            </div>
            <div className="flex justify-end gap-3">
              <button type="button" className="btn-secondary" onClick={clearPreview}>Clear preview</button>
              <button type="button" className="btn-primary" onClick={handleImport}><Upload className="w-4 h-4" /> Import {preview.validRecords.length} valid</button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
