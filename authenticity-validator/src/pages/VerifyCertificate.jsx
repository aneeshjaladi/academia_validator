import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { useAuth } from '../context/AuthContext';
import { Card, PageHeader, Btn, Badge, ConfidenceBar, Spinner, FormGroup } from '../components/UI';
import toast from 'react-hot-toast';
import styles from './VerifyCertificate.module.css';

const MAX_SIZE = 10 * 1024 * 1024; // 10MB

export default function VerifyCertificate() {
  const { API } = useAuth();
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [manualId, setManualId] = useState('');
  const [tab, setTab] = useState('upload'); // upload | manual

  const onDrop = useCallback((accepted, rejected) => {
    if (rejected.length > 0) { toast.error('File rejected. Use PDF, JPEG, or PNG under 10MB.'); return; }
    const f = accepted[0];
    setFile(f);
    setResult(null);
    if (f.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = e => setPreview(e.target.result);
      reader.readAsDataURL(f);
    } else { setPreview(null); }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': [], 'image/jpeg': [], 'image/png': [] },
    maxSize: MAX_SIZE,
    multiple: false,
  });

  const handleUploadVerify = async () => {
    if (!file) { toast.error('Please select a file first'); return; }
    setLoading(true);
    setResult(null);
    try {
      const fd = new FormData();
      fd.append('document', file);
      fd.append('verifierType', 'public');
      const { data } = await API.post('/verification', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
      if (data.result === 'authentic') toast.success('Certificate verified as AUTHENTIC');
      else if (data.result === 'forged') toast.error('⚠ Certificate detected as FORGED');
      else toast('Certificate marked SUSPICIOUS — manual review recommended', { icon: '⚠' });
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Verification failed. Please try again.');
    } finally { setLoading(false); }
  };

  const handleManualVerify = async () => {
    if (!manualId.trim()) { toast.error('Enter a certificate ID'); return; }
    setLoading(true);
    setResult(null);
    try {
      const { data } = await API.get(`/certificates/${manualId.trim()}`);
      setResult({ certificate: data.certificate, result: 'lookup' });
      toast.success('Certificate found');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Certificate not found');
    } finally { setLoading(false); }
  };

  const downloadReport = async () => {
    if (!result) return;
    try {
      const blob = new Blob([JSON.stringify(result, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `verification_report_${Date.now()}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success('Report downloaded');
    } catch { toast.error('Download failed'); }
  };

  const reset = () => { setFile(null); setPreview(null); setResult(null); setManualId(''); };

  const resultColor = result?.result === 'authentic' ? 'var(--green)' : result?.result === 'forged' ? 'var(--red)' : 'var(--amber)';
  const resultBg = result?.result === 'authentic' ? 'var(--green-dim)' : result?.result === 'forged' ? 'var(--red-dim)' : 'var(--amber-dim)';

  return (
    <div>
      <PageHeader
        title="Verify Certificate"
        subtitle="Upload a document or enter a certificate ID to check authenticity"
      />

      <div className={styles.grid}>
        {/* Left: Upload / Input */}
        <div className={styles.left}>
          {/* Tabs */}
          <div className={styles.tabs}>
            <button className={`${styles.tab} ${tab === 'upload' ? styles.activeTab : ''}`} onClick={() => setTab('upload')}>Upload Document</button>
            <button className={`${styles.tab} ${tab === 'manual' ? styles.activeTab : ''}`} onClick={() => setTab('manual')}>Manual ID Lookup</button>
          </div>

          {tab === 'upload' ? (
            <Card style={{ padding: 0, overflow: 'hidden' }}>
              {/* Dropzone */}
              <div
                {...getRootProps()}
                className={`${styles.dropzone} ${isDragActive ? styles.dropzoneActive : ''} ${file ? styles.dropzoneHasFile : ''}`}
              >
                <input {...getInputProps()} />
                {file ? (
                  <div className={styles.fileSelected}>
                    {preview ? (
                      <img src={preview} alt="Preview" className={styles.imgPreview} />
                    ) : (
                      <div className={styles.pdfIcon}>
                        <span>PDF</span>
                      </div>
                    )}
                    <div className={styles.fileInfo}>
                      <span className={styles.fileName}>{file.name}</span>
                      <span className={styles.fileSize}>{(file.size / 1024).toFixed(1)} KB</span>
                    </div>
                    <button className={styles.removeBtn} onClick={(e) => { e.stopPropagation(); reset(); }}>✕</button>
                  </div>
                ) : (
                  <div className={styles.dropPrompt}>
                    <div className={styles.dropIcon}>{isDragActive ? '⬇' : '◎'}</div>
                    <div className={styles.dropTitle}>{isDragActive ? 'Drop it here' : 'Drag & Drop Certificate'}</div>
                    <div className={styles.dropSub}>PDF, JPEG, or PNG — max 10MB</div>
                    <div className={styles.dropBrowse}>or click to browse files</div>
                  </div>
                )}
              </div>

              <div style={{ padding: '16px 20px', borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}>
                <Btn
                  onClick={handleUploadVerify}
                  loading={loading}
                  disabled={!file || loading}
                  style={{ flex: 1, justifyContent: 'center' }}
                  icon="◎"
                >
                  {loading ? 'Analyzing…' : 'Verify Certificate'}
                </Btn>
                {file && <Btn variant="ghost" onClick={reset} disabled={loading}>Clear</Btn>}
              </div>
            </Card>
          ) : (
            <Card>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ padding: '14px 16px', background: 'var(--navy-3)', borderRadius: 8, fontSize: 13, color: 'var(--text-2)', borderLeft: '3px solid var(--accent)' }}>
                  Enter the certificate's unique ID number to look it up directly in the institutional database.
                </div>
                <FormGroup label="Certificate Number / ID">
                  <input
                    type="text"
                    value={manualId}
                    onChange={e => setManualId(e.target.value)}
                    placeholder="e.g. CERT-2024-001234"
                    onKeyDown={e => e.key === 'Enter' && handleManualVerify()}
                  />
                </FormGroup>
                <Btn onClick={handleManualVerify} loading={loading} disabled={!manualId.trim() || loading} icon="⌕" style={{ justifyContent: 'center' }}>
                  {loading ? 'Looking up…' : 'Look Up Certificate'}
                </Btn>
              </div>
            </Card>
          )}

          {/* Info Panel */}
          <Card style={{ marginTop: 16 }}>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 14, marginBottom: 14, color: 'var(--text-2)' }}>What We Check</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[
                { icon: '◎', label: 'OCR Text Extraction', desc: 'Name, roll number, marks, certificate ID' },
                { icon: '⬡', label: 'Tamper Detection', desc: 'Pixel analysis for photo/grade alterations' },
                { icon: '▣', label: 'Seal & Signature', desc: 'Validates institutional seal and signatures' },
                { icon: '◫', label: 'Database Match', desc: 'Cross-references institutional records' },
                { icon: '⊞', label: 'Format Integrity', desc: 'Checks document structure and metadata' },
              ].map(item => (
                <div key={item.label} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                  <span style={{ color: 'var(--accent)', fontSize: 16, marginTop: 1, flexShrink: 0 }}>{item.icon}</span>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{item.label}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{item.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </div>

        {/* Right: Results */}
        <div className={styles.right}>
          {loading ? (
            <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 380, gap: 20 }}>
              <Spinner size={44} />
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 17, marginBottom: 6 }}>Analyzing Certificate</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)' }}>Running OCR, tamper detection, and database match…</div>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6, width: '100%', maxWidth: 300 }}>
                {['Extracting text via OCR…', 'Checking institutional database…', 'Running anomaly detection…'].map((s, i) => (
                  <div key={s} style={{ fontSize: 12, color: 'var(--text-3)', display: 'flex', alignItems: 'center', gap: 8 }}>
                    <Spinner size={10} />
                    {s}
                  </div>
                ))}
              </div>
            </Card>
          ) : result ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              {/* Verdict Banner */}
              <div style={{ background: resultBg, border: `1px solid ${resultColor}44`, borderRadius: 'var(--radius)', padding: '20px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
                <div style={{ fontSize: 40, lineHeight: 1 }}>
                  {result.result === 'authentic' ? '✓' : result.result === 'forged' ? '✗' : '⚠'}
                </div>
                <div>
                  <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 800, color: resultColor, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                    {result.result || 'Unknown'}
                  </div>
                  <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 4 }}>
                    {result.result === 'authentic' ? 'Certificate is genuine and verified against institutional records.' :
                      result.result === 'forged' ? 'This certificate appears to be fraudulent. Do not accept.' :
                        'Certificate has suspicious elements. Manual review recommended.'}
                  </div>
                </div>
              </div>

              {/* Confidence Score */}
              {result.confidenceScore != null && (
                <Card>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 12 }}>Authenticity Confidence</div>
                  <ConfidenceBar score={result.confidenceScore} />
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--text-3)' }}>
                    Based on OCR analysis, database match, and anomaly detection
                  </div>
                </Card>
              )}

              {/* Extracted Data */}
              {result.extractedData && Object.keys(result.extractedData).length > 0 && (
                <Card>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Extracted Certificate Data</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {Object.entries(result.extractedData).map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--navy-3)', borderRadius: 6, fontSize: 13 }}>
                        <span style={{ color: 'var(--text-3)', textTransform: 'capitalize' }}>{k.replace(/([A-Z])/g, ' $1').trim()}</span>
                        <span style={{ color: 'var(--text)', fontWeight: 500, textAlign: 'right', maxWidth: '60%', wordBreak: 'break-word' }}>{String(v) || '—'}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Anomalies */}
              {result.anomalies && result.anomalies.length > 0 && (
                <Card style={{ border: '1px solid rgba(255,79,106,0.3)' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14, color: 'var(--red)' }}>⚠ Anomalies Detected</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {result.anomalies.map((a, i) => (
                      <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, padding: '10px 12px', background: 'var(--red-dim)', borderRadius: 8, fontSize: 13 }}>
                        <span style={{ color: 'var(--red)', fontSize: 16, flexShrink: 0 }}>✗</span>
                        <span style={{ color: 'var(--text-2)' }}>{typeof a === 'string' ? a : a.message || JSON.stringify(a)}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Matched Certificate Info */}
              {result.certificate && (
                <Card>
                  <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 14 }}>Matched Record</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      ['Certificate No.', result.certificate.certificateNumber],
                      ['Student Name', result.certificate.studentName],
                      ['Roll Number', result.certificate.rollNumber],
                      ['Course', result.certificate.courseName],
                      ['Year', result.certificate.yearOfPassing],
                      ['Institution', result.certificate.institutionId?.name],
                    ].filter(([, v]) => v).map(([k, v]) => (
                      <div key={k} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 12px', background: 'var(--navy-3)', borderRadius: 6, fontSize: 13 }}>
                        <span style={{ color: 'var(--text-3)' }}>{k}</span>
                        <span style={{ color: 'var(--text)', fontWeight: 500 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </Card>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                <Btn variant="secondary" icon="⬇" onClick={downloadReport} style={{ flex: 1, justifyContent: 'center' }}>Download Report</Btn>
                <Btn variant="ghost" onClick={reset} style={{ flex: 1, justifyContent: 'center' }}>Verify Another</Btn>
              </div>
            </div>
          ) : (
            <Card style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: 380, textAlign: 'center', gap: 16 }}>
              <div style={{ fontSize: 64, opacity: 0.1 }}>◎</div>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, marginBottom: 8 }}>Awaiting Verification</div>
                <div style={{ fontSize: 14, color: 'var(--text-2)', maxWidth: 280, lineHeight: 1.6 }}>
                  Upload a certificate or enter an ID on the left to begin the verification process.
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', justifyContent: 'center' }}>
                {['PDF', 'JPEG', 'PNG'].map(f => (
                  <span key={f} style={{ padding: '4px 10px', background: 'var(--navy-3)', border: '1px solid var(--border)', borderRadius: 6, fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{f}</span>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}