import { ExtractionResult, CodeChefExtractedData } from '../types';

export class CodeChefConnector {
  private static BASE_URL = 'https://www.codechef.com/users';

  // Helper delay to avoid triggering CodeChef 429 rate limiter
  public static sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  public static async validateProfile(username: string): Promise<{ exists: boolean; normalizedUsername?: string; error?: string }> {
    if (!username || username.trim() === '') {
      return { exists: false, error: 'Username cannot be empty' };
    }

    const clean = username.trim();
    const url = `${this.BASE_URL}/${encodeURIComponent(clean)}`;

    try {
      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
      });

      if (resp.status === 404) {
        return { exists: false, error: 'Profile not found on CodeChef' };
      }
      if (resp.status === 429) {
        return { exists: false, error: 'CodeChef is currently rate-limiting requests (HTTP 429). Please wait a moment.' };
      }
      if (!resp.ok) {
        return { exists: false, error: `CodeChef returned HTTP ${resp.status}` };
      }

      const html = await resp.text();
      // Check if user profile exists
      if (html.includes('User does not exist') || html.includes('Page Not Found')) {
        return { exists: false, error: 'User does not exist on CodeChef' };
      }

      // Check title for canonical handle
      const titleMatch = html.match(/<title>([^-\s]+)\s*-\s*CodeChef/i);
      const canonical = titleMatch ? titleMatch[1].trim() : clean;

