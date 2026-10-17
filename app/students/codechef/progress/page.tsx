'use client';

import React, { Suspense } from 'react';
import { ClassroomStudentDetailsView } from '@/components/ClassroomStudentDetailsView';

export default function CodeChefStudentProgressPage() {
  return (
    <Suspense fallback={null}>
      <ClassroomStudentDetailsView platform="codechef" />
    </Suspense>
  );
}

