import { useState, useRef, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Mic2, FileText, Settings, Calendar, Users, LogOut, Bot, PanelLeft, ChevronDown, ChevronUp, Gift, HelpCircle, MessageSquare, Home } from 'lucide-react';
import clsx from 'clsx';
import { useAuth } from '../contexts/AuthContext';
import UpcomingMeetings from './UpcomingMeetings';

export default function Sidebar() {
  const location = useLocation();
  const navigate = useNavigate();
  const { logout, isAdmin, userRole, currentUser } = useAuth();
  const path = location.pathname;
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const profileMenuRef = useRef<HTMLDivElement>(null);
  const [profileImageError, setProfileImageError] = useState(false);

  // Close the profile menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  // Reset image error state when user changes
  useEffect(() => {
    setProfileImageError(false);
  }, [currentUser?.uid]);

  // Debug logs
  console.log("Current user:", currentUser);
  console.log("Current user role:", userRole);
  console.log("Is admin?", isAdmin());

  const navigation = [
    {
      name: 'Home',
      href: '/dashboard/home',
      icon: Home, 
      current: path === '/dashboard/home',
    },
    {
      name: 'Transkripsi',
      href: '/dashboard/transcriptions',
      icon: FileText,
      current: path === '/dashboard' || path === '/dashboard/transcriptions' || path.includes('/dashboard/mom'),
    },
    {
      name: 'Rekam Manual',
      href: '/dashboard/manual-recording',
      icon: Mic2,
      current: path === '/dashboard/manual-recording',
    },
    {
      name: 'Meeting Bot',
      href: '/dashboard/meeting-bot',
      icon: Bot,
      current: path === '/dashboard/meeting-bot',
    },
    {
      name: 'Jadwal Meeting',
      href: '/dashboard/calendar',
      icon: Calendar,
      current: path === '/dashboard/calendar',
    },
    {
      name: 'Meeting',
      href: '/dashboard/meetings',
      icon: Users,
      current: path === '/dashboard/meetings',
    },
    {
      name: 'Pengaturan',
      href: '/dashboard/settings',
      icon: Settings,
      current: path === '/dashboard/settings',
    },
  ];

  // Admin navigation items - only shown to admin users
  const adminNavigation = [
    {
      name: 'Content Manager',
      href: '/dashboard/admin/content',
      icon: PanelLeft,
      current: path === '/dashboard/admin/content',
    }
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out:', error);
    }
  };

  // Get user information for display
  const userEmail = currentUser?.email || '';
  
  // Get user's display name - try to extract from provider data if available
  let userDisplayName = '';
  if (currentUser?.displayName) {
    // User has a display name from provider
    userDisplayName = currentUser.displayName;
  } else if (userEmail) {
    // Use email username part as display name
    userDisplayName = userEmail.split('@')[0];
  } else {
    userDisplayName = 'User';
  }
  
  // Get user's profile photo URL or generate initials for avatar
  const userPhotoURL = currentUser?.photoURL;
  
  // Generate initials based on display name or email
  let userInitials = '';
  if (currentUser?.displayName) {
    // If user has a display name, use first letter of first and last name if available
    const nameParts = currentUser.displayName.split(' ');
    if (nameParts.length >= 2) {
      // Has first and last name
      userInitials = (nameParts[0].charAt(0) + nameParts[nameParts.length - 1].charAt(0)).toUpperCase();
    } else {
      // Only has one name
      userInitials = nameParts[0].charAt(0).toUpperCase();
    }
  } else if (userEmail) {
    // Use first letter of email username
    userInitials = userEmail.split('@')[0].charAt(0).toUpperCase();
  } else {
    userInitials = 'U';
  }
  
  // Determine if user logged in with a provider (Google, Microsoft, etc.)
  const isProviderLogin = currentUser?.providerData?.some(
    provider => provider.providerId === 'google.com' || provider.providerId === 'microsoft.com'
  );

  // Debug provider information
  console.log("Photo URL:", userPhotoURL);
  console.log("Provider login:", isProviderLogin);
  console.log("Provider data:", currentUser?.providerData);
  console.log("Profile image error:", profileImageError);

  return (
    <div className="hidden md:flex md:w-72 md:flex-col md:fixed md:inset-y-0">
      <div className="flex flex-col flex-grow bg-white border-r border-gray-200 pt-5 pb-4 overflow-y-auto">
        <div className="flex items-center flex-shrink-0 px-6 mb-6">
          <Link to="/dashboard" className="flex-shrink-0">
            <img src="/logo.svg" alt="Notula.ai" className="h-8" />
          </Link>
        </div>
        
        {/* Profile Section */}
        <div className="px-4 mb-6">
          <div 
            className="relative cursor-pointer"
            onClick={() => setProfileMenuOpen(!profileMenuOpen)}
          >
            <div className="flex items-center p-3 rounded-xl hover:bg-gray-50 transition-all duration-200">
              <div className="flex-shrink-0 mr-3">
                {userPhotoURL && !profileImageError ? (
                  <img
                    className="h-10 w-10 rounded-xl object-cover"
                    src={userPhotoURL}
                    alt={userDisplayName}
                    onError={() => setProfileImageError(true)}
                  />
                ) : (
                  <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 flex items-center justify-center text-white font-medium">
                    {userInitials}
                  </div>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-semibold text-gray-900 truncate">
                    {userDisplayName}
                  </p>
                  {profileMenuOpen ? (
                    <ChevronUp className="h-4 w-4 text-gray-500" />
                  ) : (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                  )}
                </div>
                <p className="text-xs text-gray-500 truncate">{userEmail}</p>
              </div>
            </div>
            
            {/* Profile Dropdown Menu */}
            {profileMenuOpen && (
              <div className="absolute left-0 right-0 mt-2 bg-white rounded-xl shadow-lg z-10 border border-gray-100">
                <div className="py-2">
                  <Link 
                    to="/dashboard/upgrade" 
                    className="flex items-center px-4 py-2 text-sm text-blue-600 hover:bg-blue-50 transition-colors duration-200"
                  >
                    <Gift className="mr-3 h-4 w-4" />
                    Upgrade Plan
                  </Link>
                  <Link 
                    to="/dashboard/settings" 
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Settings className="mr-3 h-4 w-4" />
                    Account Settings
                  </Link>
                  <Link 
                    to="/dashboard/refer" 
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <Gift className="mr-3 h-4 w-4" />
                    Refer & Earn
                  </Link>
                  <Link 
                    to="/dashboard/help" 
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <HelpCircle className="mr-3 h-4 w-4" />
                    Help Center
                  </Link>
                  <Link 
                    to="/dashboard/support" 
                    className="flex items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <MessageSquare className="mr-3 h-4 w-4" />
                    Contact Support
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="flex items-center w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-50"
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    Logout
                  </button>
                </div>
                <div className="border-t border-gray-200 pt-2 pb-2 px-4">
                  <p className="text-xs text-gray-500">Download the mobile app</p>
                </div>
                <div className="border-t border-gray-200 pt-2 pb-2 px-4">
                  <p className="text-sm font-medium text-gray-900">{userDisplayName}</p>
                  <p className="text-xs text-gray-500">Basic • {isAdmin() ? 'Admin' : 'User'}</p>
                </div>
                <div className="px-4 py-2">
                  <button className="w-full px-4 py-2 text-sm text-center text-blue-600 bg-white border border-blue-600 rounded-md hover:bg-blue-50">
                    Manage Workspace
                  </button>
                </div>
              </div>
            )}
          </div>
          
          {/* Invite Teammates Button */}
          {!profileMenuOpen && (
            <button className="mt-3 w-full flex items-center justify-center px-4 py-2 text-sm text-gray-700 bg-gray-50 rounded-xl hover:bg-gray-100 transition-all duration-200">
              <Users className="mr-2 h-4 w-4" />
              Invite Teammates
            </button>
          )}
        </div>
        
        {/* Navigation */}
        <div className="flex-grow flex flex-col">
          <nav className="flex-1 px-3 space-y-1">
            {navigation.map((item) => (
              <Link
                key={item.name}
                to={item.href}
                className={clsx(
                  item.current
                    ? 'bg-blue-50 text-blue-600'
                    : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                  'group flex items-center px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200'
                )}
              >
                <item.icon
                  className={clsx(
                    item.current
                      ? 'text-blue-600'
                      : 'text-gray-400 group-hover:text-gray-500',
                    'mr-3 flex-shrink-0 h-5 w-5'
                  )}
                  aria-hidden="true"
                />
                {item.name}
              </Link>
            ))}
            
            {/* Admin Navigation */}
            {isAdmin() && (
              <>
                <div className="pt-4 pb-2">
                  <div className="px-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                    Admin
                  </div>
                </div>
                {adminNavigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={clsx(
                      item.current
                        ? 'bg-blue-50 text-blue-600'
                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900',
                      'group flex items-center px-4 py-2 text-sm font-medium rounded-xl transition-all duration-200'
                    )}
                  >
                    <item.icon
                      className={clsx(
                        item.current
                          ? 'text-blue-600'
                          : 'text-gray-400 group-hover:text-gray-500',
                        'mr-3 flex-shrink-0 h-5 w-5'
                      )}
                      aria-hidden="true"
                    />
                    {item.name}
                  </Link>
                ))}
              </>
            )}
          </nav>
          
          {/* Upcoming Meetings Section */}
          <div className="mt-6 mx-3 mb-4">
            <div className="bg-gray-50 rounded-xl overflow-hidden">
              <UpcomingMeetings />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
