import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, PageHeader, Btn, Badge, Modal, FormGroup, SearchInput, EmptyState, Spinner, Table } from '../components/UI';
import toast from 'react-hot-toast';

const emptyCert = () => ({
  certificateNumber: '', studentName: '', rollNumber: '',
  courseName: '', yearOfPassing: '', cgpa: '', division: '', institutionId: '',
});

const divColors = { 'First Class': 'green', 'Second Class': 'blue', 'Third Class': 'amber', 'Distinction': 'green', 'Pass': 'gray' };

export default function Certificates() {
  const { API, user } = useAuth();
  const [certs, setCerts] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(emptyCert());
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);
  const [bulkModal, setBulkModal] = useState(false);
  const [bulkFile, setBulkFile] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const fileRef = useRef();
  const PER_PAGE = 20;

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [certRes, instRes] = await Promise.all([
        API.get(`/certificates?page=${page}&limit=${PER_PAGE}`),
        API.get('/institutions'),
      ]);
      setCerts(certRes.data?.certificates || certRes.data || []);
      setTotal(certRes.data?.total || 0);
      setInstitutions(instRes.data?.institutions || instRes.data || []);
    } catch { toast.error('Failed to load certificates'); }
    finally { setLoading(false); }
  }, [API, page]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditItem(null); setForm(emptyCert()); setModal(true); };
  const openEdit = (c) => { setEditItem(c); setForm({ ...emptyCert(), ...c, institutionId: c.institutionId?._id || c.institutionId || '' }); setModal(true); };
  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.certificateNumber || !form.studentName) { toast.error('Certificate number and student name required'); return; }
    setSaving(true);
    try {
      if (editItem) {
        await API.put(`/certificates/${editItem._id}`, form);
        toast.success('Certificate updated');
      } else {
        await API.post('/certificates', form);
        toast.success('Certificate added');
      }
      setModal(false);
      load();
    } catch (err) { toast.error(err?.response?.data?.message || 'Save failed'); }
    finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await API.delete(`/certificates/${id}`);
      toast.success('Certificate deleted');
      setDeleteId(null);
      load();
    } catch (err) { toast.error(err?.response?.data?.message || 'Delete failed'); }
  };

  const handleBulkUpload = async () => {
    if (!bulkFile) { toast.error('Select a CSV file'); return; }
    setBulkLoading(true);
    try {
      const fd = new FormData();
      fd.append('file', bulkFile);
      const { data } = await API.post('/certificates/bulk', fd, { headers: { 'Content-Type': 'multipart/form-data' } });
      toast.success(`Bulk import: ${data.imported || data.count || 0} records added`);
      setBulkModal(false); setBulkFile(null);
      load();
    } catch (err) { toast.error(err?.response?.data?.message || 'Bulk upload failed'); }
    finally { setBulkLoading(false); }
  };

  const filtered = certs.filter(c =>
    !search ||
    c.studentName?.toLowerCase().includes(search.toLowerCase()) ||
    c.certificateNumber?.toLowerCase().includes(search.toLowerCase()) ||
    c.rollNumber?.toLowerCase().includes(search.toLowerCase()) ||
    c.courseName?.toLowerCase().includes(search.toLowerCase())
  );

  const cols = [
    { key: 'certificateNumber', label: 'Cert. No.', render: v => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-2)' }}>{v || '—'}</span> },
    { key: 'studentName', label: 'Student', render: (v, r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{v}</div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{r.rollNumber}</div>
      </div>
    )},
    { key: 'courseName', label: 'Course', render: v => <span style={{ color: 'var(--text-2)', fontSize: 13 }}>{v || '—'}</span> },
    { key: 'yearOfPassing', label: 'Year' },
    { key: 'cgpa', label: 'CGPA/Grade', render: (v, r) => (
      <div style={{ fontSize: 13 }}>
        <div style={{ color: 'var(--text)' }}>{v || '—'}</div>
        {r.division && <Badge color={divColors[r.division] || 'blue'}>{r.division}</Badge>}
      </div>
    )},
    { key: 'institutionId', label: 'Institution', render: v => <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{v?.name || '—'}</span> },
    { key: 'isVerified', label: 'Status', render: v => <Badge color={v ? 'green' : 'gray'}>{v ? 'Verified' : 'Unverified'}</Badge> },
    { key: '_id', label: '', render: (_, row) => (
      <div style={{ display: 'flex', gap: 6 }}>
        <Btn variant="ghost" size="sm" onClick={() => openEdit(row)}>Edit</Btn>
        <Btn variant="danger" size="sm" onClick={() => setDeleteId(row._id)}>×</Btn>
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader
        title="Certificate Records"
        subtitle="Manage institutional certificate database"
        actions={
          <div style={{ display: 'flex', gap: 10 }}>
            <Btn variant="secondary" icon="⬆" onClick={() => setBulkModal(true)}>Bulk Import</Btn>
            <Btn icon="+" onClick={openAdd}>Add Certificate</Btn>
          </div>
        }
      />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Records', value: total || certs.length, color: 'var(--accent)' },
          { label: 'Verified', value: certs.filter(c => c.isVerified).length, color: 'var(--green)' },
          { label: 'Unverified', value: certs.filter(c => !c.isVerified).length, color: 'var(--text-3)' },
        ].map(s => (
          <Card key={s.label} style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
          </Card>
        ))}
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name, cert no, roll no, course…" style={{ flex: '1 1 260px', maxWidth: 360 }} />
          <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 'auto' }}>{filtered.length} record{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="▣" title="No Certificates Found" message={search ? 'Try a different search.' : 'No certificates in database. Add manually or use bulk import.'}
            action={<Btn icon="+" onClick={openAdd}>Add First Certificate</Btn>} />
        ) : (
          <>
            <Table cols={cols} rows={filtered} />
            {total > PER_PAGE && (
              <div style={{ padding: '14px 20px', borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end' }}>
                <Btn variant="ghost" size="sm" disabled={page === 1} onClick={() => setPage(p => p - 1)}>← Prev</Btn>
                <span style={{ fontSize: 13, color: 'var(--text-2)' }}>Page {page} of {Math.ceil(total / PER_PAGE)}</span>
                <Btn variant="ghost" size="sm" disabled={page >= Math.ceil(total / PER_PAGE)} onClick={() => setPage(p => p + 1)}>Next →</Btn>
              </div>
            )}
          </>
        )}
      </Card>

      {/* Add/Edit Modal */}
      <Modal open={modal} onClose={() => setModal(false)} title={editItem ? 'Edit Certificate' : 'Add Certificate Record'} width={600}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FormGroup label="Certificate Number" required>
              <input value={form.certificateNumber} onChange={set('certificateNumber')} placeholder="CERT-2024-001" />
            </FormGroup>
            <FormGroup label="Roll Number">
              <input value={form.rollNumber} onChange={set('rollNumber')} placeholder="20CS001" />
            </FormGroup>
          </div>
          <FormGroup label="Student Full Name" required>
            <input value={form.studentName} onChange={set('studentName')} placeholder="Ramesh Kumar Sharma" />
          </FormGroup>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FormGroup label="Course Name">
              <input value={form.courseName} onChange={set('courseName')} placeholder="B.Tech Computer Science" />
            </FormGroup>
            <FormGroup label="Year of Passing">
              <input type="number" value={form.yearOfPassing} onChange={set('yearOfPassing')} placeholder="2024" min="1950" max="2030" />
            </FormGroup>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 14 }}>
            <FormGroup label="CGPA / Percentage">
              <input value={form.cgpa} onChange={set('cgpa')} placeholder="8.5 or 78%" />
            </FormGroup>
            <FormGroup label="Division">
              <select value={form.division} onChange={set('division')}>
                <option value="">Select</option>
                {['Distinction','First Class','Second Class','Third Class','Pass'].map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="Institution">
              <select value={form.institutionId} onChange={set('institutionId')}>
                <option value="">Select Institution</option>
                {institutions.map(i => <option key={i._id} value={i._id}>{i.name}</option>)}
              </select>
            </FormGroup>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => setModal(false)}>Cancel</Btn>
            <Btn loading={saving} onClick={handleSave}>{editItem ? 'Update' : 'Add Certificate'}</Btn>
          </div>
        </div>
      </Modal>

      {/* Bulk Import Modal */}
      <Modal open={bulkModal} onClose={() => { setBulkModal(false); setBulkFile(null); }} title="Bulk Import Certificates" width={480}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ padding: '14px 16px', background: 'var(--navy-3)', borderRadius: 8, fontSize: 13, color: 'var(--text-2)', lineHeight: 1.6 }}>
            Upload a CSV file with columns: <code style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent)', fontSize: 12 }}>certificateNumber, studentName, rollNumber, courseName, yearOfPassing, cgpa, division</code>
          </div>
          <div
            style={{ border: '2px dashed var(--border)', borderRadius: 10, padding: 28, textAlign: 'center', cursor: 'pointer', transition: 'all 0.2s' }}
            onClick={() => fileRef.current?.click()}
            onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--accent)'}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border)'}
          >
            <input ref={fileRef} type="file" accept=".csv" style={{ display: 'none' }} onChange={e => setBulkFile(e.target.files[0])} />
            {bulkFile ? (
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>{bulkFile.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{(bulkFile.size / 1024).toFixed(1)} KB</div>
              </div>
            ) : (
              <>
                <div style={{ fontSize: 28, color: 'var(--accent)', opacity: 0.5, marginBottom: 8 }}>⬆</div>
                <div style={{ fontWeight: 600, color: 'var(--text)', marginBottom: 4 }}>Click to select CSV file</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>Only .csv format supported</div>
              </>
            )}
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
            <Btn variant="ghost" onClick={() => { setBulkModal(false); setBulkFile(null); }}>Cancel</Btn>
            <Btn loading={bulkLoading} disabled={!bulkFile} onClick={handleBulkUpload} icon="⬆">Import</Btn>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Delete Certificate" width={400}>
        <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
          <div style={{ fontSize: 36, marginBottom: 12 }}>⚠</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, marginBottom: 8 }}>Delete this record?</div>
          <div style={{ fontSize: 13, color: 'var(--text-2)', marginBottom: 24 }}>This action cannot be undone.</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Btn variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Btn>
            <Btn variant="danger" onClick={() => handleDelete(deleteId)}>Delete</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}