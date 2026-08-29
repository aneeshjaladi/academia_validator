import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { Card, PageHeader, Btn, FormGroup, Spinner } from '../components/UI';

export default function Profile() {
  const { user, logout, API } = useAuth();
  const [loading, setLoading] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    organization: user?.organization || ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleUpdate = async () => {
    setLoading(true);
    try {
      await API.patch('/auth/profile', formData);
      setIsEditing(false);
      window.location.href = '/profile';
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    window.location.href = '/';
  };

  return (
    <div>
      <PageHeader title="My Profile" subtitle="Manage your account settings" />

      <div style={{ maxWidth: 600, margin: '0 auto' }}>
        <Card style={{ padding: 32 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20, marginBottom: 32 }}>
            <div style={{
              width: 80, height: 80,
              background: 'linear-gradient(135deg, var(--accent), var(--green))',
              borderRadius: 12,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: '#fff'
            }}>
              {user?.name?.[0]?.toUpperCase()}
            </div>
            <div>
              <div style={{ fontWeight: 700, fontSize: 18, color: 'var(--text)' }}>{user?.name}</div>
              <div style={{ fontSize: 13, color: 'var(--text-3)', marginTop: 4 }}>
                <span style={{ background: 'var(--navy-3)', padding: '4px 8px', borderRadius: 4 }}>
                  {user?.role}
                </span>
              </div>
            </div>
          </div>

          {isEditing ? (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
              <FormGroup label="Full Name">
                <input name="name" value={formData.name} onChange={handleChange} />
              </FormGroup>
              <FormGroup label="Email">
                <input name="email" value={formData.email} onChange={handleChange} disabled />
              </FormGroup>
              <FormGroup label="Phone">
                <input name="phone" value={formData.phone} onChange={handleChange} />
              </FormGroup>
              <FormGroup label="Organization">
                <input name="organization" value={formData.organization} onChange={handleChange} />
              </FormGroup>
              <div style={{ display: 'flex', gap: 10 }}>
                <Btn onClick={() => setIsEditing(false)} variant="ghost">Cancel</Btn>
                <Btn onClick={handleUpdate} loading={loading}>Save Changes</Btn>
              </div>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 20 }}>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Email</div>
                <div style={{ color: 'var(--text)' }}>{user?.email}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Phone</div>
                <div style={{ color: 'var(--text)' }}>{user?.phone || '—'}</div>
              </div>
              <div>
                <div style={{ fontSize: 12, color: 'var(--text-3)', marginBottom: 4 }}>Organization</div>
                <div style={{ color: 'var(--text)' }}>{user?.organization || '—'}</div>
              </div>
              <Btn onClick={() => setIsEditing(true)} variant="outline">Edit Profile</Btn>
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--border)', paddingTop: 16, marginTop: 16 }}>
            <Btn onClick={handleLogout} variant="danger" style={{ width: '100%' }}>Logout</Btn>
          </div>
        </Card>
      </div>
    </div>
  );
}
