import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { AuthProvider, useAuth } from './context/AuthContext';
import Layout from './components/Layout';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import VerifyCertificate from './pages/VerifyCertificate';
import Institutions from './pages/Institutions';
import Certificates from './pages/Certificates';
import AdminPanel from './pages/AdminPanel';
import Alerts from './pages/Alerts';
import Profile from './pages/Profile';
import './App.css';

const Protected = ({ children, roles }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', color:'var(--text-2)' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return children;
};

const PublicOnly = ({ children }) => {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;
  return children;
};

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/login" element={<PublicOnly><LoginPage /></PublicOnly>} />
      <Route path="/register" element={<PublicOnly><RegisterPage /></PublicOnly>} />
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<Protected><Dashboard /></Protected>} />
        <Route path="/verify" element={<Protected><VerifyCertificate /></Protected>} />
        <Route path="/institutions" element={<Protected roles={['admin','institution']}><Institutions /></Protected>} />
        <Route path="/certificates" element={<Protected roles={['admin','institution']}><Certificates /></Protected>} />
        <Route path="/alerts" element={<Protected roles={['admin']}><Alerts /></Protected>} />
        <Route path="/admin" element={<Protected roles={['admin']}><AdminPanel /></Protected>} />
        <Route path="/profile" element={<Protected><Profile /></Protected>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Toaster
          position="top-right"
          toastOptions={{
            style: {
              background: '#1f2937',
              color: '#f0f4ff',
              border: '1px solid rgba(99,130,255,0.2)',
              borderRadius: '10px',
              fontSize: '14px',
              fontFamily: 'DM Sans, sans-serif',
            },
            success: { iconTheme: { primary: '#10d9a0', secondary: '#1f2937' } },
            error: { iconTheme: { primary: '#ff4f6a', secondary: '#1f2937' } },
          }}
        />
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}