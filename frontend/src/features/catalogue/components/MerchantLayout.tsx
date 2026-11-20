
import React from 'react';
import { Outlet } from 'react-router-dom';
import { MerchantSidebar } from './MerchantSidebar';

export const MerchantLayout: React.FC = () => (
  <div className="min-h-screen bg-[#FFFAF0] font-poppins text-[#0B2C25]">
    <MerchantSidebar />

    <main className="ml-[238px] min-h-screen px-[59px] pb-[40px] pt-[37px]">
      <Outlet />
    </main>
  </div>
);

export default MerchantLayout;
