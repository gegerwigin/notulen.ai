import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import { Mic, Calendar, FileText, ArrowRight, Video } from 'lucide-react';
import { useGoogleLogin } from '@react-oauth/google';
import UpcomingMeetings from '../../components/UpcomingMeetings';

const Home = () => {
  const { currentUser } = useAuth();
  const username = currentUser?.email?.split('@')[0] || 'User';
  const [calendarConnected, setCalendarConnected] = React.useState(false);

  // Check if calendar is already connected
  React.useEffect(() => {
    const token = sessionStorage.getItem('google_access_token');
    if (token) {
      setCalendarConnected(true);
    }
  }, []);

  // Google Calendar login
  const login = useGoogleLogin({
    onSuccess: (response) => {
      sessionStorage.setItem('google_access_token', response.access_token);
      setCalendarConnected(true);
    },
    onError: (error) => console.error('Calendar Login Failed:', error),
    scope: 'https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/calendar.events.readonly',
    flow: 'implicit'
  });

  return (
    <div className="p-6 space-y-6">
      {/* Welcome Section */}
      <div className="rounded-2xl bg-gradient-to-br from-blue-50 to-indigo-50 p-8">
        <h1 className="text-2xl font-bold text-gray-900">
          Welcome back, {username}
        </h1>
        <p className="text-gray-600 mt-2">
          Ready to start your meeting?
        </p>
        <Link
          to="/record"
          className="inline-flex items-center px-6 py-3 mt-6 text-white bg-blue-600 
                     hover:bg-blue-700 rounded-xl transition-all duration-200 
                     shadow-sm hover:shadow"
        >
          <Mic className="w-5 h-5 mr-2" />
          Start Recording
        </Link>
      </div>

      {/* Features Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Virtual Meeting Assistant */}
        <Link
          to="/join-meeting"
          className="group rounded-2xl bg-white p-6 shadow-sm border border-gray-100 
                     hover:shadow-md transition-all duration-200"
        >
          <div className="p-3 bg-blue-50 rounded-xl w-fit">
            <Video className="w-6 h-6 text-blue-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mt-4">
            Virtual Meeting Assistant
          </h3>
          <p className="text-gray-500 mt-2">
            Rekam dan transkripsi otomatis untuk Google Meet, Zoom, dan Microsoft Teams
          </p>
          <div className="flex items-center text-blue-600 mt-4 group-hover:translate-x-1 transition-transform">
            <span className="font-medium">Join meeting</span>
            <ArrowRight className="w-5 h-5 ml-1" />
          </div>
        </Link>

        {/* Meeting Minutes */}
        <Link
          to="/transcripts"
          className="group rounded-2xl bg-white p-6 shadow-sm border border-gray-100 
                     hover:shadow-md transition-all duration-200"
        >
          <div className="p-3 bg-purple-50 rounded-xl w-fit">
            <FileText className="w-6 h-6 text-purple-600" />
          </div>
          <h3 className="text-lg font-semibold text-gray-900 mt-4">
            Meeting Minutes
          </h3>
          <p className="text-gray-500 mt-2">
            Lihat dan kelola hasil rekaman rapat Anda
          </p>
          <div className="flex items-center text-purple-600 mt-4 group-hover:translate-x-1 transition-transform">
            <span className="font-medium">View minutes</span>
            <ArrowRight className="w-5 h-5 ml-1" />
          </div>
        </Link>
      </div>

      {/* Upcoming Meetings Section */}
      <div className="rounded-2xl bg-white p-8 shadow-sm border border-gray-100">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">Upcoming Meetings</h2>
            <p className="text-gray-500 mt-1">
              {calendarConnected 
                ? "Your upcoming meetings from Google Calendar" 
                : "Connect your calendar to see upcoming meetings"}
            </p>
          </div>
        </div>

        {!calendarConnected ? (
          <div className="text-center py-12 bg-gradient-to-br from-gray-50 to-white rounded-xl border-2 border-dashed border-gray-200">
            <div className="p-4 bg-blue-50 rounded-full w-fit mx-auto mb-6">
              <Calendar className="w-8 h-8 text-blue-600" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Connect your calendar</h3>
            <p className="text-gray-500 mb-6 max-w-md mx-auto">
              Connect your Google Calendar to see and manage your upcoming meetings
            </p>
            <button
              onClick={() => login()}
              className="inline-flex items-center px-6 py-3 text-white bg-blue-600 
                       hover:bg-blue-700 rounded-xl transition-all duration-200 
                       shadow-sm hover:shadow"
            >
              Connect Google Calendar
            </button>
          </div>
        ) : (
          <UpcomingMeetings />
        )}
      </div>
    </div>
  );
};

export default Home;
