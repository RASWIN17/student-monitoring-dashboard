'use client';

import React, { use } from 'react';
import { ContestDetailView } from '@/components/ContestDetailView';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function LeetCodeContestDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  return <ContestDetailView platform="leetcode" contestId={resolvedParams.id} />;
}
