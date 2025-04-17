import { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { ChevronDown, Menu, X, Mic, Brain, Users, Building2, BookOpen, HelpCircle, MessageCircle, Users2, LogOut, Home, Settings } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const [solutionsOpen, setSolutionsOpen] = useState(false);
  const [resourcesOpen, setResourcesOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const { currentUser, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const solutions = [
    { name: 'Rapat Virtual', icon: <Users /> },
    { name: 'Rapat Offline', icon: <Mic /> },
    { name: 'AI Notulen', icon: <Brain /> },
    { name: 'Enterprise', icon: <Building2 /> }
  ];

  const resources = [
    { name: 'Blog', icon: <BookOpen /> },
    { name: 'Dokumentasi', icon: <HelpCircle /> },
    { name: 'Bantuan', icon: <MessageCircle /> },
    { name: 'Komunitas', icon: <Users2 /> }
  ];

  const handleLogout = async () => {
    try {
      await logout();
      navigate('/');
    } catch (error) {
      console.error('Failed to log out', error);
    }
  };

  // Render different navbar based on whether user is logged in
  if (currentUser) {
    // Authenticated user navbar (for dashboard, recorder, etc.)
    return (
      <nav className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex items-center">
              <Link to="/dashboard" className="flex-shrink-0">
                <img src="/logo.svg" alt="Notula.ai" className="h-8" />
              </Link>
              
              <div className="hidden md:ml-6 md:flex md:space-x-6">
                <Link to="/dashboard" className={`flex items-center text-gray-700 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg px-3 py-2 transition-all duration-200 ${location.pathname === '/dashboard' ? 'bg-blue-50 text-blue-600' : ''}`}>
                  <Home className="h-5 w-5 mr-2" />
                  <span>Dashboard</span>
                </Link>
              </div>
            </div>

            <div className="hidden md:flex md:items-center md:space-x-4">
              <div className="relative">
                <button 
                  onClick={() => setUserMenuOpen(!userMenuOpen)} 
                  className="flex items-center text-gray-700 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg px-3 py-2 transition-all duration-200"
                >
                  <div className="h-8 w-8 rounded-full bg-blue-600 flex items-center justify-center text-white">
                    {currentUser.email ? currentUser.email.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <span className="ml-2">{currentUser.displayName || currentUser.email}</span>
                  <ChevronDown className={`ml-1 h-4 w-4 transition-transform duration-200 ${userMenuOpen ? 'rotate-180' : ''}`} />
                </button>
                <div className={`absolute right-0 mt-2 w-48 bg-white shadow-lg rounded-lg ${userMenuOpen ? 'block' : 'hidden'}`}>
                  <Link to="/settings" className="flex items-center p-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 first:rounded-t-lg">
                    <Settings className="h-5 w-5 mr-2" />
                    <span>Pengaturan</span>
                  </Link>
                  <button 
                    onClick={handleLogout}
                    className="flex items-center w-full text-left p-3 text-gray-700 hover:text-red-600 hover:bg-red-50 transition-all duration-200 last:rounded-b-lg"
                  >
                    <LogOut className="h-5 w-5 mr-2" />
                    <span>Keluar</span>
                  </button>
                </div>
              </div>
            </div>

            <div className="md:hidden">
              <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg transition-all duration-200">
                {isOpen ? <X /> : <Menu />}
              </button>
            </div>
          </div>

          <div className={`md:hidden ${isOpen ? 'block' : 'hidden'}`}>
            <div className="pt-2 pb-3 space-y-1">
              <Link to="/dashboard" className={`flex items-center w-full p-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 rounded-lg ${location.pathname === '/dashboard' ? 'bg-blue-50 text-blue-600' : ''}`}>
                <Home className="h-5 w-5 mr-2" />
                <span>Dashboard</span>
              </Link>
              
              <div className="border-t border-gray-200 pt-4 mt-2 space-y-1">
                <Link to="/settings" className="flex items-center w-full p-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 rounded-lg">
                  <Settings className="h-5 w-5 mr-2" />
                  <span>Pengaturan</span>
                </Link>
                <button 
                  onClick={handleLogout}
                  className="flex items-center w-full text-left p-3 text-gray-700 hover:text-red-600 hover:bg-red-50 transition-all duration-200 rounded-lg"
                >
                  <LogOut className="h-5 w-5 mr-2" />
                  <span>Keluar</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </nav>
    );
  }

  // Non-authenticated user navbar (for landing page)
  return (
    <nav className="fixed w-full bg-white/80 backdrop-blur-lg z-50 border-b border-gray-100">
      <div className="max-w-7xl mx-auto px-4">
        <div className="flex justify-between h-16">
          <div className="flex items-center">
            <Link to="/" className="flex-shrink-0">
              <img src="/logo.svg" alt="Notula.ai" className="h-8" />
            </Link>
            
            <div className="hidden md:ml-6 md:flex md:space-x-6">
              <div className="relative">
                <button onClick={() => setSolutionsOpen(!solutionsOpen)} className="flex items-center text-gray-700 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg px-3 py-2 transition-all duration-200">
                  <Mic className="h-5 w-5 mr-2" />
                  <span>Solusi</span>
                  <ChevronDown className={`ml-1 h-4 w-4 transition-transform duration-200 ${solutionsOpen ? 'rotate-180' : ''}`} />
                </button>
                <div className={`absolute mt-2 w-48 bg-white shadow-lg rounded-lg ${solutionsOpen ? 'block' : 'hidden'}`}>
                  {solutions.map(item => (
                    <Link key={item.name} to="#" className="flex items-center p-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 first:rounded-t-lg last:rounded-b-lg">
                      {item.icon}
                      <span className="ml-3">{item.name}</span>
                    </Link>
                  ))}
                </div>
              </div>

              <Link to="/pricing" className="flex items-center text-gray-700 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg px-3 py-2 transition-all duration-200">
                <Building2 className="h-5 w-5 mr-2" />
                <span>Harga</span>
              </Link>
              <Link to="/integrations" className="flex items-center text-gray-700 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg px-3 py-2 transition-all duration-200">
                <Users2 className="h-5 w-5 mr-2" />
                <span>Integrasi</span>
              </Link>

              <div className="relative">
                <button onClick={() => setResourcesOpen(!resourcesOpen)} className="flex items-center text-gray-700 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg px-3 py-2 transition-all duration-200">
                  <BookOpen className="h-5 w-5 mr-2" />
                  <span>Sumber Daya</span>
                  <ChevronDown className={`ml-1 h-4 w-4 transition-transform duration-200 ${resourcesOpen ? 'rotate-180' : ''}`} />
                </button>
                <div className={`absolute mt-2 w-48 bg-white shadow-lg rounded-lg ${resourcesOpen ? 'block' : 'hidden'}`}>
                  {resources.map(item => (
                    <Link key={item.name} to="#" className="flex items-center p-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 first:rounded-t-lg last:rounded-b-lg">
                      {item.icon}
                      <span className="ml-3">{item.name}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="hidden md:flex md:items-center md:space-x-4">
            <Link to="/demo" className="flex items-center text-gray-700 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg px-3 py-2 transition-all duration-200">
              <MessageCircle className="h-5 w-5 mr-2" />
              <span>Jadwalkan Demo</span>
            </Link>
            <Link to="/login" className="flex items-center text-gray-700 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg px-3 py-2 transition-all duration-200">
              <Users className="h-5 w-5 mr-2" />
              <span>Masuk</span>
            </Link>
            <Link to="/signup" className="flex items-center px-4 py-2 text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-all duration-200 shadow-sm hover:shadow">
              <Brain className="h-5 w-5 mr-2" />
              <span>Mulai Gratis</span>
            </Link>
          </div>

          <div className="md:hidden">
            <button onClick={() => setIsOpen(!isOpen)} className="p-2 text-gray-700 hover:text-blue-600 hover:bg-blue-50/50 rounded-lg transition-all duration-200">
              {isOpen ? <X /> : <Menu />}
            </button>
          </div>
        </div>

        <div className={`md:hidden ${isOpen ? 'block' : 'hidden'}`}>
          <div className="pt-2 pb-3 space-y-1">
            <button onClick={() => setSolutionsOpen(!solutionsOpen)} className="flex items-center justify-between w-full p-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200">
              <div className="flex items-center">
                <Mic className="h-5 w-5 mr-2" />
                <span>Solusi</span>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${solutionsOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`${solutionsOpen ? 'block' : 'hidden'} bg-gray-50 rounded-lg my-1`}>
              {solutions.map(item => (
                <Link key={item.name} to="#" className="flex items-center p-3 pl-6 text-gray-700 hover:text-blue-600 hover:bg-blue-100/50 transition-all duration-200 first:rounded-t-lg last:rounded-b-lg">
                  {item.icon}
                  <span className="ml-3">{item.name}</span>
                </Link>
              ))}
            </div>

            <Link to="/pricing" className="flex items-center w-full p-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 rounded-lg">
              <Building2 className="h-5 w-5 mr-2" />
              <span>Harga</span>
            </Link>
            <Link to="/integrations" className="flex items-center w-full p-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 rounded-lg">
              <Users2 className="h-5 w-5 mr-2" />
              <span>Integrasi</span>
            </Link>

            <button onClick={() => setResourcesOpen(!resourcesOpen)} className="flex items-center justify-between w-full p-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200">
              <div className="flex items-center">
                <BookOpen className="h-5 w-5 mr-2" />
                <span>Sumber Daya</span>
              </div>
              <ChevronDown className={`h-4 w-4 transition-transform duration-200 ${resourcesOpen ? 'rotate-180' : ''}`} />
            </button>
            <div className={`${resourcesOpen ? 'block' : 'hidden'} bg-gray-50 rounded-lg my-1`}>
              {resources.map(item => (
                <Link key={item.name} to="#" className="flex items-center p-3 pl-6 text-gray-700 hover:text-blue-600 hover:bg-blue-100/50 transition-all duration-200 first:rounded-t-lg last:rounded-b-lg">
                  {item.icon}
                  <span className="ml-3">{item.name}</span>
                </Link>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-4 mt-2 space-y-1">
              <Link to="/demo" className="flex items-center w-full p-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 rounded-lg">
                <MessageCircle className="h-5 w-5 mr-2" />
                <span>Jadwalkan Demo</span>
              </Link>
              <Link to="/login" className="flex items-center w-full p-3 text-gray-700 hover:text-blue-600 hover:bg-blue-50 transition-all duration-200 rounded-lg">
                <Users className="h-5 w-5 mr-2" />
                <span>Masuk</span>
              </Link>
              <Link to="/signup" className="flex items-center justify-center w-full p-3 text-white bg-blue-600 hover:bg-blue-700 transition-all duration-200 rounded-lg shadow-sm hover:shadow">
                <Brain className="h-5 w-5 mr-2" />
                <span>Mulai Gratis</span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </nav>
  );
}
