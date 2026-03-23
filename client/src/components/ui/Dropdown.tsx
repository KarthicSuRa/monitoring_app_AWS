
import React, { useState, useRef, useEffect } from 'react';

interface DropdownProps {
  buttonText: string;
  items: { label: string; onClick: () => void; }[];
}

export const Dropdown: React.FC<DropdownProps> = ({ buttonText, items }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button onClick={() => setIsOpen(!isOpen)} className="bg-gray-800 text-white px-4 py-2 rounded-md">
        {buttonText}
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-10">
          <ul className="py-1">
            {items.map((item, index) => (
              <li key={index}>
                <a href="#" onClick={item.onClick} className="block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
};
