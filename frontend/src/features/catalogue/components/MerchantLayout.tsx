import React from 'react';
import { Outlet } from 'react-router-dom';
import { MerchantSidebar } from './MerchantSidebar';

// Figma: content starts 59px right of the sidebar, 37px from the top
export const MerchantLayout: React.FC = () => (
  <div className="min-h-screen bg-forsa-cream font-poppins text-forsa-green">
    <MerchantSidebar />
    <main className="ml-[238px] px-[59px] pb-10 pt-[37px]">
      <Outlet />
    </main>
  </div>
);
