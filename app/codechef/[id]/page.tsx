'use client';

import React, { use } from 'react';
import { ContestDetailView } from '@/components/ContestDetailView';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function CodeChefContestDetailPage({ params }: PageProps) {
  const resolvedParams = use(params);
  return <ContestDetailView platform="codechef" contestId={resolvedParams.id} />;
}
