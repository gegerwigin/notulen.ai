import { Outlet } from 'react-router-dom';
import Sidebar from '../components/Sidebar';

export default function Dashboard() {
  return (
    <div className="min-h-screen bg-gray-50">
      <Sidebar />
      
      <div className="md:pl-64">
        <Outlet />
      </div>
    </div>
  );
}
