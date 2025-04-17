import { useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { Mic, Video, Calendar, Settings, List } from 'lucide-react';

const Dashboard = () => {
  const navigate = useNavigate();
  const [selectedTab, setSelectedTab] = useState('manual');

  const tabs = [
    {
      id: 'manual',
      name: 'Manual Recording',
      icon: Mic,
      description: 'Record and transcribe meetings manually',
      path: '/dashboard/manual'
    },
    {
      id: 'auto',
      name: 'Auto Recording',
      icon: Video,
      description: 'Automatically join and record scheduled meetings',
      path: '/dashboard/auto'
    },
    {
      id: 'schedule',
      name: 'Schedule',
      icon: Calendar,
      description: 'View and manage upcoming meetings',
      path: '/dashboard/schedule'
    },
    {
      id: 'history',
      name: 'History',
      icon: List,
      description: 'View past recordings and transcripts',
      path: '/dashboard/history'
    }
  ];

  const handleTabChange = (tabId: string) => {
    setSelectedTab(tabId);
    const tab = tabs.find(t => t.id === tabId);
    if (tab) {
      navigate(tab.path);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation Tabs */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex">
              {tabs.map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`inline-flex items-center px-4 py-2 border-b-2 text-sm font-medium ${
                    selectedTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-5 w-5 mr-2" />
                  {tab.name}
                </button>
              ))}
            </div>
            <div className="flex items-center">
              <button
                onClick={() => navigate('/settings')}
                className="p-2 text-gray-400 hover:text-gray-500"
              >
                <Settings className="h-6 w-6" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

export default Dashboard;
