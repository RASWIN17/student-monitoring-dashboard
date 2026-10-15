export type UserRole = 'teacher' | 'student' | 'admin';

export interface UserProfile {
  id: string;
  auth_user_id: string;
  email: string;
  display_name: string;
  role: UserRole;
  register_number?: string | null;
  class_name?: string | null;
  section?: string | null;
  profile_completed?: boolean;
  created_at: string;
  updated_at: string;
}

export interface Classroom {
  id: string;
  owner_teacher_id: string;
  name: string;
  course: string;
  batch: string;
  department: string;
  academic_year: string;
  section: string;
  join_code: string;
  join_code_hash: string;
  archived_at: string | null;
  created_at: string;
  updated_at: string;
  // Computed / aggregated
  enrolled_count?: number;
  last_scan_at?: string | null;
  last_scan_status?: string | null;
}

export interface ClassroomMembership {
  id: string;
  classroom_id: string;
  student_id: string;
  joined_at: string;
  membership_status: 'enrolled' | 'dropped' | 'pending';
}

export type PlatformType = 'leetcode' | 'codechef';

export interface PlatformAccount {
  id: string;
  student_id: string;
  platform: PlatformType;
  username: string;
  normalized_username: string;
  public_profile_url: string;
  ownership_verification_status: 'unverified' | 'linked_public_profile' | 'verified_owner';
  linked_at: string;
  last_successful_sync_at: string | null;
  account_status: 'active' | 'unverified' | 'error' | 'rate_limited' | 'not_found';
}

export interface PlatformProfileSnapshot {
  id: string;
  platform_account_id: string;
  scan_job_id: string | null;
  total_solved: number;
  easy_solved: number | null;
  medium_solved: number | null;
  hard_solved: number | null;
  total_questions: number | null;
  total_submissions: number | null;
  accepted_submissions: number | null;
  acceptance_rate: number | null;
  global_rank: number | null;
  country_rank: number | null;
  contest_rating: number | null;
  highest_rating: number | null;
  highest_score: number | null;
  contests_attended: number | null;
  source: string;
  source_version: string;
  validation_status: 'valid' | 'partial' | 'invalid';
  available_fields: string[];
  unavailable_fields: string[];
  raw_data?: any;
  observed_at: string;
}

export interface DailyActivitySnapshot {
  id: string;
  platform_account_id: string;
  activity_date: string; // YYYY-MM-DD
  submission_count: number;
  accepted_submission_count: number | null;
  activity_status: 'active' | 'no_activity' | 'unknown' | 'stale';
  source_coverage: string;
  observed_at: string;
}

export interface ContestRecord {
  id: string;
  platform_account_id: string;
  platform_contest_id: string | null;
  contest_name: string;
  contest_date: string;
  participation_status: 'attended' | 'not_attended' | 'upcoming' | 'pending_verification' | 'unknown';
  rank: number | null;
  score: number | null;
  problems_solved: number | null;
  total_problems: number | null;
  rating_before: number | null;
  rating_after: number | null;
  evidence_source: string;
  data_availability_status: string;
  observed_at: string;
}

export type ContestStatus = 'upcoming' | 'live' | 'completed';
export type ContestScanStatus = 'not_started' | 'scheduled' | 'scanning' | 'completed' | 'retrying' | 'failed';

export interface Contest {
  id: string;
  platform: PlatformType;
  contest_code: string;
  title: string;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  status: ContestStatus;
  card_image_url?: string | null;
  scan_status: ContestScanStatus;
  last_scanned_at?: string | null;
  scan_message?: string | null;
  retry_count: number;
  created_at: string;
  updated_at: string;
  // Computed / joined counts for classroom
  linked_accounts_count?: number;
  attended_count?: number;
  not_attended_count?: number;
  pending_verification_count?: number;
}

