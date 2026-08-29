import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import toast from 'react-hot-toast';
import { Btn, FormGroup, Spinner } from '../components/UI';
import styles from './AuthPage.module.css';

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  const validate = () => {
    const e = {};
    if (!form.email) e.email = 'Email is required';
    else if (!/\S+@\S+\.\S+/.test(form.email)) e.email = 'Invalid email format';
    if (!form.password) e.password = 'Password is required';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSubmit = async (ev) => {
    ev.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      const user = await login(form.email, form.password);
      toast.success(`Welcome back, ${user.name}!`);
      navigate('/dashboard');
    } catch (err) {
      const msg = err?.response?.data?.message || 'Login failed. Check your credentials.';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const set = (k) => (e) => setForm(f => ({ ...f, [k]: e.target.value }));

  return (
    <div className={styles.page}>
      <div className={styles.bgGrid} aria-hidden />
      <div className={styles.bgOrb} aria-hidden />

      <div className={styles.card}>
        <Link to="/" className={styles.backLink}>← Back to home</Link>

        <div className={styles.header}>
          <div className={styles.logoMark}>CV</div>
          <h1 className={styles.title}>Sign In</h1>
          <p className={styles.subtitle}>Access the CertVerify platform</p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form} noValidate>
          <FormGroup label="Email Address" error={errors.email} required>
            <input
              type="email"
              value={form.email}
              onChange={set('email')}
              placeholder="you@institution.ac.in"
              autoComplete="email"
            />
          </FormGroup>

          <FormGroup label="Password" error={errors.password} required>
            <input
              type="password"
              value={form.password}
              onChange={set('password')}
              placeholder="••••••••"
              autoComplete="current-password"
            />
          </FormGroup>

          <Btn type="submit" loading={loading} disabled={loading} size="lg" style={{ width: '100%', justifyContent: 'center', marginTop: 8 }}>
            {loading ? 'Signing in…' : 'Sign In →'}
          </Btn>
        </form>

        <div className={styles.divider}><span>Demo Credentials</span></div>

        <div className={styles.demoGrid}>
          {[
            { role: 'Admin', email: 'admin@hed.jharkhand.gov.in', pw: 'Admin@123' },
            { role: 'Institution', email: 'registrar@bu.ac.in', pw: 'Inst@123' },
            { role: 'Verifier', email: 'verify@employer.com', pw: 'Ver@123' },
          ].map(d => (
            <button key={d.role} className={styles.demoBtn} onClick={() => {
              setForm({ email: d.email, password: d.pw });
              toast('Credentials filled — click Sign In', { icon: '👆' });
            }}>
              <span className={styles.demoRole}>{d.role}</span>
              <span className={styles.demoEmail}>{d.email}</span>
            </button>
          ))}
        </div>

        <p className={styles.switchLink}>
          Don't have an account? <Link to="/register" className={styles.link}>Create one →</Link>
        </p>
      </div>
    </div>
  );
}