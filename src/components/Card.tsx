
import React from 'react';

interface CardProps {
  title?: string;
  children: React.ReactNode;
  className?: string;
}

const Card: React.FC<CardProps> = ({ title, children, className }) => {
  return (
    <div className={`bg-white p-4 rounded-lg shadow-sm border border-slate-200 ${className}`}>
      {title && <h3 className="text-sm font-semibold text-slate-500 mb-4">{title}</h3>}
      {children}
    </div>
  );
};

export default Card;