export interface StudentContestAttendanceRow {
  student_id: string;
  student_name: string;
  register_number: string | null;
  username: string;
  public_profile_url: string;
  platform: PlatformType;
  verification_status: string;
  account_status: string;
  participation_status: 'attended' | 'not_attended' | 'pending_verification';
  contest_problems_solved: number | null;
  contest_total_problems: number | null;
  contest_rank: number | null;
  contest_rating_after: number | null;
  lifetime_total_solved: number | null;
  easy_solved: number | null;
  medium_solved: number | null;
  hard_solved: number | null;
  accepted_submissions: number | null;
  acceptance_rate: number | null;
  contest_rating: number | null;
  highest_rating: number | null;
  profile_rank: number | null;
  country_rank: number | null;
  last_sync: string | null;
}


export interface ScanJob {
  id: string;
  classroom_id: string | null;
  requested_by: string;
  selected_platforms: 'all' | 'leetcode' | 'codechef';
  requested_scope: 'classroom' | 'student';
  target_student_id: string | null;
  status: 'queued' | 'running' | 'succeeded' | 'partial' | 'failed' | 'cancelled';
  total_accounts: number;
  processed_accounts: number;
  successful_accounts: number;
  partial_accounts: number;
  failed_accounts: number;
  error_summary: string | null;
  created_at: string;
  started_at: string | null;
  completed_at: string | null;
}

export interface ScanJobItem {
  id: string;
  scan_job_id: string;
  platform_account_id: string;
  platform: PlatformType;
  status: 'queued' | 'running' | 'succeeded' | 'partial' | 'failed';
  fields_retrieved: string[] | null;
  missing_fields: string[] | null;
  error_code: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
}

export interface AuditLog {
  id: string;
  user_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: any;
  created_at: string;
}

// Connector extraction response contract
export interface ExtractionResult<T> {
  success: boolean;
  data: T | null;
  availableFields: string[];
  unavailableFields: string[];
  source: string;
  observedAt: string;
  errorCode: string | null;
  errorMessage: string | null;
}

export interface LeetCodeExtractedData {
  username: string;
  realName: string | null;
  ranking: number | null;
  totalSolved: number;
  easySolved: number;
  mediumSolved: number;
  hardSolved: number;
  totalQuestions: number | null;
  totalSubmissions: number;
  acceptedSubmissions: number;
  acceptanceRate: number | null;
  attendedContestsCount: number;
  contestRating: number | null;
  contestGlobalRanking: number | null;
  contestTopPercentage: number | null;
  contestBadge: string | null;
  contestHistory: {
    title: string;
    startTime: number;
    rating: number;
    ranking: number;
    problemsSolved: number;
    totalProblems: number;
  }[];
  recentSubmissions: {
    title: string;
    timestamp: string;
    statusDisplay: string;
    lang: string;
  }[];
  submissionCalendar: Record<string, number>;
  dailyActivityAsiaKolkata: {
    todayDate: string;
    todaySubmissions: number;
    yesterdayDate: string;
    yesterdaySubmissions: number;
  };
}

export interface CodeChefExtractedData {
  username: string;
  name: string | null;
  currentRating: number | null;
  highestRating: number | null;
  stars: string | null;
  globalRank: number | null;
  countryRank: number | null;
  totalSolved: number | null;
  totalContests: number;
  contestHistory: {
    code: string;
    name: string;
    date: string;
    rating: number | null;
    rank: number | null;
    color: string | null;
  }[];
  highestRatingInHistory: number | null;
  dailySubmissions: { date: string; value: number }[];
  dailyActivityAsiaKolkata: {
    todayDate: string;
    todaySubmissions: number;
    yesterdayDate: string;
    yesterdaySubmissions: number;
  };
}

export interface StudentPerformanceOverview {
  student: UserProfile;
  leetcodeAccount: PlatformAccount | null;
  codechefAccount: PlatformAccount | null;
  leetcodeSnapshot: PlatformProfileSnapshot | null;
  codechefSnapshot: PlatformProfileSnapshot | null;
  leetcodeTodayActivity: DailyActivitySnapshot | null;
  codechefTodayActivity: DailyActivitySnapshot | null;
  leetcodeYesterdayActivity: DailyActivitySnapshot | null;
  codechefYesterdayActivity: DailyActivitySnapshot | null;
  leetcodeLatestContest: ContestRecord | null;
  codechefLatestContest: ContestRecord | null;
}
