from openai import AsyncOpenAI
from typing import Dict, List, Optional
import os


class GroqService:
    """Service for Groq LLM integration (Llama 3.1 via OpenAI-compatible API)."""

    def __init__(self):
        api_key = os.getenv("GROQ_API_KEY")
        if not api_key:
            raise ValueError("No GROQ_API_KEY found! Set GROQ_API_KEY in .env")

        self.client = AsyncOpenAI(
            api_key=api_key,
            base_url="https://api.groq.com/openai/v1",
        )

        self.model = os.getenv("GROQ_MODEL", "llama-3.1-70b-versatile")
        self.max_tokens = int(os.getenv("GROQ_MAX_TOKENS", "1500"))
        self.temperature = float(os.getenv("GROQ_TEMPERATURE", "0.7"))

    async def generate_completion(
        self,
        prompt: str,
        system_prompt: Optional[str] = None,
        max_tokens: Optional[int] = None,
        temperature: Optional[float] = None,
    ) -> str:
        """Generate text completion from Groq Llama."""
        messages = []

        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        messages.append({"role": "user", "content": prompt})

        response = await self.client.chat.completions.create(
            model=self.model,
            messages=messages,
            max_tokens=max_tokens or self.max_tokens,
            temperature=temperature or self.temperature,
        )

        return response.choices[0].message.content

    async def generate_insights(self, metrics_data: Dict) -> Dict:
        """Generate AI insights from metrics data."""
        system_prompt = (
            "You are an expert engineering productivity analyst. "
            "Analyze the provided team metrics and generate actionable insights. "
            "Focus on identifying trends, bottlenecks, and opportunities for improvement. "
            "Be concise and practical. Respond in Markdown format."
        )

        user_prompt = f"""Analyze these development metrics:

Team Size: {metrics_data.get('team_size', 'N/A')} developers
Active Developers: {metrics_data.get('active_developers', 'N/A')}

Commits:
- Total: {metrics_data.get('commits', {}).get('total', 0)}
- Lines Added: {metrics_data.get('commits', {}).get('additions', 0)}
- Lines Deleted: {metrics_data.get('commits', {}).get('deletions', 0)}

Pull Requests:
- Total: {metrics_data.get('pull_requests', {}).get('total', 0)}
- Merged: {metrics_data.get('pull_requests', {}).get('merged', 0)}
- Merge Rate: {metrics_data.get('pull_requests', {}).get('merge_rate', 0)}%
- Avg Cycle Time: {metrics_data.get('pull_requests', {}).get('avg_cycle_time_hours', 0)} hours

Top Contributors:
{self._format_contributors(metrics_data.get('top_contributors', []))}

Provide:
1. Key observations (2-3 bullet points)
2. Potential bottlenecks (1-2 issues)
3. Actionable recommendations (2-3 suggestions)
"""
        insights_text = await self.generate_completion(user_prompt, system_prompt)

        return {
            "summary": insights_text,
            "model_used": self.model,
        }

    async def generate_weekly_report(self, metrics_data: Dict) -> str:
        """Generate a weekly team report."""
        from app.prompts.templates import (
            WEEKLY_REPORT_SYSTEM_PROMPT,
            WEEKLY_REPORT_TEMPLATE,
        )

        prompt = WEEKLY_REPORT_TEMPLATE.format(
            team_size=metrics_data.get("team_size", "N/A"),
            active_developers=metrics_data.get("active_developers", "N/A"),
            start_date=metrics_data.get("start_date", "N/A"),
            end_date=metrics_data.get("end_date", "N/A"),
            total_commits=metrics_data.get("commits", {}).get("total", 0),
            additions=metrics_data.get("commits", {}).get("additions", 0),
            deletions=metrics_data.get("commits", {}).get("deletions", 0),
            avg_commits_per_dev=metrics_data.get("commits", {}).get(
                "avg_per_developer", 0
            ),
            prs_created=metrics_data.get("pull_requests", {}).get("total", 0),
            prs_merged=metrics_data.get("pull_requests", {}).get("merged", 0),
            merge_rate=metrics_data.get("pull_requests", {}).get("merge_rate", 0),
            avg_cycle_time=metrics_data.get("pull_requests", {}).get(
                "avg_cycle_time_hours", 0
            ),
            reviews_given=metrics_data.get("reviews", {}).get("total", 0),
            avg_review_time=metrics_data.get("reviews", {}).get(
                "avg_review_time_hours", 0
            ),
            top_performers=self._format_contributors(
                metrics_data.get("top_contributors", [])
            ),
        )

        return await self.generate_completion(prompt, WEEKLY_REPORT_SYSTEM_PROMPT)

    async def detect_bottlenecks(self, metrics_data: Dict) -> str:
        """Detect bottlenecks from metrics data."""
        from app.prompts.templates import BOTTLENECK_DETECTION_PROMPT

        prompt = BOTTLENECK_DETECTION_PROMPT.format(
            pr_cycle_times=metrics_data.get("pr_cycle_times", "No data"),
            review_times=metrics_data.get("review_times", "No data"),
            commit_patterns=metrics_data.get("commit_patterns", "No data"),
        )

        return await self.generate_completion(prompt)

    async def answer_query(self, query: str, context_data: Dict) -> str:
        """Answer natural language query about metrics."""
        system_prompt = (
            "You are a helpful assistant that answers questions about development team metrics. "
            "Use the provided context data to answer questions accurately. "
            "If you don't have enough information, say so. Respond in Markdown format."
        )

        user_prompt = f"""Context Data:
{context_data}

User Question: {query}

Provide a clear, concise answer based on the data."""

        return await self.generate_completion(user_prompt, system_prompt)

    def _format_contributors(self, contributors: List[Dict]) -> str:
        """Format contributors list for prompt."""
        if not contributors:
            return "No contributor data available"

        lines = []
        for i, contrib in enumerate(contributors[:5], 1):
            lines.append(
                f"{i}. {contrib.get('github_login', 'unknown')}: "
                f"{contrib.get('commits', 0)} commits, "
                f"+{contrib.get('additions', 0)} lines"
            )
        return "\n".join(lines)


# Singleton instance
groq_service = GroqService()
