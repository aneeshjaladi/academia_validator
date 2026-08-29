import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Btn, FormGroup } from '../components/UI';
import styles from './AuthPage.module.css';

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '', role: 'verifier', organization: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.name.trim()) e.name = 'Full name is required';
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email';
    if (!form.password || form.password.length < 6) e.password = 'Minimum 6 characters';
    if (form.password !== form.confirmPassword) e.confirmPassword = 'Passwords do not match';
    if (!form.organization.trim()) e.organization = 'Organization name is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const { confirmPassword, ...payload } = form;
      await register(payload);
      toast.success('Account created! Welcome to CertVerify.');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err?.response?.data?.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className={styles.page}>
      <div className={styles.bgGrid} aria-hidden />
      <div className={styles.bgOrb} aria-hidden />

      <div className={styles.card} style={{ maxWidth: 520 }}>
        <Link to="/" className={styles.backLink}>← Back to home</Link>

        <div className={styles.header}>
          <div className={styles.logoMark}>CV</div>
          <h1 className={styles.title}>Create Account</h1>
          <p className={styles.subtitle}>Join the CertVerify verification network</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <div className={styles.twoCol}>
            <FormGroup label="Full Name" error={errors.name} required>
              <input type="text" value={form.name} onChange={set('name')} placeholder="Dr. Ramesh Kumar" />
            </FormGroup>
            <FormGroup label="Role" required>
              <select value={form.role} onChange={set('role')}>
                <option value="verifier">Verifier (Employer/Agency)</option>
                <option value="institution">Institution (University/College)</option>
                <option value="admin">Admin (HED Department)</option>
              </select>
            </FormGroup>
          </div>

          <FormGroup label="Email Address" error={errors.email} required>
            <input type="email" value={form.email} onChange={set('email')} placeholder="you@institution.ac.in" />
          </FormGroup>

          <FormGroup label="Organization / Institution" error={errors.organization} required>
            <input type="text" value={form.organization} onChange={set('organization')} placeholder="Jharkhand University, TCS Ltd., etc." />
          </FormGroup>

          <div className={styles.twoCol}>
            <FormGroup label="Password" error={errors.password} required>
              <input type="password" value={form.password} onChange={set('password')} placeholder="Min. 6 characters" />
            </FormGroup>
            <FormGroup label="Confirm Password" error={errors.confirmPassword} required>
              <input type="password" value={form.confirmPassword} onChange={set('confirmPassword')} placeholder="Repeat password" />
            </FormGroup>
          </div>

          <div style={{ background: 'var(--navy-3)', border: '1px solid var(--border)', borderRadius: 8, padding: '10px 14px', fontSize: 12, color: 'var(--text-2)', lineHeight: 1.6 }}>
            By creating an account you agree to use this platform solely for legitimate certificate verification purposes in compliance with Jharkhand HED guidelines.
          </div>

          <Btn type="submit" loading={loading} disabled={loading} size="lg" style={{ width: '100%', justifyContent: 'center' }}>
            {loading ? 'Creating account…' : 'Create Account →'}
          </Btn>
        </form>

        <p className={styles.switchLink}>
          Already have an account? <Link to="/login" className={styles.link}>Sign in →</Link>
        </p>
      </div>
    </div>
  );
}