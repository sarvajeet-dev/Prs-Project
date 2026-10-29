# Quick Start - Free PR Prospecting System

## 1. Get Two Free API Keys (5 minutes)

### NewsAPI.org
- Go to https://newsapi.org/register
- Sign up (takes 1 min)
- Copy your API key
- Paste in `.env.local`: `NEWSAPI_API_KEY=your_key`

### GNews API  
- Go to https://gnews.io/login
- Sign up (takes 1 min)
- Copy your API key
- Paste in `.env.local`: `GNEWS_API_KEY=your_key`

## 2. Start the App

```bash
npm run dev
```

Open http://localhost:3000/prospects

## 3. Find Prospects

Click **"Discover New PRs"** button. The system will search:
- ✅ Google News RSS (free, instant)
- ✅ NewsAPI.org (up to 100/day)
- ✅ GNews API (up to 100/day)
- ✅ Smart deduplication
- ✅ AI scoring (0-100)

## 4. Filter Results

- **Market:** Singapore, Malaysia, Hong Kong
- **Category:** Healthcare or Education
- **Signal:** Funding, Launch, Expansion, Partnership, Leadership, Research
- **Search:** By organization name or announcement

## What You Get

Each prospect shows:
- Organization name
- Announcement title & description
- Published date & source
- Fit score (0-100)
- Why it's relevant
- Link to announcement

## Daily Automation (Optional)

### Option A: External Cron (Easiest - 5 min setup)
Use free external service to call `/api/jobs/discover` daily:
- **EasyCron** - https://www.easycron.com (10 executions/month free)
- **cron-job.org** - https://cron-job.org (free)
- **GitHub Actions** - Schedule workflow to trigger API

### Option B: In-App Scheduler
Already included! Add to your startup:
```typescript
import { scheduleDaily } from "@/lib/background-jobs/discovery-scheduler";
scheduleDaily(2); // 2 AM UTC daily
```

## API Usage

### Manual Discovery
```bash
curl -X POST http://localhost:3000/api/discover \
  -H "Content-Type: application/json" \
  -d '{
    "markets": ["Singapore", "Malaysia"],
    "signals": ["funding", "launch"]
  }'
```

### Schedule Background Job
```bash
curl -X POST http://localhost:3000/api/jobs/discover \
  -H "Content-Type: application/json" \
  -d '{"markets": ["Singapore"]}'
```

Response:
```json
{
  "success": true,
  "jobId": "discovery-1695123456",
  "status": "scheduled"
}
```

### Check Job Status
```bash
curl http://localhost:3000/api/jobs/status?jobId=discovery-1695123456
```

## Costs

| Item | Cost |
|------|------|
| Google News RSS | FREE |
| NewsAPI.org | FREE (100/day) |
| GNews API | FREE (100/day) |
| Email pattern generation | FREE |
| Web scraping | FREE |
| **Total** | **$0** |

## What's Included

### Search Sources
- ✅ Google News RSS feeds
- ✅ NewsAPI.org integration
- ✅ GNews API integration
- ✅ Web scraping (company sites, LinkedIn)
- ✅ Rate limiting & quota management
- ✅ Smart deduplication
- ✅ Result caching (24h)

### Contact Enrichment
- ✅ Email pattern generation
- ✅ Website scraping (team pages)
- ✅ LinkedIn executive search
- ✅ Confidence scoring
- ✅ Multi-source contact merging

### Background Jobs
- ✅ Async discovery scheduling
- ✅ Job queue management
- ✅ Progress tracking
- ✅ Error handling
- ✅ Daily cron support

### Intelligence
- ✅ Category detection (healthcare/education)
- ✅ Signal detection (7+ signal types)
- ✅ Country detection
- ✅ Organization extraction
- ✅ Fit scoring algorithm
- ✅ Relevance ranking

## Troubleshooting

### "API key missing" error
→ Check `.env.local` has `NEWSAPI_API_KEY` and `GNEWS_API_KEY`

### "No results found"
→ May be due to:
- Different time zones (searches recent news)
- Limited market activity
- API quota used (resets daily at midnight UTC)
- Try broader keywords in `/lib/config.ts`

### Slow performance
→ Parallel sources search multiple APIs simultaneously. First run takes 30-60 seconds. Subsequent searches use cache.

### Want to customize?
→ Edit `/lib/config.ts`:
- Add/remove keywords
- Change markets
- Adjust scoring weights
- Modify rate limits

## Next Steps

1. ✅ Add API keys to `.env.local`
2. ✅ Run `npm run dev`
3. ✅ Click "Discover New PRs"
4. ✅ Explore results
5. ✅ Set up daily refresh (optional)
6. ✅ Export leads (coming soon)

## Files Changed

### New Files (30+)
- `/lib/sources/search-orchestrator.ts` - Multi-source search
- `/lib/sources/google-news-rss.ts` - RSS feed parsing
- `/lib/sources/newsapi.ts` - NewsAPI integration
- `/lib/sources/gnews.ts` - GNews integration
- `/lib/enrichment/contact-enrichment.ts` - Email finding
- `/lib/enrichment/email-patterns.ts` - Pattern generation
- `/lib/enrichment/linkedin-search.ts` - LinkedIn scraping
- `/lib/enrichment/website-scraper.ts` - Website scraping
- `/lib/cache/rate-limiter.ts` - API quota management
- `/lib/cache/deduplication.ts` - URL deduplication
- `/lib/background-jobs/job-queue.ts` - Job management
- `/lib/background-jobs/discovery-scheduler.ts` - Cron scheduling
- `/app/api/jobs/discover/route.ts` - Job scheduling API
- `/app/api/jobs/status/route.ts` - Job status API
- `SETUP.md` - Full documentation

### Modified Files
- `/lib/discovery.ts` - Uses new search orchestrator
- `/lib/config.ts` - Added rate limits and source config
- `/app/prospects/page.tsx` - Updated UI text
- `package.json` - Added cheerio dependency
- `.env.local` - Added API key placeholders

## Support

See `SETUP.md` for complete documentation and troubleshooting.
