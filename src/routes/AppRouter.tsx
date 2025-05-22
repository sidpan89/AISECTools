import React from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Header from '../components/Header';
import Footer from '../components/Footer';
import DashboardPage from '../pages/index';
import CredentialsPage from '../pages/credentials';
import ScansPage from '../pages/scans';
import ReportsPage from '../pages/reports';
import SettingsPage from '../pages/settings';
import ScanPoliciesPage from '../pages/ScanPoliciesPage';
import ScheduledScansPage from '../pages/ScheduledScansPage'; // Added import
import LoginPage from '../pages/login';

const AppRouter: React.FC = () => {
  return (
    <Router>
      <Header />
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/credentials" element={<CredentialsPage />} />
        <Route path="/scans" element={<ScansPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/scan-policies" element={<ScanPoliciesPage />} />
        <Route path="/scheduled-scans" element={<ScheduledScansPage />} /> {/* Added route */}
        <Route path="/settings" element={<SettingsPage />} />
        <Route path="/login" element={<LoginPage />} />
      </Routes>
      <Footer />
    </Router>
  );
};

export default AppRouter;
