import { Users, Video, Calendar as CalendarIcon } from 'lucide-react';

const Meetings = () => {
  return (
    <div>
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">Meetings</h1>
      
      <div className="grid grid-cols-1 gap-6 mb-6">
        {/* Platform Connections */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Meeting Platforms</h2>
          
          <div className="space-y-4">
            {/* Zoom */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center">
                <Video className="h-6 w-6 text-blue-500" />
                <span className="ml-3 font-medium">Zoom</span>
              </div>
              <button className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100">
                Connect
              </button>
            </div>

            {/* Google Meet */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center">
                <Video className="h-6 w-6 text-green-500" />
                <span className="ml-3 font-medium">Google Meet</span>
              </div>
              <button className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100">
                Connect
              </button>
            </div>

            {/* Microsoft Teams */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center">
                <Video className="h-6 w-6 text-purple-500" />
                <span className="ml-3 font-medium">Microsoft Teams</span>
              </div>
              <button className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100">
                Connect
              </button>
            </div>
          </div>
        </div>

        {/* Calendar Connections */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Calendar Connections</h2>
          
          <div className="space-y-4">
            {/* Google Calendar */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center">
                <CalendarIcon className="h-6 w-6 text-red-500" />
                <span className="ml-3 font-medium">Google Calendar</span>
              </div>
              <button className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100">
                Connect
              </button>
            </div>

            {/* Outlook Calendar */}
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div className="flex items-center">
                <CalendarIcon className="h-6 w-6 text-blue-500" />
                <span className="ml-3 font-medium">Outlook Calendar</span>
              </div>
              <button className="px-4 py-2 text-sm font-medium text-indigo-600 bg-indigo-50 rounded-md hover:bg-indigo-100">
                Connect
              </button>
            </div>
          </div>
        </div>

        {/* Upcoming Meetings - Placeholder */}
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-medium text-gray-900 mb-4">Upcoming Meetings</h2>
          <div className="text-center py-8">
            <Users className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">No upcoming meetings</h3>
            <p className="mt-1 text-sm text-gray-500">
              Connect your calendar to see upcoming meetings
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Meetings;
