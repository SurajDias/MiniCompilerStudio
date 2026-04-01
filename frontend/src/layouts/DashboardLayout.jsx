import React from 'react';
import { Outlet } from 'react-router-dom';
import TopNav from '../components/layout/TopNav';
import Sidebar from '../components/layout/Sidebar';

const DashboardLayout = () => {
  return (
    <div className="flex h-screen w-full bg-grid-cyber relative overflow-hidden">
      {/* Background soft lighting */}
      <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-cyan/5 blur-[200px] rounded-full pointer-events-none" />
      <div className="absolute bottom-[-20%] right-[-10%] w-[50%] h-[50%] bg-purple/5 blur-[200px] rounded-full pointer-events-none" />

      {/* Main UI */}
      <Sidebar />
      <div className="flex-1 flex flex-col relative z-0">
        <TopNav />
        <main className="flex-1 overflow-auto p-6 relative">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

export default DashboardLayout;
