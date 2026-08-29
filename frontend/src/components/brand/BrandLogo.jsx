import React from 'react';
import logoImg from '@/assets/logo.png';

export default function BrandLogo({ className = "h-8 sm:h-9 md:h-[38px]", alt = "Test Master Pro" }) {
  return (
    <img
      src={logoImg}
      alt={alt}
      className={`w-auto max-h-[38px] object-contain select-none transition-transform hover:scale-[1.02] duration-200 ${className}`}
    />
  );
}




