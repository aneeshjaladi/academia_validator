import React from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './LandingPage.module.css';

const FEATURES = [
  { icon: '◎', title: 'AI-Powered OCR', desc: 'Extracts text, roll numbers, marks, and certificate IDs from uploaded documents automatically.' },
  { icon: '⬡', title: 'Tamper Detection', desc: 'Machine learning detects altered grades, forged seals, fake signatures, and photo substitutions.' },
  { icon: '▣', title: 'Institutional DB', desc: 'Cross-verifies against verified records from universities and colleges across Jharkhand.' },
  { icon: '◫', title: 'Anomaly Flags', desc: 'Real-time alerts for invalid certificate numbers, cloned documents, and non-existent institutions.' },
  { icon: '⊞', title: 'Admin Dashboard', desc: 'Monitor verification trends, blacklist offenders, and generate official verification reports.' },
  { icon: '⊙', title: 'Secure & Private', desc: 'Role-based access control ensures student data is handled with strict privacy standards.' },
];

const STEPS = [
  { num: '01', title: 'Upload Certificate', desc: 'Drag-drop a PDF, scan, or image of the academic document.' },
  { num: '02', title: 'AI Analysis', desc: 'OCR extracts key fields; AI checks for tampering and formatting anomalies.' },
  { num: '03', title: 'Database Match', desc: 'Cross-referenced against institutional records and verified registries.' },
  { num: '04', title: 'Instant Result', desc: 'Confidence score, anomaly report, and downloadable verification certificate.' },
];

export default function LandingPage() {
  const navigate = useNavigate();
  return (
    <div className={styles.page}>
      {/* Bg grid */}
      <div className={styles.grid} aria-hidden />
      <div className={styles.glowOrb1} aria-hidden />
      <div className={styles.glowOrb2} aria-hidden />

      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.navLogo}>
          <div className={styles.logoMark}>CV</div>
          <span>CertVerify</span>
        </div>
        <div className={styles.navActions}>
          <button className={styles.btnGhost} onClick={() => navigate('/login')}>Sign In</button>
          <button className={styles.btnAccent} onClick={() => navigate('/register')}>Get Started</button>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroPill}>
          <span className={styles.heroPillDot} />
          Jharkhand Higher Education Department
        </div>
        <h1 className={styles.heroTitle}>
          Stop Fake Degrees<br />
          <span className={styles.heroAccent}>Before They Spread</span>
        </h1>
        <p className={styles.heroSub}>
          AI-powered certificate authentication platform for institutions, employers, and government agencies across Jharkhand.
        </p>
        <div className={styles.heroCta}>
          <button className={styles.btnAccentLg} onClick={() => navigate('/register')}>Start Verifying Free →</button>
          <button className={styles.btnGhostLg} onClick={() => navigate('/login')}>Already have access</button>
        </div>
        <div className={styles.heroStats}>
          {[['12K+','Certificates Verified'],['98.4%','Detection Accuracy'],['340+','Institutions'],['< 30s','Avg. Verification']].map(([v,l]) => (
            <div key={l} className={styles.heroStat}>
              <span className={styles.heroStatVal}>{v}</span>
              <span className={styles.heroStatLabel}>{l}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className={styles.section}>
        <div className={styles.sectionLabel}>Platform Capabilities</div>
        <h2 className={styles.sectionTitle}>Built for Modern Verification Challenges</h2>
        <div className={styles.featureGrid}>
          {FEATURES.map(f => (
            <div key={f.title} className={styles.featureCard}>
              <span className={styles.featureIcon}>{f.icon}</span>
              <h3 className={styles.featureTitle}>{f.title}</h3>
              <p className={styles.featureDesc}>{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* How it works */}
      <section className={styles.section}>
        <div className={styles.sectionLabel}>Workflow</div>
        <h2 className={styles.sectionTitle}>How Verification Works</h2>
        <div className={styles.steps}>
          {STEPS.map((s, i) => (
            <div key={s.num} className={styles.step}>
              <div className={styles.stepNum}>{s.num}</div>
              {i < STEPS.length - 1 && <div className={styles.stepLine} />}
              <h3 className={styles.stepTitle}>{s.title}</h3>
              <p className={styles.stepDesc}>{s.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA Banner */}
      <section className={styles.ctaBanner}>
        <div className={styles.ctaContent}>
          <h2 className={styles.ctaTitle}>Ready to Eliminate Fake Certificates?</h2>
          <p className={styles.ctaSub}>Join institutions across Jharkhand using CertVerify for secure, fast, and reliable credential authentication.</p>
          <button className={styles.btnAccentLg} onClick={() => navigate('/register')}>Create Free Account →</button>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerLogo}>
          <div className={styles.logoMark} style={{ width: 30, height: 30, fontSize: 11 }}>CV</div>
          <span>CertVerify</span>
        </div>
        <span style={{ color: 'var(--text-3)', fontSize: 13 }}>© 2025 Jharkhand Higher Education Department. All rights reserved.</span>
      </footer>
    </div>
  );
}