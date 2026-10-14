import { useEffect, useRef, useState } from 'react';
import { CheckCircle, FileImage, Loader2, RotateCcw, ScanText, X, Type } from 'lucide-react';
import { toast } from 'sonner';
import Modal from '../ui/Modal';
import { useApp } from '../../context/AppContext';
import { hashAdvertisementImage, type AdvertisementImageMetadata } from '../../lib/imageHash';
import { recognizeAdvertisementImage, terminateOcrWorker, type OcrProgress } from '../../lib/ocr';
import { verifyAdvertisementText } from '../../lib/textVerification';
import { validateImportRows, type IngestionInput } from '../../lib/ingestion';
import { createEvidenceRecord } from '../../lib/evidence';
import { extractIndicators } from '../../lib/indicatorExtraction';
import type { Platform, TextVerificationResult } from '../../types';

const PLATFORMS: Platform[] = ['Instagram', 'Facebook', 'Telegram', 'Other'];
type ScanMode = 'image' | 'text';

export default function OcrAdvertisementScanner({ open, onClose, onAnalyzed }: { open: boolean; onClose: () => void; onAnalyzed: (id: string) => void }) {
  const { state, addImportedAdvertisements, addEvidence } = useApp();
  const [file, setFile] = useState<File | null>(null);
  const [metadata, setMetadata] = useState<AdvertisementImageMetadata | null>(null);
  const [previewUrl, setPreviewUrl] = useState('');
  const [progress, setProgress] = useState<OcrProgress>({ status: 'Preparing OCR…', progress: 0 });
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState('');
  const [ocrText, setOcrText] = useState('');
  const [reviewedText, setReviewedText] = useState('');
  const [confidence, setConfidence] = useState<number | undefined>();
  const [extractedAt, setExtractedAt] = useState('');
  const [verification, setVerification] = useState<TextVerificationResult | null>(null);
  const [platform, setPlatform] = useState<Platform>('Other');
  const [mode, setMode] = useState<ScanMode>('image');
  const controller = useRef<AbortController | null>(null);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); void terminateOcrWorker(); }, [previewUrl]);

  function reset() {
    controller.current?.abort();
    controller.current = null;
    void terminateOcrWorker();
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setFile(null); setMetadata(null); setPreviewUrl(''); setProcessing(false); setError(''); setOcrText(''); setReviewedText(''); setConfidence(undefined); setExtractedAt(''); setVerification(null); setProgress({ status: 'Preparing OCR…', progress: 0 });
  }

  async function selectFile(next: File) {
    reset();
    try {
      const image = await hashAdvertisementImage(next);
      const url = URL.createObjectURL(next);
      setFile(next); setMetadata({ ...image, ocrAvailable: true }); setPreviewUrl(url); setProcessing(true); setError('');
      const abortController = new AbortController(); controller.current = abortController;
      const result = await recognizeAdvertisementImage(next, setProgress, abortController.signal);
      setOcrText(result.text); setReviewedText(result.text); setConfidence(result.confidence); setExtractedAt(result.extractedAt);
      setVerification(verifyAdvertisementText({ ocrText: result.text, reviewedText: result.text, confidence: result.confidence }));
    } catch (err) {
      if ((err as Error).name !== 'AbortError') setError(err instanceof Error ? err.message : 'OCR could not process this image.');
    } finally { setProcessing(false); }
  }

  function reviewChanged(value: string) {
    setReviewedText(value);
    setVerification(verifyAdvertisementText({ ocrText, reviewedText: value, confidence, source: mode === 'text' ? 'manual' : 'ocr' }));
  }

  function switchMode(nextMode: ScanMode) {
    reset();
    setMode(nextMode);
  }

  function beginTextReview() {
    const text = reviewedText.trim();
    if (!text) {
      setError('Enter advertisement text before analysis.');
      return;
    }
    setOcrText('');
    setConfidence(undefined);
    setExtractedAt(new Date().toISOString());
    setVerification(verifyAdvertisementText({ ocrText: '', reviewedText: text, source: 'manual' }));
    setError('');
  }

  function analyze() {
    if (!reviewedText.trim()) { setError('Enter or correct readable advertisement text before analysis.'); return; }
    const input: IngestionInput = { text: reviewedText, platform, capturedAt: new Date().toISOString(), collectionMethod: 'manual_entry' };
    const validation = validateImportRows([input], state.advertisements);
    if (!validation.validRecords.length) { setError(validation.rows[0]?.errors.join(' ') || 'This advertisement could not be saved.'); return; }
    const ad = metadata ? { ...validation.validRecords[0], imageHash: metadata.sha256 } : validation.validRecords[0];
    addImportedAdvertisements([ad]);
    const details = verification ?? verifyAdvertisementText({ ocrText, reviewedText, confidence, source: mode === 'text' ? 'manual' : 'ocr' });
    const evidence = createEvidenceRecord(ad, extractIndicators(ad), undefined, metadata ?? undefined, mode === 'image' ? 'Created from OCR review.' : 'Created from manually entered text.', undefined, mode === 'image' ? { ocrText, reviewedText, confidence: confidence ?? 0, extractedAt, verificationFindings: details.findings } : undefined);
    addEvidence(evidence);
    toast.success(`Advertisement analyzed and ${mode === 'image' ? 'OCR' : 'text'} evidence saved.`);
    onAnalyzed(ad.id);
    reset();
    onClose();
  }

  return <Modal open={open} onClose={() => { reset(); onClose(); }} title="Analyze Advertisement" size="lg">
    <div className="p-5 space-y-5">
      <div className="grid grid-cols-2 gap-2 rounded-xl bg-surface-2 p-1" role="tablist" aria-label="Advertisement scanning mode">
        <button type="button" role="tab" aria-selected={mode === 'image'} onClick={() => switchMode('image')} className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors ${mode === 'image' ? 'bg-white text-navy shadow-sm' : 'text-muted hover:text-navy'}`}><FileImage className="w-4 h-4 inline mr-2" />Image / Screenshot <span className="text-xs font-normal">(OCR)</span></button>
        <button type="button" role="tab" aria-selected={mode === 'text'} onClick={() => switchMode('text')} className={`min-h-11 rounded-lg px-3 text-sm font-semibold transition-colors ${mode === 'text' ? 'bg-white text-navy shadow-sm' : 'text-muted hover:text-navy'}`}><Type className="w-4 h-4 inline mr-2" />Enter Text</button>
      </div>
      {mode === 'text' ? <>
        <div><p className="section-title">Enter advertisement text</p><p className="text-sm text-muted mt-1">Paste or type the advertisement content. It will use the same indicators and deterministic risk engine as OCR results.</p></div>
        <textarea aria-label="Advertisement text" className="textarea min-h-48" placeholder="Example: Rent a verified bank account. Receive transfers and get paid by commission…" value={reviewedText} onChange={event => { reviewChanged(event.target.value); setError(''); }} maxLength={10000} />
        <div className="flex flex-wrap justify-between gap-3 items-center text-xs text-muted"><span>{reviewedText.length.toLocaleString()} / 10,000 characters</span><span>Source: manually entered text · OCR confidence: not applicable</span></div>
        {error && <div role="alert" className="rounded-lg bg-critical-bg text-critical text-sm p-3">{error}</div>}
        {!verification ? <button type="button" className="btn-primary w-full justify-center" onClick={beginTextReview}><ScanText className="w-4 h-4" /> Review and Analyze Text</button> : <>
          <div className="rounded-xl border border-border p-4"><div className="flex items-center gap-2"><ScanText className="w-4 h-4 text-accent" /><p className="section-title">Verification findings</p></div>{verification.findings.length ? <div className="mt-3 space-y-2">{verification.findings.map(finding => <div key={finding.id} className="text-sm flex flex-wrap gap-2 items-baseline"><span className="badge bg-surface-2 text-navy-3">{finding.kind === 'format' ? 'Format' : 'Suspicious signal'}</span><strong className="text-navy">{finding.matchedValue || 'Unreadable text'}</strong><span className="text-muted">{finding.reason}</span><span className="text-xs text-accent">{finding.source.replace('_', ' ')}</span></div>)}</div> : <p className="text-sm text-muted mt-3">No indicators were detected in the reviewed text.</p>}</div>
          <div className="flex flex-wrap gap-3 items-end"><label className="text-sm font-semibold text-navy flex-1 min-w-40">Source platform<select className="select w-full mt-1" value={platform} onChange={event => setPlatform(event.target.value as Platform)}>{PLATFORMS.map(item => <option key={item}>{item}</option>)}</select></label><p className="text-xs text-muted max-w-sm">Format checks and suspicious indicators are automated signals, not factual verification. External verification is unavailable.</p></div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border"><button type="button" className="btn-secondary" onClick={() => { reset(); onClose(); }}><X className="w-4 h-4" /> Cancel</button><button type="button" className="btn-primary" onClick={analyze}><CheckCircle className="w-4 h-4" /> Analyze & Save</button></div>
        </>}
      </> : !file ? <label className="content-section border-2 border-dashed border-accent/40 flex flex-col items-center justify-center py-10 cursor-pointer hover:bg-accent-light/30"><FileImage className="w-9 h-9 text-accent mb-3" /><span className="btn-primary">Choose PNG, JPG, or WebP Image</span><span className="text-xs text-muted mt-3">Maximum 5 MB · image files only · no PDFs</span><input type="file" className="sr-only" accept="image/png,image/jpeg,image/webp" onChange={event => { const selected = event.target.files?.[0]; if (selected) void selectFile(selected); }} /></label> : <>
        <div className="grid sm:grid-cols-[150px_1fr] gap-4 items-start"><img src={previewUrl} alt="Advertisement preview" className="w-full max-h-40 object-contain rounded-lg border border-border bg-surface-2" /><div><p className="font-semibold text-navy break-all">{file.name}</p><p className="text-xs text-muted mt-1">{metadata?.mimeType} · {Math.round(file.size / 1024)} KB</p><p className="text-xs text-muted mt-2 break-all">SHA-256: {metadata?.sha256}</p></div></div>
        {processing && <div className="rounded-xl bg-accent-light p-4"><div className="flex items-center gap-2 text-sm font-semibold text-navy"><Loader2 className="w-4 h-4 animate-spin text-accent" /> {progress.status || 'Recognizing text…'}</div><div className="h-2 bg-white rounded-full mt-3 overflow-hidden"><div className="h-full bg-accent transition-all" style={{ width: `${progress.progress}%` }} /></div><button type="button" className="btn-secondary mt-3" onClick={() => { controller.current?.abort(); void terminateOcrWorker(); setProcessing(false); setError('OCR cancelled.'); }}>Cancel OCR</button></div>}
        {error && <div role="alert" className="rounded-lg bg-critical-bg text-critical text-sm p-3">{error}</div>}
        {!processing && (ocrText || reviewedText) && <>
          <div className="flex flex-wrap items-center justify-between gap-3"><div><p className="section-title">Review extracted text</p><p className="text-xs text-muted mt-1">Correct OCR mistakes before verification and risk analysis.</p></div><button type="button" className="btn-ghost text-xs" onClick={reset}><RotateCcw className="w-3 h-3" /> Choose another image</button></div>
          <textarea aria-label="Reviewed advertisement text" className="textarea min-h-36" value={reviewedText} onChange={event => reviewChanged(event.target.value)} />
          <div className="grid sm:grid-cols-3 gap-3 text-xs"><div className="metric-card"><span className="text-muted">OCR confidence</span><strong className="block text-lg text-navy mt-1">{confidence === undefined ? '—' : `${Math.round(confidence)}%`}</strong></div><div className="metric-card"><span className="text-muted">Text quality</span><strong className="block text-lg text-navy mt-1 capitalize">{verification?.quality.replace('_', ' ')}</strong></div><div className="metric-card"><span className="text-muted">Review changes</span><strong className="block text-lg text-navy mt-1">{verification?.changedCharacterCount ?? 0} chars</strong></div></div>
          <div className="flex flex-wrap gap-3 items-end"><label className="text-sm font-semibold text-navy flex-1 min-w-40">Source platform<select className="select w-full mt-1" value={platform} onChange={event => setPlatform(event.target.value as Platform)}>{PLATFORMS.map(item => <option key={item}>{item}</option>)}</select></label><div className="text-xs text-muted max-w-sm">Format checks and suspicious indicators are automated signals, not factual verification. External verification is unavailable.</div></div>
          <div className="rounded-xl border border-border p-4"><div className="flex items-center gap-2"><ScanText className="w-4 h-4 text-accent" /><p className="section-title">Verification findings</p></div>{verification?.findings.length ? <div className="mt-3 space-y-2">{verification.findings.map(finding => <div key={finding.id} className="text-sm flex flex-wrap gap-2 items-baseline"><span className="badge bg-surface-2 text-navy-3">{finding.kind === 'format' ? 'Format' : 'Suspicious signal'}</span><strong className="text-navy">{finding.matchedValue || 'Unreadable text'}</strong><span className="text-muted">{finding.reason}</span><span className="text-xs text-accent">{finding.source.replace('_', ' ')}</span></div>)}</div> : <p className="text-sm text-muted mt-3">No indicators were detected in the reviewed text.</p>}</div>
          <div className="flex justify-end gap-2 pt-2 border-t border-border"><button type="button" className="btn-secondary" onClick={() => { reset(); onClose(); }}><X className="w-4 h-4" /> Cancel</button><button type="button" className="btn-primary" onClick={analyze}><CheckCircle className="w-4 h-4" /> Analyze & Save</button></div>
        </>}
      </>}
    </div>
  </Modal>;
}
