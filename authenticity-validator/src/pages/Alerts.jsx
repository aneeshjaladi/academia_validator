import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, PageHeader, Btn, Badge, Table, Modal, Spinner, EmptyState, SearchInput } from '../components/UI';
import toast from 'react-hot-toast';

const SEVERITY_COLORS = { critical: 'red', high: 'red', medium: 'amber', low: 'blue', info: 'gray' };
const STATUS_COLORS = { open: 'red', investigating: 'amber', resolved: 'green', dismissed: 'gray' };

export default function Alerts() {
  const { API } = useAuth();
  const [alerts, setAlerts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selected, setSelected] = useState(null);
  const [updating, setUpdating] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const { data } = await API.get('/admin/alerts');
      setAlerts(data?.alerts || data || []);
    } catch (err) {
      console.error('Alerts error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to load alerts';
      toast.error(msg);
    }
    finally { setLoading(false); }
  }, [API]);

  useEffect(() => { load(); }, [load]);

  const updateStatus = async (id, status) => {
    setUpdating(true);
    try {
      await API.put(`/admin/alerts/${id}/resolve`, { resolution: status });
      toast.success(`Alert marked as ${status}`);
      setSelected(null);
      load();
    } catch (err) { toast.error(err?.response?.data?.message || 'Update failed'); }
    finally { setUpdating(false); }
  };

  const filtered = alerts.filter(a => {
    const matchSearch = !search || a.message?.toLowerCase().includes(search.toLowerCase()) ||
      a.certificateId?.certificateNumber?.toLowerCase().includes(search.toLowerCase()) ||
      a.certificateId?.studentName?.toLowerCase().includes(search.toLowerCase());
    const matchStatus = filterStatus === 'all' || a.status === filterStatus;
    return matchSearch && matchStatus;
  });

  const counts = {
    open: alerts.filter(a => a.status === 'open').length,
    investigating: alerts.filter(a => a.status === 'investigating').length,
    resolved: alerts.filter(a => a.status === 'resolved').length,
    critical: alerts.filter(a => a.severity === 'critical' || a.severity === 'high').length,
  };

  const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const cols = [
    { key: 'severity', label: 'Severity', render: v => <Badge color={SEVERITY_COLORS[v] || 'gray'}>{v || 'info'}</Badge> },
    { key: 'message', label: 'Alert Message', render: (v, r) => (
      <div>
        <div style={{ fontWeight: 600, color: 'var(--text)', fontSize: 13, marginBottom: 3 }}>{v || r.type || 'Unknown alert'}</div>
        <div style={{ fontSize: 11, color: 'var(--text-3)' }}>
          {r.certificateId?.certificateNumber && `Cert: ${r.certificateId.certificateNumber}`}
          {r.certificateId?.studentName && ` · ${r.certificateId.studentName}`}
        </div>
      </div>
    )},
    { key: 'status', label: 'Status', render: v => <Badge color={STATUS_COLORS[v] || 'gray'}>{v || 'open'}</Badge> },
    { key: 'createdAt', label: 'Triggered', render: v => <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{fmtDate(v)}</span> },
    { key: '_id', label: 'Actions', render: (_, row) => (
      <Btn variant="ghost" size="sm" onClick={() => setSelected(row)}>View →</Btn>
    )},
  ];

  return (
    <div>
      <PageHeader
        title="Security Alerts"
        subtitle="Monitor and manage forged certificate detections"
      />

      {/* Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(170px, 1fr))', gap: 12, marginBottom: 24 }}>
        {[
          { label: 'Open Alerts', value: counts.open, color: 'var(--red)' },
          { label: 'Investigating', value: counts.investigating, color: 'var(--amber)' },
          { label: 'Resolved', value: counts.resolved, color: 'var(--green)' },
          { label: 'Critical/High', value: counts.critical, color: 'var(--red)' },
        ].map(s => (
          <Card key={s.label} style={{ padding: '16px 20px', borderColor: s.color === 'var(--red)' && s.value > 0 ? 'rgba(255,79,106,0.3)' : undefined }}>
            <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: s.color }}>{s.value}</div>
          </Card>
        ))}
      </div>

      <Card style={{ padding: 0, overflow: 'hidden' }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)', display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center' }}>
          <SearchInput value={search} onChange={setSearch} placeholder="Search alerts…" style={{ flex: '1 1 200px', maxWidth: 300 }} />
          <div style={{ display: 'flex', gap: 6 }}>
            {['all', 'open', 'investigating', 'resolved', 'dismissed'].map(s => (
              <button key={s} onClick={() => setFilterStatus(s)} style={{
                padding: '6px 12px', borderRadius: 6, fontSize: 12, fontWeight: 600, cursor: 'pointer',
                background: filterStatus === s ? 'var(--accent-glow)' : 'var(--navy-3)',
                color: filterStatus === s ? 'var(--accent)' : 'var(--text-3)',
                border: filterStatus === s ? '1px solid rgba(79,124,255,0.3)' : '1px solid var(--border)',
                transition: 'all 0.15s',
                textTransform: 'capitalize',
              }}>{s}</button>
            ))}
          </div>
        </div>

        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 48 }}><Spinner /></div>
        ) : filtered.length === 0 ? (
          <EmptyState icon="⚠" title="No Alerts Found" message={filterStatus !== 'all' ? `No ${filterStatus} alerts.` : 'All systems normal. No alerts triggered.'} />
        ) : (
          <Table cols={cols} rows={filtered} />
        )}
      </Card>

      {/* Alert Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title="Alert Details" width={520}>
        {selected && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {/* Severity Banner */}
            <div style={{
              padding: '14px 18px', borderRadius: 10,
              background: selected.severity === 'critical' || selected.severity === 'high' ? 'var(--red-dim)' : selected.severity === 'medium' ? 'var(--amber-dim)' : 'var(--accent-glow)',
              border: `1px solid ${selected.severity === 'critical' || selected.severity === 'high' ? 'rgba(255,79,106,0.3)' : selected.severity === 'medium' ? 'rgba(255,179,64,0.3)' : 'rgba(79,124,255,0.3)'}`,
              display: 'flex', alignItems: 'center', gap: 12,
            }}>
              <span style={{ fontSize: 28 }}>{selected.severity === 'critical' ? '🚨' : selected.severity === 'high' ? '⛔' : '⚠'}</span>
              <div>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, textTransform: 'uppercase', letterSpacing: '0.04em' }}>{selected.severity || 'info'} severity</div>
                <div style={{ fontSize: 13, color: 'var(--text-2)', marginTop: 2 }}>{selected.message || selected.type}</div>
              </div>
            </div>

            {/* Details */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {[
                ['Status', <Badge color={STATUS_COLORS[selected.status] || 'gray'}>{selected.status}</Badge>],
                ['Type', selected.type || '—'],
                ['Certificate No.', selected.certificateId?.certificateNumber || '—'],
                ['Student', selected.certificateId?.studentName || '—'],
                ['Triggered', fmtDate ? new Date(selected.createdAt).toLocaleString('en-IN') : '—'],
              ].map(([k, v]) => (
                <div key={k} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 12px', background: 'var(--navy-3)', borderRadius: 6, fontSize: 13 }}>
                  <span style={{ color: 'var(--text-3)' }}>{k}</span>
                  <span style={{ color: 'var(--text)', fontWeight: 500 }}>{v}</span>
                </div>
              ))}
            </div>

            {selected.details && (
              <div style={{ padding: '12px 14px', background: 'var(--navy-3)', borderRadius: 8, fontSize: 12, color: 'var(--text-2)', fontFamily: 'var(--font-mono)', lineHeight: 1.6, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                {typeof selected.details === 'string' ? selected.details : JSON.stringify(selected.details, null, 2)}
              </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', paddingTop: 4 }}>
              {selected.status !== 'investigating' && (
                <Btn variant="secondary" loading={updating} onClick={() => updateStatus(selected._id, 'investigating')} style={{ flex: 1, justifyContent: 'center' }}>
                  Mark Investigating
                </Btn>
              )}
              {selected.status !== 'resolved' && (
                <Btn variant="success" loading={updating} onClick={() => updateStatus(selected._id, 'resolved')} style={{ flex: 1, justifyContent: 'center' }}>
                  ✓ Resolve
                </Btn>
              )}
              {selected.status !== 'dismissed' && (
                <Btn variant="ghost" loading={updating} onClick={() => updateStatus(selected._id, 'dismissed')} style={{ flex: 1, justifyContent: 'center' }}>
                  Dismiss
                </Btn>
              )}
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}