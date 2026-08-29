import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { useAuth } from '../context/AuthContext';
import { StatCard, Card, PageHeader, Badge, Btn, Spinner } from '../components/UI';
import toast from 'react-hot-toast';

const COLORS = ['#10d9a0', '#ff4f6a', '#ffb340', '#4f7cff'];

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—';

export default function Dashboard() {
  const { API, user } = useAuth();
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      const logsRes = await API.get('/verification?limit=8');
      setLogs(logsRes.data?.logs || []);

      // Build stats from logs
      const all = logsRes.data?.logs || [];
      const authentic = all.filter(l => l.result === 'authentic').length;
      const forged = all.filter(l => l.result === 'forged').length;
      const suspicious = all.filter(l => l.result === 'suspicious').length;
      setStats({ total: all.length, authentic, forged, suspicious, pending: 0 });
    } catch (err) {
      console.error('Dashboard error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to load dashboard data';
      toast.error(msg);
      setStats({ total: 0, authentic: 0, forged: 0, suspicious: 0, pending: 0 });
    } finally {
      setLoading(false);
    }
  }, [API]);

  useEffect(() => { load(); }, [load]);

  // Build chart data from logs (last 7 entries grouped by date)
  const chartData = React.useMemo(() => {
    const map = {};
    logs.forEach(l => {
      const d = l.createdAt ? new Date(l.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : 'Today';
      if (!map[d]) map[d] = { date: d, verified: 0, forged: 0 };
      if (l.result === 'authentic') map[d].verified++;
      else if (l.result === 'forged') map[d].forged++;
    });
    return Object.values(map).slice(-7);
  }, [logs]);

  const pieData = stats ? [
    { name: 'Authentic', value: stats.authentic },
    { name: 'Forged', value: stats.forged },
    { name: 'Suspicious', value: stats.suspicious },
  ].filter(d => d.value > 0) : [];

  const resultBadge = (result) => {
    if (!result) return <Badge color="gray">Pending</Badge>;
    const map = { authentic: 'green', forged: 'red', suspicious: 'amber', pending: 'gray' };
    return <Badge color={map[result] || 'blue'}>{result}</Badge>;
  };

  return (
    <div style={{ animation: 'fadeIn 0.4s ease' }}>
      <PageHeader
        title={`Welcome, ${user?.name?.split(' ')[0] || 'User'} 👋`}
        subtitle="Real-time overview of certificate verification activity"
        actions={
          <Btn icon="◎" onClick={() => navigate('/verify')}>Verify Certificate</Btn>
        }
      />

      {/* Stats Grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 16, marginBottom: 28 }}>
        <StatCard label="Total Verified" value={loading ? '—' : stats?.total ?? 0} icon="◎" color="blue" sub="All time verifications" />
        <StatCard label="Authentic" value={loading ? '—' : stats?.authentic ?? 0} icon="✓" color="green" sub="Passed verification" />
        <StatCard label="Forged / Fake" value={loading ? '—' : stats?.forged ?? 0} icon="✗" color="red" sub="Detected fraudulent" />
        <StatCard label="Suspicious" value={loading ? '—' : stats?.suspicious ?? 0} icon="⚠" color="amber" sub="Needs review" />
      </div>

      {/* Charts Row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 20, marginBottom: 28 }}>
        <Card>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
            <div>
              <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Verification Trend</div>
              <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Activity over recent verifications</div>
            </div>
          </div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
          ) : chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -30, bottom: 0 }}>
                <defs>
                  <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10d9a0" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#10d9a0" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="gf" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#ff4f6a" stopOpacity={0.2} />
                    <stop offset="95%" stopColor="#ff4f6a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: 'var(--text-3)', fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip
                  contentStyle={{ background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }}
                  labelStyle={{ color: 'var(--text)' }}
                />
                <Area type="monotone" dataKey="verified" stroke="#10d9a0" fill="url(#gv)" strokeWidth={2} dot={false} name="Authentic" />
                <Area type="monotone" dataKey="forged" stroke="#ff4f6a" fill="url(#gf)" strokeWidth={2} dot={false} name="Forged" />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)', fontSize: 14 }}>No chart data yet. Start verifying certificates.</div>
          )}
        </Card>

        <Card>
          <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15, marginBottom: 4 }}>Result Distribution</div>
          <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 20 }}>By verification outcome</div>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><Spinner /></div>
          ) : pieData.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={160}>
                <PieChart>
                  <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={72} paddingAngle={3} dataKey="value">
                    {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                  </Pie>
                  <Tooltip contentStyle={{ background: 'var(--panel-2)', border: '1px solid var(--border)', borderRadius: 8, fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {pieData.map((d, i) => (
                  <div key={d.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 13 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                      <div style={{ width: 10, height: 10, borderRadius: 2, background: COLORS[i % COLORS.length] }} />
                      <span style={{ color: 'var(--text-2)' }}>{d.name}</span>
                    </div>
                    <span style={{ fontFamily: 'var(--font-mono)', color: 'var(--text)', fontWeight: 600 }}>{d.value}</span>
                  </div>
                ))}
              </div>
            </>
          ) : (
            <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)', fontSize: 13 }}>No data available</div>
          )}
        </Card>
      </div>

      {/* Recent Activity */}
      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 15 }}>Recent Verifications</div>
            <div style={{ fontSize: 12, color: 'var(--text-3)', marginTop: 2 }}>Latest activity across the platform</div>
          </div>
          <Btn variant="ghost" size="sm" onClick={() => navigate('/verify')}>+ New Verification</Btn>
        </div>
        {loading ? (
          <div style={{ display: 'flex', justifyContent: 'center', padding: 32 }}><Spinner /></div>
        ) : logs.length === 0 ? (
          <div style={{ textAlign: 'center', padding: 40, color: 'var(--text-3)' }}>
            <div style={{ fontSize: 36, marginBottom: 12, opacity: 0.3 }}>◎</div>
            <div>No verifications yet. <span style={{ color: 'var(--accent)', cursor: 'pointer' }} onClick={() => navigate('/verify')}>Verify your first certificate →</span></div>
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border)' }}>
                  {['Certificate ID', 'Student Name', 'Institution', 'Result', 'Confidence', 'Date'].map(h => (
                    <th key={h} style={{ padding: '8px 12px', textAlign: 'left', color: 'var(--text-3)', fontWeight: 600, fontSize: 11, textTransform: 'uppercase', letterSpacing: '0.06em', whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.map((log, i) => (
                  <tr key={log._id || i} style={{ borderBottom: '1px solid var(--border)' }}
                    onMouseEnter={e => e.currentTarget.style.background = 'var(--navy-3)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                  >
                    <td style={{ padding: '11px 12px', fontFamily: 'var(--font-mono)', fontSize: 12, color: 'var(--accent-2)' }}>
                      {log.certificateId?.certificateNumber || log.certificateId || '—'}
                    </td>
                    <td style={{ padding: '11px 12px', color: 'var(--text)' }}>{log.certificateId?.studentName || log.studentName || '—'}</td>
                    <td style={{ padding: '11px 12px', color: 'var(--text-2)' }}>{log.certificateId?.institutionId?.name || log.institution || '—'}</td>
                    <td style={{ padding: '11px 12px' }}>{resultBadge(log.result)}</td>
                    <td style={{ padding: '11px 12px' }}>
                      {log.confidenceScore != null ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <div style={{ width: 60, height: 4, background: 'var(--navy-4)', borderRadius: 99, overflow: 'hidden' }}>
                            <div style={{ width: `${Math.round(log.confidenceScore * 100)}%`, height: '100%', background: log.confidenceScore > 0.8 ? 'var(--green)' : log.confidenceScore > 0.6 ? 'var(--amber)' : 'var(--red)', borderRadius: 99 }} />
                          </div>
                          <span style={{ fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-2)' }}>{Math.round(log.confidenceScore * 100)}%</span>
                        </div>
                      ) : '—'}
                    </td>
                    <td style={{ padding: '11px 12px', color: 'var(--text-3)', fontSize: 12 }}>{fmtDate(log.createdAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}