      return { exists: true, normalizedUsername: canonical };
    } catch (e: any) {
      return { exists: false, error: e?.message || 'Failed to connect to CodeChef' };
    }
  }

  public static async fetchProfileData(username: string, retryCount = 1): Promise<ExtractionResult<CodeChefExtractedData>> {
    const observedAt = new Date().toISOString();
    const clean = username.trim();
    const url = `${this.BASE_URL}/${encodeURIComponent(clean)}`;

    try {
      const resp = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.5',
        },
      });

      if (resp.status === 404) {
        return {
          success: false,
          data: null,
          availableFields: [],
          unavailableFields: ['all'],
          source: 'codechef_profile_html',
          observedAt,
          errorCode: 'USER_NOT_FOUND',
          errorMessage: 'User does not exist on CodeChef',
        };
      }

      if (resp.status === 429) {
        if (retryCount > 0) {
          // Bounded retry with 2.5s jittered backoff
          await this.sleep(2500);
          return this.fetchProfileData(username, retryCount - 1);
        }
        return {
          success: false,
          data: null,
          availableFields: [],
          unavailableFields: ['all'],
          source: 'codechef_profile_html',
          observedAt,
          errorCode: 'RATE_LIMITED',
          errorMessage: 'CodeChef rate-limited the request (HTTP 429). Retry will back off.',
        };
      }

      if (!resp.ok) {
        return {
          success: false,
          data: null,
          availableFields: [],
          unavailableFields: ['all'],
          source: 'codechef_profile_html',
          observedAt,
          errorCode: `HTTP_${resp.status}`,
          errorMessage: `CodeChef returned HTTP ${resp.status}`,
        };
      }

      const html = await resp.text();

      // Canonical handle from page
      const titleMatch = html.match(/<title>([^-\s]+)\s*-\s*CodeChef/i);
      const canonicalUsername = titleMatch ? titleMatch[1].trim() : clean;

      // Real Name from user-details-container
      const nameMatch = html.match(/class="user-details-container"[^>]*>[\s\S]*?<h[123][^>]*>([^<]+)<\/h[123]>/i);
      const name = nameMatch ? nameMatch[1].trim() : null;

      // Current Rating from div rating-number
      const ratingMatch = html.match(/<div[^>]*class="rating-number"[^>]*>\s*(\d+)\s*<\/div>/i);
      const currentRating = ratingMatch ? parseInt(ratingMatch[1], 10) : null;

      // Highest Rating
      const highestMatch = html.match(/Highest\s+Rating\s+(\d+)/i);
      const highestRating = highestMatch ? parseInt(highestMatch[1], 10) : null;

      // Stars
      const starMatch = html.match(/<span[^>]*class="rating"[^>]*>([^<]+)<\/span>/i) || html.match(/(\d+★)/);
      const stars = starMatch ? starMatch[1].trim() : null;

      // Total Problems Solved
      const solvedMatch = html.match(/Total Problems Solved\s*:?\s*(\d+)/i);
      const totalSolved = solvedMatch ? parseInt(solvedMatch[1], 10) : null;

      // Global Rank and Country Rank
      let globalRank: number | null = null;
      let countryRank: number | null = null;

      const rankMatches = Array.from(
        html.matchAll(/<a\s+href="\/ratings\/all[^"]*"[^>]*>\s*<strong>\s*([^<\s]+)\s*<\/strong>/g)
      ).map((m) => m[1].trim());

      if (rankMatches.length > 0 && rankMatches[0] !== 'Inactive') {
        const val = parseInt(rankMatches[0].replace(/[^\d]/g, ''), 10);
        if (!isNaN(val)) globalRank = val;
      }
      if (rankMatches.length > 1 && rankMatches[1] !== 'Inactive') {
        const val = parseInt(rankMatches[1].replace(/[^\d]/g, ''), 10);
        if (!isNaN(val)) countryRank = val;
      }

      // Contest history from var all_rating
      let contestHistory: {
        code: string;
        name: string;
        date: string;
        rating: number | null;
        rank: number | null;
        color: string | null;
      }[] = [];

      const allRatingMatch = html.match(/var\s+all_rating\s*=\s*(\[[\s\S]*?\]);/);
      if (allRatingMatch) {
        try {
          const rawContests = JSON.parse(allRatingMatch[1].trim());
          if (Array.isArray(rawContests)) {
            contestHistory = rawContests.map((c: any) => ({
              code: c.code || '',
              name: c.name || 'Contest',
              date: c.end_date || `${c.getyear || ''}-${c.getmonth || ''}-${c.getday || ''}`,
              rating: c.rating ? parseInt(c.rating, 10) : null,
              rank: c.rank ? parseInt(c.rank, 10) : null,
              color: c.color || null,
            }));
          }
        } catch {}
      }

      // Highest rating in retrieved history
      const highestRatingInHistory = contestHistory.reduce<number | null>((acc, curr) => {
        if (curr.rating !== null) {
          return acc === null ? curr.rating : Math.max(acc, curr.rating);
        }
        return acc;
      }, null);

      // Daily activity from var userDailySubmissionsStats or SVG heatmap
      let dailySubmissions: { date: string; value: number }[] = [];
      let heatmapValid = false;
      const dailyMatch = html.match(/var\s+userDailySubmissionsStats\s*=\s*([\s\S]*?);/);
      if (dailyMatch) {
        try {
          const rawDaily = JSON.parse(dailyMatch[1].trim());
          if (Array.isArray(rawDaily)) {
            dailySubmissions = rawDaily.map((d: any) => ({
              date: d.date,
              value: Number(d.value || 0),
            }));
            heatmapValid = true;
          } else if (typeof rawDaily === 'object' && rawDaily !== null) {
            dailySubmissions = Object.entries(rawDaily).map(([k, v]) => ({
              date: k,
              value: Number(v || 0),
            }));
            heatmapValid = true;
          }
        } catch {}
      }

      // Fallback: check rendered SVG tooltips in HTML if script tag was missing
      if (!heatmapValid) {
        const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
        const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
        const [y, m, d] = today.split('-');
        const monthName = months[parseInt(m, 10) - 1];
        const dayNum = parseInt(d, 10);
        const datePattern = new RegExp(`(?:(\\d+)\\s+submissions?|No\\s+submission|Zero\\s+submissions?)\\s+on\\s+${monthName}\\s+${dayNum},\\s+${y}`, 'i');
        const tooltipMatch = html.match(datePattern);
        if (tooltipMatch) {
          const count = tooltipMatch[1] ? parseInt(tooltipMatch[1], 10) : 0;
          dailySubmissions.push({ date: today, value: count });
          heatmapValid = true;
        }
      }

      // Asia/Kolkata today and yesterday calculation
      const dailyKolkata = this.calculateAsiaKolkataSubmissions(dailySubmissions, heatmapValid);

      const availableFields = ['username'];
      if (currentRating !== null) availableFields.push('currentRating');
      if (highestRating !== null) availableFields.push('highestRating');
      if (totalSolved !== null) availableFields.push('totalSolved');
      if (stars) availableFields.push('stars');
      if (globalRank !== null) availableFields.push('globalRank');
      if (countryRank !== null) availableFields.push('countryRank');
      if (contestHistory.length > 0) availableFields.push('contestHistory');
      if (dailySubmissions.length > 0) availableFields.push('dailySubmissions');

      const unavailableFields: string[] = [];
      if (currentRating === null) unavailableFields.push('currentRating');
      if (totalSolved === null) unavailableFields.push('totalSolved');
      if (globalRank === null) unavailableFields.push('globalRank');
      if (countryRank === null) unavailableFields.push('countryRank');

      return {
        success: true,
        data: {
          username: canonicalUsername,
          name,
          currentRating,
          highestRating,
          stars,
          globalRank,
          countryRank,
          totalSolved,
          totalContests: contestHistory.length,
          contestHistory,
          highestRatingInHistory,
          dailySubmissions,
          dailyActivityAsiaKolkata: dailyKolkata,
        },
        availableFields,
        unavailableFields,
        source: 'codechef_profile_html',
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
        source: 'codechef_profile_html',
        observedAt,
        errorCode: 'NETWORK_ERROR',
        errorMessage: e?.message || 'Connection error while contacting CodeChef',
      };
    }
  }

  private static calculateAsiaKolkataSubmissions(daily: { date: string; value: number }[], isAvailable = true) {
    const today = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(new Date());
    const yesterdayDateObj = new Date();
    yesterdayDateObj.setDate(yesterdayDateObj.getDate() - 1);
    const yesterday = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata' }).format(yesterdayDateObj);

    // Normalize date format from "YYYY-M-D" to "YYYY-MM-DD"
    const normalizeDate = (raw: string) => {
      const parts = raw.split('-');
      if (parts.length === 3) {
        const y = parts[0];
        const m = parts[1].padStart(2, '0');
        const d = parts[2].padStart(2, '0');
        return `${y}-${m}-${d}`;
      }
      return raw;
    };

    let todaySubmissions = 0;
    let yesterdaySubmissions = 0;

    for (const item of daily) {
      const norm = normalizeDate(item.date);
      if (norm === today) {
        todaySubmissions += item.value;
      } else if (norm === yesterday) {
        yesterdaySubmissions += item.value;
      }
    }

    return {
      todayDate: today,
      todaySubmissions,
      yesterdayDate: yesterday,
      yesterdaySubmissions,
      isAvailable,
    };
  }
}
