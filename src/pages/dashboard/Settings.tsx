import React from 'react';
import { useAuth } from '../../contexts/AuthContext';
import { Globe, Users, Bell, Shield, VolumeX } from 'lucide-react';

const Settings = () => {
  const { currentUser } = useAuth();

  const [language, setLanguage] = React.useState('id');
  const [speakerSensitivity, setSpeakerSensitivity] = React.useState('2000');

  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Settings</h1>

      <div className="space-y-6">
        {/* User Profile Section */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">User Profile</h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <div className="mt-1 text-gray-900">{currentUser?.email}</div>
            </div>
          </div>
        </div>

        {/* Recording Settings */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Recording Settings</h2>
          
          {/* Language Selection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center">
                <Globe className="h-5 w-5 mr-2 text-gray-400" />
                Language
              </div>
            </label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="id">Bahasa Indonesia</option>
              <option value="en">English</option>
            </select>
          </div>

          {/* Speaker Detection */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center">
                <Users className="h-5 w-5 mr-2 text-gray-400" />
                Speaker Detection Sensitivity
              </div>
            </label>
            <select
              value={speakerSensitivity}
              onChange={(e) => setSpeakerSensitivity(e.target.value)}
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="1000">High (1s)</option>
              <option value="2000">Medium (2s)</option>
              <option value="3000">Low (3s)</option>
              <option value="5000">Very Low (5s)</option>
            </select>
          </div>

          {/* Noise Reduction */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <div className="flex items-center">
                <VolumeX className="h-5 w-5 mr-2 text-gray-400" />
                Noise Reduction
              </div>
            </label>
            <select
              defaultValue="medium"
              className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm rounded-md"
            >
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
            </select>
          </div>
        </div>

        {/* Meeting Platforms (Placeholder) */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Meeting Platforms</h2>
          <p className="text-sm text-gray-500">
            Meeting platform integration settings will be available soon.
          </p>
        </div>

        {/* Calendar Integration (Placeholder) */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Calendar Integration</h2>
          <p className="text-sm text-gray-500">
            Calendar integration settings will be available soon.
          </p>
        </div>

        {/* Notifications (Placeholder) */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            <div className="flex items-center">
              <Bell className="h-5 w-5 mr-2 text-gray-400" />
              Notifications
            </div>
          </h2>
          <p className="text-sm text-gray-500">
            Notification settings will be available soon.
          </p>
        </div>

        {/* Security (Placeholder) */}
        <div className="bg-white shadow-sm rounded-lg p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">
            <div className="flex items-center">
              <Shield className="h-5 w-5 mr-2 text-gray-400" />
              Security
            </div>
          </h2>
          <p className="text-sm text-gray-500">
            Additional security settings will be available soon.
          </p>
        </div>
      </div>
    </div>
  );
};

export default Settings;
