import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
  monochrome?: boolean;
}

export function LeetCodeIcon({ className = 'w-6 h-6', size, monochrome = false }: IconProps) {
  const style = size ? { width: size, height: size } : undefined;
  return (
    <img
      src="/images/platforms/leetcode-new.png"
      alt="LeetCode"
      className={`inline-block object-contain rounded-md select-none pointer-events-none ${monochrome ? 'brightness-0 invert' : ''} ${className}`}
      style={style}
    />
  );
}

export function CodeChefIcon({ className = 'w-6 h-6', size, monochrome = false }: IconProps) {
  const style = size ? { width: size, height: size } : undefined;
  return (
    <img
      src="/images/platforms/codechef-new.png"
      alt="CodeChef"
      className={`inline-block object-contain rounded-md select-none pointer-events-none ${monochrome ? 'brightness-0 invert' : ''} ${className}`}
      style={style}
    />
  );
}

