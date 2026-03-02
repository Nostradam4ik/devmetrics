WEEKLY_REPORT_SYSTEM_PROMPT = """You are an expert engineering productivity analyst creating weekly team reports.
Generate a comprehensive but concise weekly report that highlights achievements, concerns, and recommendations.
Format the output in Markdown."""

WEEKLY_REPORT_TEMPLATE = """Generate a weekly report for the development team based on these metrics:

## Team Overview
- Team Size: {team_size}
- Active Members: {active_developers}
- Period: {start_date} to {end_date}

## Activity Metrics
### Commits
- Total: {total_commits}
- Lines Added: {additions}
- Lines Deleted: {deletions}
- Average per Developer: {avg_commits_per_dev}

### Pull Requests
- Created: {prs_created}
- Merged: {prs_merged}
- Merge Rate: {merge_rate}%
- Average Cycle Time: {avg_cycle_time} hours

### Code Review
- Reviews Given: {reviews_given}
- Average Review Time: {avg_review_time} hours

## Top Performers
{top_performers}

Please provide:
1. **Executive Summary** (2-3 sentences)
2. **Key Achievements** (3-4 bullet points)
3. **Areas of Concern** (2-3 bullet points)
4. **Recommendations** (3-4 actionable items)
5. **Outlook** (brief forward-looking statement)"""

BOTTLENECK_DETECTION_PROMPT = """Analyze the following metrics to identify potential bottlenecks:

PR Cycle Times:
{pr_cycle_times}

Review Times:
{review_times}

Commit Patterns:
{commit_patterns}

Identify:
1. What bottlenecks exist?
2. What is causing them?
3. How to resolve them?

Be specific and actionable. Format in Markdown."""

CODE_QUALITY_ANALYSIS_PROMPT = """Analyze code quality indicators:

Code Churn: {code_churn}
Average PR Size: {avg_pr_size} lines
Test Coverage Delta: {test_coverage_change}%
Bug Fix Rate: {bug_fix_rate}%

Assess:
1. Overall code quality trend
2. Risk areas
3. Quality improvement suggestions"""
