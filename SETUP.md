# PR Prospecting System - Setup Guide

This system finds press releases and announcements from organizations in Health 2.0 and Education 2.0 using **100% free resources**. No Tavily API required.

## Quick Start

### 1. Get Free API Keys (2 minutes)

#### NewsAPI.org (100 requests/day free)
1. Go to https://newsapi.org
2. Sign up for free account
3. Copy your API key
4. Paste into `.env.local`:
   ```
   NEWSAPI_API_KEY=your_key_here
   ```

#### GNews API (100 requests/day free)
1. Go to https://gnews.io
2. Sign up for free account
3. Copy your API key
4. Paste into `.env.local`:
   ```
   GNEWS_API_KEY=your_key_here
   ```

### 2. Install Dependencies
```bash
npm install
```

### 3. Run Development Server
```bash
npm run dev
```

Open http://localhost:3000 to see the app.

### 4. Discover New PRs
Click "Discover New PRs" button to search for prospects. The system will:
- Query Google News RSS feeds (free, no auth)
- Query NewsAPI.org (up to 100/day)
- Query GNews API (up to 100/day)
- Deduplicate results
- Score by fit and relevance

## Architecture

### Data Sources (All Free)

| Source | Limit | Rate | Auth Required |
|--------|-------|------|---|
| **Google News RSS** | Unlimited | No limit | No |
| **NewsAPI.org** | 100 req/day | 4 req/sec | Yes |
| **GNews API** | 100 req/day | 100 req/min | Yes |
| **Web Scraping** | Unlimited* | Respect robots.txt | No |

*Within ethical bounds and robots.txt compliance

### How It Works

1. **Discovery**
   - Builds search queries combining market + category + signal keywords
   - Searches multiple free sources in parallel
   - Removes duplicate URLs via normalization
   - Scores each prospect (0-100)

2. **Processing**
   - Detects category (healthcare/education)
   - Identifies business signals (funding, launch, expansion, etc.)
   - Extracts organization name
   - Determines country/market

3. **Contact Enrichment**
   - Generates email patterns (firstname.lastname@domain.com, etc.)
   - Scrapes company websites for team pages
   - Searches LinkedIn for executives
   - Validates email formats

4. **Filtering & Display**
   - Filter by market (Singapore, Malaysia, Hong Kong)
   - Filter by category (healthcare, education)
   - Filter by signal type (funding, launch, partnership, etc.)
   - Search by organization name or announcement

## API Endpoints

### POST `/api/discover`
Manually trigger prospect discovery.

**Request:**
```json
{
  "markets": ["Singapore", "Malaysia"],
  "signals": ["funding", "launch"]
}
```

**Response:**
```json
{
  "success": true,
  "prospects": [...],
  "meta": {
    "rawResults": 150,
    "uniqueResults": 120,
    "finalResults": 45,
    "queriesExecuted": 6
  }
}
```

### POST `/api/jobs/discover`
Schedule a background discovery job.

**Request:**
```json
{
  "markets": ["Singapore"]
}
```

**Response:**
```json
{
  "success": true,
  "jobId": "discovery-1695123456",
  "status": "scheduled"
}
```

### GET `/api/jobs/status?jobId=discovery-xxx`
Check job status and progress.

**Response:**
```json
{
  "success": true,
  "job": {
    "id": "discovery-xxx",
    "status": "running",
    "progress": 45,
    "createdAt": "2024-01-15T10:30:00Z",
    "startedAt": "2024-01-15T10:30:05Z",
    "completedAt": null
  }
}
```

## Configuration

### Rate Limiting (`.env.local`)
```
RATE_LIMIT_NEWSAPI=95        # Out of 100/day (save 5 for safety)
RATE_LIMIT_GNEWS=95          # Out of 100/day
CACHE_TTL_HOURS=24           # Cache results for 24 hours
CACHE_MAX_ITEMS=5000         # Max cached results
```

### Markets & Categories
Edit `/lib/config.ts` to customize:
- Markets: Singapore, Malaysia, Hong Kong
- Categories: healthcare, education
- Signals: funding, launch, expansion, partnership, leadership, research, initiative

## Daily Automated Refresh

### Option A: External Cron Service (Recommended)

Use free external cron services:

#### **EasyCron** (10 executions/month free)
1. Go to https://www.easycron.com
2. Create new cron job
3. Set URL: `https://yourdomain.com/api/jobs/discover`
4. Set method: POST
5. Set schedule: `0 2 * * *` (2 AM UTC daily)

