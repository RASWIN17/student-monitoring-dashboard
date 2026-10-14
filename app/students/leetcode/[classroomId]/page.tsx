'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { ClassroomStudentDetailsView } from '@/components/ClassroomStudentDetailsView';

export default function LeetCodeClassroomStudentDetailsPage() {
  const params = useParams();
  const classroomId = (params?.classroomId as string) || '';

  return <ClassroomStudentDetailsView platform="leetcode" classroomId={classroomId} />;
}
