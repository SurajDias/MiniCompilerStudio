import React from 'react';
import { Outlet } from 'react-router-dom';

const AuthLayout = () => {
  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-grid-cyber relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute inset-x-0 bottom-0 h-[50vh] bg-gradient-to-t from-cyan/10 to-transparent pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[60%] h-[60%] bg-purple/10 blur-[200px] rounded-full pointer-events-none" />
      
      <main className="relative z-10 w-full max-w-7xl px-4 sm:px-6 lg:px-8">
        <Outlet />
      </main>
    </div>
  );
};

export default AuthLayout;
