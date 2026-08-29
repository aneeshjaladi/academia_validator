import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, PageHeader, Btn, Badge, Table, Modal, FormGroup, SearchInput, EmptyState, Spinner } from '../components/UI';
import toast from 'react-hot-toast';

const TYPES = ['university', 'college', 'polytechnic', 'deemed', 'other'];
const DISTRICTS = ['Ranchi','Dhanbad','Jamshedpur','Bokaro','Hazaribagh','Giridih','Deoghar','Dumka','Palamu','Gumla','Lohardaga','Simdega','Chatra','Koderma','Ramgarh','Khunti','West Singhbhum','East Singhbhum','Saraikela','Godda','Sahebganj','Pakur','Jamtara','Latehar'];

const empty = () => ({ name: '', code: '', type: 'college', district: 'Ranchi', address: '', email: '', phone: '', affiliatedTo: '', establishedYear: '' });

export default function Institutions() {
  const { API, user } = useAuth();
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [modal, setModal] = useState(false);
  const [editItem, setEditItem] = useState(null);
  const [form, setForm] = useState(empty());
  const [saving, setSaving] = useState(false);
  const [deleteId, setDeleteId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/institutions');
      setInstitutions(data?.institutions || data || []);
    } catch { toast.error('Failed to load institutions'); }
    finally { setLoading(false); }
  }, [API]);

  useEffect(() => { load(); }, [load]);

  const openAdd = () => { setEditItem(null); setForm(empty()); setModal(true); };
  const openEdit = (inst) => { setEditItem(inst); setForm({ ...empty(), ...inst }); setModal(true); };
  const closeModal = () => { setModal(false); setEditItem(null); };

  const set = k => e => setForm(f => ({ ...f, [k]: e.target.value }));

  const handleSave = async () => {
    if (!form.name || !form.code) { toast.error('Name and Code are required'); return; }
    setSaving(true);
    try {
      if (editItem) {
        await API.put(`/institutions/${editItem._id}`, form);
        toast.success('Institution updated');
      } else {
        await API.post('/institutions', form);
        toast.success('Institution added');
      }
      closeModal();
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Save failed');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id) => {
    try {
      await API.delete(`/institutions/${id}`);
      toast.success('Institution removed');
      setDeleteId(null);
      load();
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Delete failed');
    }
  };

  const filtered = institutions.filter(i =>
    !search || i.name?.toLowerCase().includes(search.toLowerCase()) ||
    i.code?.toLowerCase().includes(search.toLowerCase()) ||
    i.district?.toLowerCase().includes(search.toLowerCase())
  );

  const cols = [
    { key: 'name', label: 'Institution', render: (v, row) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{v}</div>
        <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>{row.code}</div>
      </div>
    )},
    { key: 'type', label: 'Type', render: v => <Badge color="blue">{v || '—'}</Badge> },
    { key: 'district', label: 'District', render: v => <span style={{ color: 'var(--text-2)', fontSize: 13 }}>{v || '—'}</span> },
    { key: 'email', label: 'Contact', render: (v, row) => (
      <div style={{ fontSize: 12 }}>
        <div style={{ color: 'var(--text-2)' }}>{v || '—'}</div>
        {row.phone && <div style={{ color: 'var(--text-3)' }}>{row.phone}</div>}
      </div>
    )},
    { key: 'isVerified', label: 'Status', render: v => <Badge color={v ? 'green' : 'amber'}>{v ? 'Verified' : 'Pending'}</Badge> },
    { key: '_id', label: 'Actions', render: (_, row) => (
      <div style={{ display: 'flex', gap: 6 }}>
        <Btn variant="ghost" size="sm" onClick={() => openEdit(row)}>Edit</Btn>
        {user?.role === 'admin' && (
          <Btn variant="danger" size="sm" onClick={() => setDeleteId(row._id)}>Remove</Btn>
        )}
      </div>
    )},
  ];

  return (
    <div>
      <PageHeader
        title="Institutions"
        subtitle="Manage registered universities and colleges"
        actions={
          user?.role === 'admin' && <Btn icon="+" onClick={openAdd}>Add Institution</Btn>
        }
      />

      {/* Stats Row */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Total Registered', value: institutions.length, color: 'var(--accent)' },
          { label: 'Verified', value: institutions.filter(i => i.isVerified).length, color: 'var(--green)' },
          { label: 'Pending Review', value: institutions.filter(i => !i.isVerified).length, color: 'var(--amber)' },
        ].map(s => (
          <Card key={s.label} style={{ padding: '16px 20px' }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
          </Card>
        ))}
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search by name, code, district…" style={{ flex: '1 1 260px', maxWidth: 340 }} />
          <span style={{ fontSize: 12, color: 'var(--text-3)', marginLeft: 'auto' }}>{filtered.length} institution{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="◫" title="No Institutions Found" message={search ? 'Try adjusting your search.' : 'No institutions registered yet.'} action={user?.role === 'admin' && <Btn icon="+" onClick={openAdd}>Add First Institution</Btn>} />
        ) : (
          <Table cols={cols} rows={filtered} />
        )}
      </Card>

      {/* Add / Edit Modal */}
      <Modal open={modal} onClose={closeModal} title={editItem ? 'Edit Institution' : 'Add Institution'} width={580}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FormGroup label="Institution Name" required>
              <input value={form.name} onChange={set('name')} placeholder="Jharkhand University" />
            </FormGroup>
            <FormGroup label="Institution Code" required>
              <input value={form.code} onChange={set('code')} placeholder="JU001" />
            </FormGroup>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FormGroup label="Type">
              <select value={form.type} onChange={set('type')}>
                {TYPES.map(t => <option key={t} value={t}>{t.charAt(0).toUpperCase() + t.slice(1)}</option>)}
              </select>
            </FormGroup>
            <FormGroup label="District">
              <select value={form.district} onChange={set('district')}>
                {DISTRICTS.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </FormGroup>
          </div>
          <FormGroup label="Address">
            <input value={form.address} onChange={set('address')} placeholder="Full address" />
          </FormGroup>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FormGroup label="Email">
              <input type="email" value={form.email} onChange={set('email')} placeholder="registrar@institution.ac.in" />
            </FormGroup>
            <FormGroup label="Phone">
              <input value={form.phone} onChange={set('phone')} placeholder="+91 XXXXX XXXXX" />
            </FormGroup>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
            <FormGroup label="Affiliated To">
              <input value={form.affiliatedTo} onChange={set('affiliatedTo')} placeholder="Vinoba Bhave University" />
            </FormGroup>
            <FormGroup label="Established Year">
              <input type="number" value={form.establishedYear} onChange={set('establishedYear')} placeholder="1980" min="1800" max="2025" />
            </FormGroup>
          </div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end', paddingTop: 4 }}>
            <Btn variant="ghost" onClick={closeModal}>Cancel</Btn>
            <Btn loading={saving} onClick={handleSave}>{editItem ? 'Save Changes' : 'Add Institution'}</Btn>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      <Modal open={!!deleteId} onClose={() => setDeleteId(null)} title="Remove Institution" width={420}>
        <div style={{ textAlign: 'center', padding: '8px 0 16px' }}>
          <div style={{ fontSize: 40, marginBottom: 14 }}>⚠</div>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 17, fontWeight: 700, marginBottom: 8 }}>Are you sure?</div>
          <div style={{ fontSize: 14, color: 'var(--text-2)', marginBottom: 24 }}>This will permanently remove the institution and all its associated records.</div>
          <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
            <Btn variant="ghost" onClick={() => setDeleteId(null)}>Cancel</Btn>
            <Btn variant="danger" onClick={() => handleDelete(deleteId)}>Yes, Remove</Btn>
          </div>
        </div>
      </Modal>
    </div>
  );
}