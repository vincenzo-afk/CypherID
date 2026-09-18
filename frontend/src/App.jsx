import { BrowserRouter, Route, Routes } from 'react-router-dom';
import AppLayout from './components/AppLayout.jsx';
import CommandCenter from './components/CommandCenter.jsx';
import AuthGuard from './components/AuthGuard.jsx';
import HomePage from './pages/HomePage.jsx';
import LoginPage from './pages/LoginPage.jsx';
import RegisterPage from './pages/RegisterPage.jsx';
import IdentityWalletPage from './pages/IdentityWalletPage.jsx';
import AssetHubPage from './pages/AssetHubPage.jsx';
import AccessRequestsPage from './pages/AccessRequestsPage.jsx';
import AdminPanelPage from './pages/AdminPanelPage.jsx';
import AuditDashboardPage from './pages/AuditDashboardPage.jsx';
import NotificationsPage from './pages/NotificationsPage.jsx';
import ProtectedDocumentViewer from './pages/ProtectedDocumentViewer.jsx';
import ProtectedExamViewer from './pages/ProtectedExamViewer.jsx';
import ProtectedVideoViewer from './pages/ProtectedVideoViewer.jsx';

// Routes per docs/frontend/04_ROUTING.md
export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Vault login + identity genesis register render standalone — full-viewport cinematic layouts, no navbar */}
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/home" element={<CommandCenter><HomePage /></CommandCenter>} />
        <Route path="/wallet" element={<AuthGuard><CommandCenter><IdentityWalletPage /></CommandCenter></AuthGuard>} />
        <Route path="/assets" element={<AuthGuard><AppLayout><AssetHubPage /></AppLayout></AuthGuard>} />
        <Route path="/access-requests" element={<AuthGuard><AppLayout><AccessRequestsPage /></AppLayout></AuthGuard>} />
        <Route path="/admin" element={<AuthGuard roles={['ORG_ADMIN']}><AppLayout><AdminPanelPage /></AppLayout></AuthGuard>} />
        <Route path="/audit" element={<AuthGuard roles={['SYSTEM_AUDITOR', 'ORG_ADMIN']}><AppLayout><AuditDashboardPage /></AppLayout></AuthGuard>} />
        <Route path="/notifications" element={<AuthGuard><AppLayout><NotificationsPage /></AppLayout></AuthGuard>} />
        <Route path="/protected/document/:sessionId" element={<AuthGuard><ProtectedDocumentViewer /></AuthGuard>} />
        <Route path="/protected/exam/:sessionId" element={<AuthGuard><ProtectedExamViewer /></AuthGuard>} />
        <Route path="/protected/video/:sessionId" element={<AuthGuard><ProtectedVideoViewer /></AuthGuard>} />
        <Route path="/" element={<CommandCenter><HomePage /></CommandCenter>} />
        <Route path="*" element={<CommandCenter><HomePage /></CommandCenter>} />
      </Routes>
    </BrowserRouter>
  );
}
