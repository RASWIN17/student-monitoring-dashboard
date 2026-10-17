'use client';

import React, { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { ClassroomStudentDetailsView } from '@/components/ClassroomStudentDetailsView';

export default function CodeChefClassroomStudentDetailsPage() {
  const params = useParams();
  const classroomId = (params?.classroomId as string) || '';

  return (
    <Suspense fallback={null}>
      <ClassroomStudentDetailsView platform="codechef" classroomId={classroomId} />
    </Suspense>
  );
}

