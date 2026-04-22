import React from 'react';
import { motion } from 'framer-motion';

const Pageheader = ({ title, description, icon: Icon, children }) => {
  return (
    <div className="relative mb-8 p-6 bg-white border-4 border-black shadow-[8px_8px_0px_0px_rgba(0,0,0,1)] flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div className="flex items-center gap-4">
        {Icon && (
          <div className="p-3 bg-yellow-400 border-2 border-black shadow-[4px_4px_0px_0px_rgba(0,0,0,1)]">
            <Icon size={32} className="text-black" />
          </div>
        )}
        <div>
          <h1 className="text-3xl font-black uppercase text-black tracking-tight">
            {title}
          </h1>
          {description && (
            <p className="text-gray-700 font-medium mt-1 text-lg">
              {description}
            </p>
          )}
        </div>
      </div>

      {children && (
        <div className="flex items-center gap-3">
          {children}
        </div>
      )}
    </div>
  );
};

export default Pageheader;
