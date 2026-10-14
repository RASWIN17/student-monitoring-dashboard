'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { ClassroomStudentDetailsView } from '@/components/ClassroomStudentDetailsView';

export default function CodeChefClassroomStudentDetailsPage() {
  const params = useParams();
  const classroomId = (params?.classroomId as string) || '';

  return <ClassroomStudentDetailsView platform="codechef" classroomId={classroomId} />;
}
