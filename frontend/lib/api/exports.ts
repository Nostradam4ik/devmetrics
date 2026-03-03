import { getAccessToken } from '@/lib/auth';

const ANALYTICS_BASE =
  process.env.NEXT_PUBLIC_ANALYTICS_API_URL ?? 'http://localhost:8003';

export interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  days: number;
  sections: string[];
}

export interface ScheduleReportPayload {
  organization_id: string;
  recipients: string[];
  report_title?: string;
  days?: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function buildParams(
  orgId: string,
  startDate?: string,
  endDate?: string,
  extra?: Record<string, string>
): URLSearchParams {
  const p = new URLSearchParams({ organization_id: orgId });
  if (startDate) p.append('start_date', startDate);
  if (endDate) p.append('end_date', endDate);
  if (extra) Object.entries(extra).forEach(([k, v]) => p.append(k, v));
  return p;
}

/** Trigger a browser download for a blob response. */
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

async function authenticatedFetch(url: string, options?: RequestInit): Promise<Response> {
  const token = getAccessToken();
  return fetch(url, {
    ...options,
    headers: {
      ...(options?.headers ?? {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

// ---------------------------------------------------------------------------
// Export API
// ---------------------------------------------------------------------------

export const exportsAPI = {
  /** Download PDF team report */
  downloadTeamPDF: async (
    orgId: string,
    startDate?: string,
    endDate?: string,
    reportTitle?: string
  ): Promise<void> => {
    const params = buildParams(orgId, startDate, endDate);
    if (reportTitle) params.append('report_title', reportTitle);

    const res = await authenticatedFetch(
      `${ANALYTICS_BASE}/api/v1/exports/pdf/team?${params}`
    );
    if (!res.ok) throw new Error(`PDF export failed: ${res.statusText}`);

    const blob = await res.blob();
    const start = startDate?.replace(/-/g, '') ?? 'start';
    const end = endDate?.replace(/-/g, '') ?? 'end';
    downloadBlob(blob, `devmetrics-report-${start}-${end}.pdf`);
  },

  /** Download CSV team metrics */
  downloadTeamCSV: async (
    orgId: string,
    startDate?: string,
    endDate?: string
  ): Promise<void> => {
    const params = buildParams(orgId, startDate, endDate);
    const res = await authenticatedFetch(
      `${ANALYTICS_BASE}/api/v1/exports/csv/team?${params}`
    );
    if (!res.ok) throw new Error(`CSV export failed: ${res.statusText}`);

    const blob = await res.blob();
    const start = startDate?.replace(/-/g, '') ?? 'start';
    downloadBlob(blob, `devmetrics-team-${start}.csv`);
  },

  /** Download CSV time series */
  downloadTimeseriesCSV: async (
    orgId: string,
    metricType: string,
    startDate?: string,
    endDate?: string
  ): Promise<void> => {
    const params = buildParams(orgId, startDate, endDate, { metric_type: metricType });
    const res = await authenticatedFetch(
      `${ANALYTICS_BASE}/api/v1/exports/csv/timeseries?${params}`
    );
    if (!res.ok) throw new Error(`CSV export failed: ${res.statusText}`);

    const blob = await res.blob();
    const start = startDate?.replace(/-/g, '') ?? 'start';
    downloadBlob(blob, `devmetrics-${metricType}-${start}.csv`);
  },

  /** Send report by email immediately */
  sendEmailReport: async (payload: ScheduleReportPayload): Promise<{ success: boolean; message: string }> => {
    const token = getAccessToken();
    const res = await fetch(`${ANALYTICS_BASE}/api/v1/exports/email/send-now`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error(`Email report failed: ${res.statusText}`);
    return res.json();
  },

  /** List report templates */
  getTemplates: async (): Promise<{ templates: ReportTemplate[] }> => {
    const res = await authenticatedFetch(
      `${ANALYTICS_BASE}/api/v1/exports/templates`
    );
    if (!res.ok) throw new Error('Failed to fetch templates');
    return res.json();
  },
};
