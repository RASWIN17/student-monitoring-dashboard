'use client';

import React, { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { ClassroomStudentDetailsView } from '@/components/ClassroomStudentDetailsView';

export default function LeetCodeClassroomStudentDetailsPage() {
  const params = useParams();
  const classroomId = (params?.classroomId as string) || '';

  return (
    <Suspense fallback={null}>
      <ClassroomStudentDetailsView platform="leetcode" classroomId={classroomId} />
    </Suspense>
  );
}

