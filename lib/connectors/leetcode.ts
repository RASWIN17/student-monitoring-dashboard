import { ExtractionResult, LeetCodeExtractedData } from '../types';

export class LeetCodeConnector {
  private static GRAPHQL_ENDPOINT = 'https://leetcode.com/graphql';

  public static async validateProfile(username: string): Promise<{ exists: boolean; normalizedUsername?: string; error?: string }> {
    if (!username || username.trim() === '') {
      return { exists: false, error: 'Username cannot be empty' };
    }

    const query = `
      query checkUser($username: String!) {
        matchedUser(username: $username) {
          username
        }
      }
    `;

    try {
      const resp = await fetch(this.GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': `https://leetcode.com/${encodeURIComponent(username)}/`,
        },
        body: JSON.stringify({ query, variables: { username: username.trim() } }),
      });

      if (!resp.ok) {
        return { exists: false, error: `LeetCode returned HTTP ${resp.status}` };
      }

      const json = await resp.json();
      if (json.errors || !json.data?.matchedUser) {
        return { exists: false, error: 'Profile not found on LeetCode' };
      }

      return { exists: true, normalizedUsername: json.data.matchedUser.username };
    } catch (e: any) {
      return { exists: false, error: e?.message || 'Network connection failed' };
    }
  }

  public static async fetchProfileData(username: string): Promise<ExtractionResult<LeetCodeExtractedData>> {
    const observedAt = new Date().toISOString();
    const cleanUsername = username.trim();

    const query = `
      query getCompleteUserProfile($username: String!) {
        allQuestionsCount {
          difficulty
          count
        }
        matchedUser(username: $username) {
          username
          profile {
            realName
            ranking
            reputation
          }
          submitStats {
            acSubmissionNum {
              difficulty
              count
              submissions
            }
            totalSubmissionNum {
              difficulty
              count
              submissions
            }
          }
          submissionCalendar
        }
        userContestRanking(username: $username) {
          attendedContestsCount
          rating
          globalRanking
          totalParticipants
          topPercentage
          badge {
            name
          }
        }
        userContestRankingHistory(username: $username) {
          attended
          rating
          ranking
          problemsSolved
          totalProblems
          contest {
            title
            startTime
          }
        }
        recentSubmissionList(username: $username, limit: 20) {
          title
          statusDisplay
          timestamp
          lang
        }
      }
    `;

    try {
      const resp = await fetch(this.GRAPHQL_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': `https://leetcode.com/${encodeURIComponent(cleanUsername)}/`,
        },
        body: JSON.stringify({ query, variables: { username: cleanUsername } }),
      });

      if (!resp.ok) {
        return {
          success: false,
          data: null,
          availableFields: [],
          unavailableFields: ['all'],
          source: 'leetcode_graphql',
          observedAt,
          errorCode: `HTTP_${resp.status}`,
          errorMessage: `LeetCode returned HTTP ${resp.status}`,
        };
      }

      const json = await resp.json();
      if (json.errors || !json.data?.matchedUser) {
        return {
          success: false,
          data: null,
          availableFields: [],
          unavailableFields: ['all'],
          source: 'leetcode_graphql',
          observedAt,
          errorCode: 'USER_NOT_FOUND',
          errorMessage: 'User profile does not exist on LeetCode',
        };
      }

      const matchedUser = json.data.matchedUser;
      const profile = matchedUser.profile || {};
      const submitStats = matchedUser.submitStats || {};
      const acList = submitStats.acSubmissionNum || [];
      const totalList = submitStats.totalSubmissionNum || [];

      const getCount = (list: any[], diff: string) => {
        const item = list.find((x: any) => x.difficulty === diff);
        return item ? Number(item.count) : 0;
      };
      const getSubmissions = (list: any[], diff: string) => {
        const item = list.find((x: any) => x.difficulty === diff);
        return item ? Number(item.submissions) : 0;
      };

      const totalSolved = getCount(acList, 'All');
      const easySolved = getCount(acList, 'Easy');
      const mediumSolved = getCount(acList, 'Medium');
      const hardSolved = getCount(acList, 'Hard');

      const totalSubmissions = getSubmissions(totalList, 'All');
      const acceptedSubmissions = getSubmissions(acList, 'All');
      const acceptanceRate = totalSubmissions > 0 ? Number(((acceptedSubmissions / totalSubmissions) * 100).toFixed(2)) : null;

      // Questions total
      const allQ = json.data.allQuestionsCount || [];
      const totalQuestionsItem = allQ.find((x: any) => x.difficulty === 'All');
      const totalQuestions = totalQuestionsItem ? Number(totalQuestionsItem.count) : null;

      // Contest Ranking
      const contestRanking = json.data.userContestRanking;
      const attendedContestsCount = contestRanking ? Number(contestRanking.attendedContestsCount) : 0;
      const contestRating = contestRanking?.rating ? Number(contestRanking.rating.toFixed(2)) : null;
      const contestGlobalRanking = contestRanking?.globalRanking ? Number(contestRanking.globalRanking) : null;
      const contestTopPercentage = contestRanking?.topPercentage ? Number(contestRanking.topPercentage) : null;
      const contestBadge = contestRanking?.badge?.name || null;

      // Contest History
      const rawHistory = json.data.userContestRankingHistory || [];
      const contestHistory = rawHistory
        .filter((h: any) => h.attended)
        .map((h: any) => ({
          title: h.contest?.title || 'Contest',
          startTime: Number(h.contest?.startTime || 0),
          rating: Number((h.rating || 0).toFixed(2)),
          ranking: Number(h.ranking || 0),
          problemsSolved: Number(h.problemsSolved || 0),
          totalProblems: Number(h.totalProblems || 0),
        }));

      // Recent submissions
      const recentList = json.data.recentSubmissionList || [];
      const recentSubmissions = recentList.map((r: any) => ({
        title: r.title,
        timestamp: r.timestamp,
        statusDisplay: r.statusDisplay,
        lang: r.lang,
      }));

      // Submission calendar
      let submissionCalendar: Record<string, number> = {};
      if (matchedUser.submissionCalendar) {
        try {
          submissionCalendar = typeof matchedUser.submissionCalendar === 'string'
            ? JSON.parse(matchedUser.submissionCalendar)
            : matchedUser.submissionCalendar;
        } catch {}
      }

      // Compute Asia/Kolkata daily submissions
      const dailyKolkata = this.calculateAsiaKolkataSubmissions(submissionCalendar);

      const availableFields = [
        'username',
        'ranking',
        'totalSolved',
        'easySolved',
        'mediumSolved',
        'hardSolved',
        'totalSubmissions',
        'acceptedSubmissions',
        'submissionCalendar',
      ];
      if (profile.realName) availableFields.push('realName');
      if (totalQuestions !== null) availableFields.push('totalQuestions');
      if (acceptanceRate !== null) availableFields.push('acceptanceRate');
      if (contestRating !== null) availableFields.push('contestRating');
      if (contestGlobalRanking !== null) availableFields.push('contestGlobalRanking');
      if (contestBadge) availableFields.push('contestBadge');
      if (contestHistory.length > 0) availableFields.push('contestHistory');

      const unavailableFields: string[] = [];
      if (!profile.realName) unavailableFields.push('realName');
      if (contestRating === null) unavailableFields.push('contestRating');
      if (contestGlobalRanking === null) unavailableFields.push('contestGlobalRanking');

      return {
        success: true,
        data: {
          username: matchedUser.username,
          realName: profile.realName || null,
          ranking: profile.ranking ? Number(profile.ranking) : null,
          totalSolved,
          easySolved,
          mediumSolved,
          hardSolved,
          totalQuestions,
          totalSubmissions,
          acceptedSubmissions,
          acceptanceRate,
          attendedContestsCount,
          contestRating,
          contestGlobalRanking,
          contestTopPercentage,
          contestBadge,
          contestHistory,
          recentSubmissions,
          submissionCalendar,
          dailyActivityAsiaKolkata: dailyKolkata,
        },
        availableFields,
        unavailableFields,
        source: 'leetcode_graphql',
        observedAt,
        errorCode: null,
        errorMessage: null,
      };
    } catch (e: any) {
      return {
        success: false,
        data: null,
        availableFields: [],
        unavailableFields: ['all'],
        source: 'leetcode_graphql',
        observedAt,
        errorCode: 'NETWORK_ERROR',
        errorMessage: e?.message || 'Connection error while contacting LeetCode',
      };
    }
  }

  private static calculateAsiaKolkataSubmissions(calendar: Record<string, number>) {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const yesterdayDateObj = new Date();
    yesterdayDateObj.setDate(yesterdayDateObj.getDate() - 1);
    const yesterday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(yesterdayDateObj);

    let todaySubmissions = 0;
    let yesterdaySubmissions = 0;

    for (const [timestampStr, count] of Object.entries(calendar)) {
      const ts = Number(timestampStr) * 1000;
      const dateKolkata = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date(ts));
      if (dateKolkata === today) {
        todaySubmissions += Number(count);
      } else if (dateKolkata === yesterday) {
        yesterdaySubmissions += Number(count);
      }
    }

    return {
      todayDate: today,
      todaySubmissions,
      yesterdayDate: yesterday,
      yesterdaySubmissions,
    };
  }
}
