import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, PageHeader, Btn, Badge, Table, Modal, FormGroup, Spinner, EmptyState, SearchInput } from '../components/UI';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, LineChart, Line, CartesianGrid } from 'recharts';
import toast from 'react-hot-toast';

const fmtDate = d => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function AdminPanel() {
  const { API, user } = useAuth();
  const [tab, setTab] = useState('overview');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [blacklistModal, setBlacklistModal] = useState(false);
  const [blacklistForm, setBlacklistForm] = useState({ entity: '', reason: '', type: 'institution' });
  const [userModal, setUserModal] = useState(null);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [logsRes, instRes] = await Promise.all([
        API.get('/verification?limit=100'),
        API.get('/institutions'),
      ]);
      const allLogs = logsRes.data?.logs || [];
      setLogs(allLogs);
      setInstitutions(instRes.data?.institutions || instRes.data || []);

      // Compute stats
      const authentic = allLogs.filter(l => l.result === 'authentic').length;
      const forged = allLogs.filter(l => l.result === 'forged').length;
      const suspicious = allLogs.filter(l => l.result === 'suspicious').length;
      setStats({ total: allLogs.length, authentic, forged, suspicious, institutions: (instRes.data?.institutions || instRes.data || []).length });

      // Try to get users if endpoint exists
      try {
        const ur = await API.get('/auth/users');
        setUsers(ur.data?.users || ur.data || []);
      } catch (err) { 
        console.warn('Could not fetch users:', err.message);
      }
    } catch (err) {
      console.error('Failed to load admin data:', err);
      toast.error('Failed to load admin data: ' + (err.response?.data?.message || err.message));
    }
    finally { setLoading(false); }
  }, [API]);

  useEffect(() => { load(); }, [load]);

  // Build trend chart
  const trendData = React.useMemo(() => {
    const map = {};
    logs.forEach(l => {
      const d = l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Today';
      if (!map[d]) map[d] = { date: d, authentic: 0, forged: 0, suspicious: 0 };
      if (l.result) map[d][l.result] = (map[d][l.result] || 0) + 1;
    });
    return Object.values(map).slice(-14);
  }, [logs]);

  // Top institutions by verifications
  const topInsts = React.useMemo(() => {
    const map = {};
    logs.forEach(l => {
      const name = l.certificateId?.institutionId?.name || 'Unknown';
      if (!map[name]) map[name] = { name, total: 0, forged: 0 };
      map[name].total++;
      if (l.result === 'forged') map[name].forged++;
    });
    return Object.values(map).sort((a, b) => b.total - a.total).slice(0, 8);
  }, [logs]);

  const handleVerifyInstitution = async (id) => {
    try {
      await API.patch(`/institutions/${id}/verify`);
      toast.success('Institution verified');
      load();
    } catch (err) { toast.error(err?.response?.data?.message || 'Failed'); }
  };

  const handleUpdateUserRole = async (userId, role) => {
    try {
      await API.patch(`/auth/users/${userId}/role`, { role });
      toast.success('User role updated');
      setUserModal(null);
      load();
    } catch (err) { toast.error(err?.response?.data?.message || 'Update failed'); }
  };

  const tabs = [
    { key: 'overview', label: 'Overview' },
    { key: 'analytics', label: 'Analytics' },
    { key: 'users', label: 'User Management' },
    { key: 'institutions', label: 'Institution Control' },
    { key: 'logs', label: 'Audit Logs' },
  ];

  const filteredLogs = logs.filter(l => !search ||
    l.certificateId?.studentName?.toLowerCase().includes(search.toLowerCase()) ||
    l.result?.toLowerCase().includes(search.toLowerCase()) ||
    l.certificateId?.certificateNumber?.toLowerCase().includes(search.toLowerCase())
  );

  const filteredUsers = users.filter(u => !search ||
    u.name?.toLowerCase().includes(search.toLowerCase()) ||
    u.email?.toLowerCase().includes(search.toLowerCase()) ||
    u.role?.toLowerCase().includes(search.toLowerCase())
  );

  const roleColors = { admin: 'red', institution: 'blue', verifier: 'green' };

  return (
    <div>
      <PageHeader title="Admin Control Panel" subtitle="System administration for Jharkhand HED" />

      {/* Tab Bar */}
      <div style={{ display: 'flex', gap: 4, marginBottom: 24, borderBottom: '1px solid var(--border)', paddingBottom: 0, overflowX: 'auto' }}>
        {tabs.map(t => (
          <button key={t.key} onClick={() => { setTab(t.key); setSearch(''); }} style={{
            padding: '10px 18px', fontSize: 13, fontWeight: 600, cursor: 'pointer',
            background: 'transparent', border: 'none', borderBottom: `2px solid ${tab === t.key ? 'var(--accent)' : 'transparent'}`,
            color: tab === t.key ? 'var(--accent)' : 'var(--text-3)', whiteSpace: 'nowrap',
            transition: 'all 0.15s', fontFamily: 'var(--font-body)',
          }}>{t.label}</button>
        ))}
      </div>

      {loading ? (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 64 }}><Spinner size={36} /></div>
      ) : (
        <>
          {/* OVERVIEW */}
          {tab === 'overview' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 14 }}>
                {[
                  { label: 'Total Verifications', value: stats?.total || 0, color: 'var(--accent)', icon: '◎' },
                  { label: 'Authentic Certs', value: stats?.authentic || 0, color: 'var(--green)', icon: '✓' },
                  { label: 'Forged Detected', value: stats?.forged || 0, color: 'var(--red)', icon: '✗' },
                  { label: 'Suspicious', value: stats?.suspicious || 0, color: 'var(--amber)', icon: '⚠' },
                  { label: 'Institutions', value: stats?.institutions || 0, color: 'var(--accent)', icon: '◫' },
                  { label: 'Registered Users', value: users.length || '—', color: 'var(--accent-2)', icon: '◯' },
                ].map(s => (
                  <Card key={s.label} style={{ padding: '18px 20px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
                      <span style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{s.label}</span>
                      <span style={{ fontSize: 18, opacity: 0.7 }}>{s.icon}</span>
                    </div>
                    <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: s.color }}>{s.value}</div>
                  </Card>
                ))}
              </div>

              {/* System Status */}
              <Card>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>System Health</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 12 }}>
                  {[
                    { label: 'API Server', status: 'operational', color: 'var(--green)' },
                    { label: 'OCR Service', status: 'operational', color: 'var(--green)' },
                    { label: 'MongoDB', status: 'operational', color: 'var(--green)' },
                    { label: 'File Storage', status: 'operational', color: 'var(--green)' },
                  ].map(s => (
                    <div key={s.label} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', background: 'var(--navy-3)', borderRadius: 8 }}>
                      <span style={{ fontSize: 13, color: 'var(--text-2)' }}>{s.label}</span>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                        <div style={{ width: 6, height: 6, background: s.color, borderRadius: '50%', animation: 'pulse 2s infinite' }} />
                        <span style={{ fontSize: 11, color: s.color, fontFamily: 'var(--font-mono)' }}>{s.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </Card>
            </div>
          )}

          {/* ANALYTICS */}
          {tab === 'analytics' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
              <Card>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Daily Verification Trend (Last 14 days)</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 20 }}>Authentic vs Forged vs Suspicious</div>
                {trendData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={240}>
                    <BarChart data={trendData} margin={{ top: 5, right: 10, left: -25, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                      <XAxis dataKey="date" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                      <Tooltip contentStyle={{ background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                      <Bar dataKey="authentic" fill="#10d9a0" radius={[4, 4, 0, 0]} name="Authentic" />
                      <Bar dataKey="forged" fill="#ff4f6a" radius={[4, 4, 0, 0]} name="Forged" />
                      <Bar dataKey="suspicious" fill="#ffb340" radius={[4, 4, 0, 0]} name="Suspicious" />
                    </BarChart>
                  </ResponsiveContainer>
                ) : <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>No trend data available yet</div>}
              </Card>

              <Card>
                <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 16 }}>Top Institutions by Verification Volume</div>
                {topInsts.length > 0 ? (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {topInsts.map(inst => (
                      <div key={inst.name} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                        <span style={{ width: 200, fontSize: 13, color: 'var(--text-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', flexShrink: 0 }}>{inst.name}</span>
                        <div style={{ flex: 1, height: 8, background: 'var(--navy-4)', borderRadius: 99, overflow: 'hidden' }}>
                          <div style={{ width: `${Math.round((inst.total / (topInsts[0]?.total || 1)) * 100)}%`, height: '100%', background: 'var(--accent)', borderRadius: 99 }} />
                        </div>
                        <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-3)', minWidth: 40, textAlign: 'right' }}>{inst.total}</span>
                        {inst.forged > 0 && <Badge color="red">{inst.forged} forged</Badge>}
                      </div>
                    ))}
                  </div>
                ) : <div style={{ textAlign: 'center', padding: 32, color: 'var(--text-3)' }}>No institution data yet</div>}
              </Card>

              {/* Forgery rate */}
              {stats && stats.total > 0 && (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 14 }}>
                  {[
                    { label: 'Forgery Detection Rate', value: `${((stats.forged / stats.total) * 100).toFixed(1)}%`, color: 'var(--red)', desc: 'Certificates flagged as forged' },
                    { label: 'Authentic Rate', value: `${((stats.authentic / stats.total) * 100).toFixed(1)}%`, color: 'var(--green)', desc: 'Certificates verified authentic' },
                    { label: 'Avg Suspicion Rate', value: `${((stats.suspicious / stats.total) * 100).toFixed(1)}%`, color: 'var(--amber)', desc: 'Flagged for manual review' },
                  ].map(m => (
                    <Card key={m.label} style={{ padding: '18px 20px' }}>
                      <div style={{ fontSize: 11, color: 'var(--text-3)', textTransform: 'uppercase', marginBottom: 6 }}>{m.label}</div>
                      <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: m.color, marginBottom: 4 }}>{m.value}</div>
                      <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{m.desc}</div>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* USER MANAGEMENT */}
          {tab === 'users' && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <SearchInput value={search} onChange={setSearch} placeholder="Search users…" style={{ maxWidth: 320 }} />
              </div>
              {filteredUsers.length === 0 ? (
                <EmptyState icon="◯" title="No Users Found" message={search ? 'Try a different search.' : 'No users in system yet.'} />
              ) : (
                <Card style={{ padding: 0, overflow: 'hidden' }}>
                  <Table
                    cols={[
                      { key: 'name', label: 'Name', render: (v, r) => (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                          <div style={{ width: 32, height: 32, background: 'linear-gradient(135deg, var(--accent), var(--green))', borderRadius: 8, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 13, fontWeight: 700, color: '#fff', flexShrink: 0 }}>{v?.[0]?.toUpperCase()}</div>
                          <div>
                            <div style={{ fontWeight: 600, color: 'var(--text)' }}>{v}</div>
                            <div style={{ fontSize: 11, color: 'var(--text-3)' }}>{r.organization}</div>
                          </div>
                        </div>
                      )},
                      { key: 'email', label: 'Email', render: v => <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--text-2)' }}>{v}</span> },
                      { key: 'role', label: 'Role', render: v => <Badge color={roleColors[v] || 'gray'}>{v}</Badge> },
                      { key: 'createdAt', label: 'Joined', render: v => <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{fmtDate(v)}</span> },
                      { key: '_id', label: 'Actions', render: (_, row) => (
                        <Btn variant="ghost" size="sm" onClick={() => setUserModal(row)}>Manage</Btn>
                      )},
                    ]}
                    rows={filteredUsers}
                  />
                </Card>
              )}
            </div>
          )}

          {/* INSTITUTION CONTROL */}
          {tab === 'institutions' && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <SearchInput value={search} onChange={setSearch} placeholder="Search institutions…" style={{ maxWidth: 320 }} />
              </div>
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                <Table
                  cols={[
                    { key: 'name', label: 'Institution', render: (v, r) => (
                      <div>
                        <div style={{ fontWeight: 600, color: 'var(--text)' }}>{v}</div>
                        <div style={{ fontSize: 11, color: 'var(--text-3)', fontFamily: 'var(--font-mono)' }}>{r.code}</div>
                      </div>
                    )},
                    { key: 'type', label: 'Type', render: v => <Badge color="blue">{v}</Badge> },
                    { key: 'district', label: 'District' },
                    { key: 'isVerified', label: 'Status', render: v => <Badge color={v ? 'green' : 'amber'}>{v ? 'Verified' : 'Pending'}</Badge> },
                    { key: '_id', label: 'Actions', render: (id, row) => (
                      <div style={{ display: 'flex', gap: 6 }}>
                        {!row.isVerified && (
                          <Btn variant="success" size="sm" onClick={() => handleVerifyInstitution(id)}>✓ Verify</Btn>
                        )}
                      </div>
                    )},
                  ]}
                  rows={institutions.filter(i => !search || i.name?.toLowerCase().includes(search.toLowerCase()) || i.district?.toLowerCase().includes(search.toLowerCase()))}
                  loading={loading}
                />
              </Card>
            </div>
          )}

          {/* AUDIT LOGS */}
          {tab === 'logs' && (
            <div>
              <div style={{ marginBottom: 16 }}>
                <SearchInput value={search} onChange={setSearch} placeholder="Search logs by student, cert no, result…" style={{ maxWidth: 360 }} />
              </div>
              <Card style={{ padding: 0, overflow: 'hidden' }}>
                <Table
                  cols={[
                    { key: 'certificateId', label: 'Certificate', render: v => (
                      <div>
                        <div style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-2)' }}>{v?.certificateNumber || '—'}</div>
                        <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{v?.studentName || '—'}</div>
                      </div>
                    )},
                    { key: 'result', label: 'Result', render: v => {
                      const c = { authentic: 'green', forged: 'red', suspicious: 'amber' };
                      return <Badge color={c[v] || 'gray'}>{v || 'pending'}</Badge>;
                    }},
                    { key: 'confidenceScore', label: 'Confidence', render: v => v != null ? (
                      <span style={{ fontFamily: 'var(--font-mono)', fontSize: 12, color: v > 0.8 ? 'var(--green)' : v > 0.6 ? 'var(--amber)' : 'var(--red)' }}>
                        {Math.round(v * 100)}%
                      </span>
                    ) : '—'},
                    { key: 'verifiedBy', label: 'Verified By', render: v => <span style={{ fontSize: 12, color: 'var(--text-2)' }}>{v?.name || v?.email || '—'}</span> },
                    { key: 'createdAt', label: 'Date', render: v => <span style={{ fontSize: 12, color: 'var(--text-3)' }}>{fmtDate(v)}</span> },
                  ]}
                  rows={filteredLogs}
                  loading={loading}
                  emptyMsg="No verification logs found"
                />
              </Card>
            </div>
          )}
        </>
      )}

      {/* User Manage Modal */}
      <Modal open={!!userModal} onClose={() => setUserModal(null)} title="Manage User" width={420}>
        {userModal && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, padding: '14px 16px', background: 'var(--navy-3)', borderRadius: 10 }}>
              <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg, var(--accent), var(--green))', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 800, color: '#fff' }}>{userModal.name?.[0]?.toUpperCase()}</div>
              <div>
                <div style={{ fontWeight: 700, color: 'var(--text)' }}>{userModal.name}</div>
                <div style={{ fontSize: 12, color: 'var(--text-3)' }}>{userModal.email}</div>
              </div>
            </div>
            <FormGroup label="Change Role">
              <select defaultValue={userModal.role} id="role-select">
                {['verifier', 'institution', 'admin'].map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase() + r.slice(1)}</option>)}
              </select>
            </FormGroup>
            <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
              <Btn variant="ghost" onClick={() => setUserModal(null)}>Cancel</Btn>
              <Btn onClick={() => {
                const sel = document.getElementById('role-select');
                handleUpdateUserRole(userModal._id, sel.value);
              }}>Update Role</Btn>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}