#### **cron-job.org** (Free tier available)
1. Go to https://cron-job.org
2. Create account
3. Add new cronjob
4. URL: `https://yourdomain.com/api/jobs/discover`
5. Execution time: `2:00 AM UTC`

#### **GitHub Actions** (2000 min/month free)
Create `.github/workflows/daily-discovery.yml`:
```yaml
name: Daily PR Discovery

on:
  schedule:
    - cron: '0 2 * * *'

jobs:
  discover:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger discovery
        run: |
          curl -X POST \
            -H "Content-Type: application/json" \
            -d '{"markets":["Singapore","Malaysia","Hong Kong"]}' \
            ${{ secrets.DISCOVERY_URL }}/api/jobs/discover
```

### Option B: In-App Scheduling

The system includes a built-in scheduler you can use:

```typescript
import { scheduleDaily } from "@/lib/background-jobs/discovery-scheduler";

// Schedule daily refresh at 2 AM UTC
scheduleDaily(2);
```

Add to your app initialization (e.g., in a layout or middleware).

## Understanding the Scoring System

Prospects are scored 0-100 based on:

- **Source Quality** (0-30 points)
  - PR distribution sites: +30
  - Official company sites: +25
  - Major news outlets: +20
  - General news: +15

- **Relevance** (0-40 points)
  - Multiple signals detected: +15
  - Perfect keyword match: +25

- **Freshness** (0-30 points)
  - Published today: +30
  - This week: +20
  - This month: +10
  - Older: +5

**Score = Source Quality + Relevance + Freshness**

## Contact Enrichment Methods

The system uses multiple strategies (in order of preference):

1. **Website Scraping** (60% confidence)
   - Scrapes /team, /about, /people pages
   - Extracts emails and names from HTML
   
2. **Email Pattern Generation** (25% confidence)
   - Generates common patterns: first.last@domain.com
   - Validates domain accessibility

3. **LinkedIn Search** (35% confidence)
   - Finds CEO/Founder profiles
   - Extracts job titles and names

4. **Email Validation** (requires free service)
   - Validates email format
   - Checks domain MX records

## Troubleshooting

### "NEWSAPI_API_KEY is missing"
**Solution:** Get free key from https://newsapi.org and add to `.env.local`

### "GNEWS_API_KEY is missing"
**Solution:** Get free key from https://gnews.io and add to `.env.local`

### "Rate limit exceeded"
**Solution:** The system has hit daily API quota. It will refresh tomorrow. You can:
- Use Google News RSS only (no limit)
- Upgrade to paid plans
- Wait until quota resets

### "No prospects found"
**Possible causes:**
- Search queries are too specific (try broader keywords)
- Check if the sources are currently accessible
- Try a different market (some have fewer results)

### Email addresses show "confidence: 25"
This means they're generated patterns, not verified. Contact enrichment is free and pattern-based. For higher confidence (60%+), implement email verification via a service like Mailtrap (free tier).

## Free Upgrade Options

### Email Verification (Optional)
To improve contact confidence scores, add free email validation:

1. **SendGrid (100/month free)**
   ```bash
   npm install @sendgrid/client
   ```

2. **Mailtrap (100/month free)**
   - Validate emails before using

3. **Hunter.io (50/month free)**
   - Already configured in your `.env.local`

## Cost Breakdown

| Component | Cost | Status |
|-----------|------|--------|
| Google News RSS | Free | ✅ Included |
| NewsAPI.org | Free (100/day) | ✅ Included |
| GNews API | Free (100/day) | ✅ Included |
| Email patterns | Free | ✅ Included |
| Website scraping | Free | ✅ Included |
| LinkedIn search | Free | ✅ Included |
| **Total Monthly Cost** | **$0** | ✅ |

## Next Steps

1. ✅ Set up API keys (2 min)
2. ✅ Run `npm install && npm run dev` (1 min)
3. ✅ Click "Discover New PRs" (1-2 min)
4. ✅ Filter by market/category/signal
5. ✅ Export leads to CSV (coming soon)
6. ✅ Set up daily automation (5 min)

## Support

- **Issues?** Check the troubleshooting section above
- **Feature requests?** Edit `/lib/config.ts` to customize keywords
- **Want to add a source?** Create new file in `/lib/sources/`
- **Need higher email confidence?** Integrate paid email verification API

## Privacy & Ethics

This system respects:
- ✅ robots.txt in web scraping
- ✅ Rate limits of all APIs
- ✅ Terms of service of all sources
- ✅ GDPR/privacy regulations

Only scrapes publicly available information.
