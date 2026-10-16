'use client';

import React from 'react';
import { Classroom } from '@/lib/types';

export interface ClassroomInfoHeaderProps {
  classroom?: Classroom | null;
  className?: string;
}

export function ClassroomInfoHeader({
  classroom,
  className = '',
}: ClassroomInfoHeaderProps) {
  if (!classroom) return null;

  const sectionFormatted = classroom.section
    ? classroom.section.trim().toLowerCase().startsWith('sec')
      ? classroom.section.trim()
      : `Section ${classroom.section.trim()}`
    : null;

  const line1SubParts: string[] = [];
  if (classroom.course && classroom.course.trim()) {
    line1SubParts.push(classroom.course.trim());
  }
  if (sectionFormatted) {
    line1SubParts.push(sectionFormatted);
  }

  const secondaryDetails: { label: string; value: string }[] = [];
  if (classroom.department && classroom.department.trim()) {
    secondaryDetails.push({ label: 'Department', value: classroom.department.trim() });
  }
  if (classroom.batch && classroom.batch.trim()) {
    secondaryDetails.push({ label: 'Batch', value: classroom.batch.trim() });
  }
  if (classroom.academic_year && classroom.academic_year.trim()) {
    secondaryDetails.push({ label: 'Academic Year', value: classroom.academic_year.trim() });
  }

  return (
    <div className={`mt-1 sm:mt-1.5 space-y-0.5 sm:space-y-1 ${className}`}>
      {/* First line: Class name, Course name or code (if available), Section */}
      <div className="flex flex-wrap items-baseline gap-x-1.5 text-xs sm:text-sm leading-tight">
        <span className="font-bold text-[#0f1b35] tracking-tight">{classroom.name}</span>
        {line1SubParts.length > 0 && (
          <span className="text-[#64748b] font-medium text-xs sm:text-[13px]">
            ({line1SubParts.join(' — ')})
          </span>
        )}
      </div>

      {/* Second line: Department • Batch • Academic Year */}
      {secondaryDetails.length > 0 && (
        <p className="text-[11px] sm:text-xs text-[#64748b] flex flex-wrap items-center gap-x-2 gap-y-0.5 font-medium leading-normal">
          {secondaryDetails.map((item, idx) => (
            <React.Fragment key={item.label}>
              {idx > 0 && <span className="text-slate-300 select-none">•</span>}
              <span className="inline-flex items-baseline gap-1">
                <strong className="font-semibold text-[#475569]">{item.label}:</strong>
                <span className="text-[#334155]">{item.value}</span>
              </span>
            </React.Fragment>
          ))}
        </p>
      )}
    </div>
  );
}
