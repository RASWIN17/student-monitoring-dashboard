import React from 'react';

interface IconProps {
  className?: string;
  size?: number;
}

export function LeetCodeIcon({ className = 'w-6 h-6', size }: IconProps) {
  const style = size ? { width: size, height: size } : undefined;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      <path
        d="M13.483 0a1.374 1.374 0 0 0-.961.438L7.116 6.226l-3.854 4.126a5.266 5.266 0 0 0-1.209 2.104 5.35 5.35 0 0 0-.125.513 5.527 5.527 0 0 0 .062 2.362 5.83 5.83 0 0 0 .349 1.017 5.938 5.938 0 0 0 4.792 3.635 6.002 6.002 0 0 0 2.457-.184 5.922 5.922 0 0 0 2.158-1.144l4.24-4.24a1.374 1.374 0 1 0-1.943-1.944l-4.24 4.24a3.175 3.175 0 0 1-1.156.612 3.255 3.255 0 0 1-1.334.1 3.208 3.208 0 0 1-2.585-1.961 2.977 2.977 0 0 1-.189-.55 2.984 2.984 0 0 1-.033-1.275 2.844 2.844 0 0 1 .653-1.137l3.854-4.126 5.406-5.788A1.374 1.374 0 0 0 13.483 0z"
        fill="#FFA116"
      />
      <path
        d="M9.832 10.903a1.4 1.4 0 0 0-.99.41l-2.073 2.073a1.4 1.4 0 1 0 1.98 1.98l2.073-2.073a1.4 1.4 0 0 0-.99-2.39z"
        fill="#262626"
        className="dark:fill-slate-100"
      />
      <path
        d="M20.311 17.09a1.374 1.374 0 0 0-1.374-1.374h-8.032a1.374 1.374 0 1 0 0 2.748h8.032a1.374 1.374 0 0 0 1.374-1.374z"
        fill="#000000"
        className="dark:fill-slate-100"
      />
    </svg>
  );
}

export function CodeChefIcon({ className = 'w-6 h-6', size }: IconProps) {
  const style = size ? { width: size, height: size } : undefined;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      style={style}
    >
      {/* Chef Hat outline and styling */}
      <path
        d="M18.5 10c.83 0 1.5-.67 1.5-1.5 0-.75-.55-1.38-1.27-1.48C18.63 5.48 17.07 4 15.17 4c-.75 0-1.44.25-2 .68A3.487 3.487 0 0 0 10.5 4C8.57 4 7 5.57 7 7.5c0 .17.02.34.05.5C6.44 8.24 6 8.82 6 9.5 6 10.33 6.67 11 7.5 11H8v5h8v-5h2.5z"
        fill="#5B4636"
      />
      <path
        d="M8 17h8v2H8v-2zm1-8.5c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5V11H9V8.5zm4 0c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5V11h-3V8.5z"
        fill="#E8B382"
      />
      <rect x="7.5" y="19" width="9" height="2" rx="1" fill="#8B5E3C" />
    </svg>
  );
}
