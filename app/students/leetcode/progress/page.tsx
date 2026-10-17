'use client';

import React, { Suspense } from 'react';
import { ClassroomStudentDetailsView } from '@/components/ClassroomStudentDetailsView';

export default function LeetCodeStudentProgressPage() {
  return (
    <Suspense fallback={null}>
      <ClassroomStudentDetailsView platform="leetcode" />
    </Suspense>
  );
}

