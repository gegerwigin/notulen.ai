import React, { Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { GoogleOAuthProvider } from '@react-oauth/google';
import { AuthProvider } from './contexts/AuthContext';
import PrivateRoute from './components/PrivateRoute';
import AdminRoute from './components/AdminRoute';
import Login from './pages/Login';
import Register from './pages/Register';
import DashboardLayout from './pages/Dashboard';
import Home from './pages/dashboard/Home';
import ManualRecording from './pages/dashboard/ManualRecording';
import Calendar from './pages/dashboard/Calendar';
import Meetings from './pages/dashboard/Meetings';
import Settings from './pages/dashboard/Settings';
import MeetingBot from './pages/dashboard/MeetingBot';
import NotFound from './pages/NotFound';
import Landing from './pages/Landing'; // Import Landing page
import { Loader2 } from 'lucide-react';
import MoMDetail from './pages/dashboard/MoMDetail'; // Import MoMDetail component
import ContentEditor from './pages/admin/ContentEditor';
import Privacy from './pages/legal/Privacy'; // Import Privacy page
import Terms from './pages/legal/Terms'; // Import Terms page
import TranscriptionDetail from './pages/dashboard/TranscriptionDetail';

// Lazy load components
const MoM = React.lazy(() => import('./pages/dashboard/MoM'));
const Transcriptions = React.lazy(() => import('./pages/dashboard/Transcriptions'));

// Loading fallback
const LoadingFallback = () => (
  <div className="flex items-center justify-center min-h-screen">
    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
    <span className="ml-3 text-gray-600">Loading...</span>
  </div>
);

// Google OAuth Client ID
const GOOGLE_CLIENT_ID = '655898539430-c8kqrsb99bofenipvrako93r0ibs0jmt.apps.googleusercontent.com';

function App() {
  return (
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Router>
        <AuthProvider>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/signup" element={<Register />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            
            {/* Redirect direct manual recording access to dashboard route */}
            <Route path="/manual-recording" element={<Navigate to="/dashboard/manual-recording" replace />} />
            
            {/* Dashboard Routes */}
            <Route path="/dashboard" element={<PrivateRoute><DashboardLayout /></PrivateRoute>}>
              <Route index element={<Navigate to="/dashboard/home" replace />} />
              <Route path="home" element={<Home />} />
              <Route path="manual-recording" element={<ManualRecording />} />
              <Route path="meeting-bot" element={<MeetingBot />} />
              <Route path="mom" element={
                <Suspense fallback={<LoadingFallback />}>
                  <MoM />
                </Suspense>
              } />
              <Route path="mom/:id" element={<MoMDetail />} />
              <Route path="moms/:id" element={<MoMDetail />} />
              <Route path="transcriptions" element={
                <Suspense fallback={<LoadingFallback />}>
                  <Transcriptions />
                </Suspense>
              } />
              <Route path="transcriptions/:id" element={<TranscriptionDetail />} />
              <Route path="calendar" element={<Calendar />} />
              <Route path="meetings" element={<Meetings />} />
              <Route path="settings" element={<Settings />} />
              <Route path="admin/content" element={
                <AdminRoute>
                  <Suspense fallback={<LoadingFallback />}>
                    <ContentEditor />
                  </Suspense>
                </AdminRoute>
              } />
            </Route>

            {/* Use Landing page as root */}
            <Route path="/" element={<Landing />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </AuthProvider>
      </Router>
    </GoogleOAuthProvider>
  );
}

export default App;
