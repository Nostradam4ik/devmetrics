'use client';

import { useState } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { exportsAPI, ReportTemplate } from '@/lib/api/exports';
import { useToast } from '@/components/ui/toast';

const ORG_ID = 'demo-org';

const dateRanges = [
  { label: '7 days', days: 7 },
  { label: '14 days', days: 14 },
  { label: '30 days', days: 30 },
  { label: '90 days', days: 90 },
];

function getDateRange(days: number): { start: string; end: string } {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - days);
  return {
    start: start.toISOString().split('T')[0],
    end: end.toISOString().split('T')[0],
  };
}

// ---------------------------------------------------------------------------
// Template Card
// ---------------------------------------------------------------------------

function TemplateCard({
  template,
  onExport,
  isExporting,
}: {
  template: ReportTemplate;
  onExport: (template: ReportTemplate) => void;
  isExporting: boolean;
}) {
  const icons: Record<string, React.ReactNode> = {
    'weekly-team': (
      <svg className="h-5 w-5 text-blue-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <rect x="3" y="4" width="18" height="18" rx="2" ry="2" /><line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" /><line x1="3" y1="10" x2="21" y2="10" />
      </svg>
    ),
    'monthly-executive': (
      <svg className="h-5 w-5 text-purple-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
      </svg>
    ),
    'quarterly-review': (
      <svg className="h-5 w-5 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 3v18h18M9 17V9m4 8V5m4 12v-6" />
      </svg>
    ),
    'sprint-retrospective': (
      <svg className="h-5 w-5 text-orange-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M23 4v6h-6" /><path d="M1 20v-6h6" /><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
      </svg>
    ),
  };

  return (
    <Card className="hover:shadow-md transition-shadow cursor-default">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-gray-50 rounded-lg">
              {icons[template.id] ?? icons['weekly-team']}
            </div>
            <div>
              <CardTitle className="text-sm">{template.name}</CardTitle>
              <CardDescription className="text-xs mt-0.5">
                {template.days}-day window
              </CardDescription>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-xs text-gray-500 mb-4">{template.description}</p>
        <div className="flex flex-wrap gap-1 mb-4">
          {template.sections.map((s) => (
            <span key={s} className="px-2 py-0.5 bg-blue-50 text-blue-700 rounded-full text-xs">
              {s}
            </span>
          ))}
        </div>
        <div className="flex gap-2">
          <Button
            size="sm"
            onClick={() => onExport(template)}
            disabled={isExporting}
            className="flex-1"
          >
            {isExporting ? (
              <svg className="h-3 w-3 animate-spin mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
            ) : (
              <svg className="h-3 w-3 mr-1" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
            )}
            PDF
          </Button>
          <Button size="sm" variant="outline" onClick={() => onExport({ ...template, id: template.id + '-csv' })} disabled={isExporting}>
            CSV
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Custom Report Builder
// ---------------------------------------------------------------------------

function CustomReportBuilder() {
  const { showToast } = useToast();
  const [selectedDays, setSelectedDays] = useState(30);
  const [reportTitle, setReportTitle] = useState('Custom Team Report');
  const [format, setFormat] = useState<'pdf' | 'csv'>('pdf');
  const [isExporting, setIsExporting] = useState(false);

  const handleExport = async () => {
    setIsExporting(true);
    const { start, end } = getDateRange(selectedDays);
    try {
      if (format === 'pdf') {
        await exportsAPI.downloadTeamPDF(ORG_ID, start, end, reportTitle);
        showToast({ type: 'success', title: 'PDF downloaded', message: 'Your report is ready.' });
      } else {
        await exportsAPI.downloadTeamCSV(ORG_ID, start, end);
        showToast({ type: 'success', title: 'CSV downloaded', message: 'Your data export is ready.' });
      }
    } catch {
      showToast({ type: 'error', title: 'Export failed', message: 'Could not generate the report. Backend may be unavailable.' });
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Custom Report</CardTitle>
        <CardDescription>Build a report with your own parameters</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-1.5">
          <Label>Report Title</Label>
          <Input
            value={reportTitle}
            onChange={(e) => setReportTitle(e.target.value)}
            placeholder="Enter report title…"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Time Period</Label>
          <div className="flex gap-2 flex-wrap">
            {dateRanges.map((r) => (
              <Button
                key={r.days}
                size="sm"
                variant={selectedDays === r.days ? 'default' : 'outline'}
                onClick={() => setSelectedDays(r.days)}
              >
                {r.label}
              </Button>
            ))}
          </div>
        </div>

        <div className="space-y-1.5">
          <Label>Format</Label>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={format === 'pdf' ? 'default' : 'outline'}
              onClick={() => setFormat('pdf')}
            >
              <svg className="h-3.5 w-3.5 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
              PDF
            </Button>
            <Button
              size="sm"
              variant={format === 'csv' ? 'default' : 'outline'}
              onClick={() => setFormat('csv')}
            >
              <svg className="h-3.5 w-3.5 mr-1.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
              </svg>
              CSV
            </Button>
          </div>
        </div>

        <Button onClick={handleExport} disabled={isExporting} className="w-full">
          {isExporting ? (
            <>
              <svg className="h-4 w-4 animate-spin mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Generating…
            </>
          ) : (
            <>
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="7 10 12 15 17 10" /><line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Generate &amp; Download
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Email Report Sender
// ---------------------------------------------------------------------------

function EmailReportSender() {
  const { showToast } = useToast();
  const [emails, setEmails] = useState('');
  const [selectedDays, setSelectedDays] = useState(7);
  const [title, setTitle] = useState('Weekly Team Report');

  const sendMutation = useMutation({
    mutationFn: () =>
      exportsAPI.sendEmailReport({
        organization_id: ORG_ID,
        recipients: emails.split(',').map((e) => e.trim()).filter(Boolean),
        report_title: title,
        days: selectedDays,
      }),
    onSuccess: (data) => {
      showToast({ type: 'success', title: 'Report sent!', message: data.message });
      setEmails('');
    },
    onError: () => {
      showToast({ type: 'error', title: 'Failed to send', message: 'Check SMTP settings in the backend.' });
    },
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Send by Email</CardTitle>
        <CardDescription>Send a PDF report directly to team members</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-1.5">
          <Label>Recipients (comma-separated)</Label>
          <Input
            type="text"
            value={emails}
            onChange={(e) => setEmails(e.target.value)}
            placeholder="alice@example.com, bob@example.com"
          />
        </div>

        <div className="space-y-1.5">
          <Label>Report Title</Label>
          <Input value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>

        <div className="space-y-1.5">
          <Label>Period</Label>
          <div className="flex gap-2 flex-wrap">
            {dateRanges.map((r) => (
              <Button
                key={r.days}
                size="sm"
                variant={selectedDays === r.days ? 'default' : 'outline'}
                onClick={() => setSelectedDays(r.days)}
              >
                {r.label}
              </Button>
            ))}
          </div>
        </div>

        <Button
          onClick={() => sendMutation.mutate()}
          disabled={sendMutation.isPending || !emails.trim()}
          className="w-full"
        >
          {sendMutation.isPending ? (
            <>
              <svg className="h-4 w-4 animate-spin mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Sending…
            </>
          ) : (
            <>
              <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" /><polyline points="22,6 12,13 2,6" />
              </svg>
              Send Report
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
}

// ---------------------------------------------------------------------------
// Main Page
// ---------------------------------------------------------------------------

const MOCK_TEMPLATES: ReportTemplate[] = [
  { id: 'weekly-team', name: 'Weekly Team Summary', description: 'Commits, PRs, cycle time and top contributors for the past 7 days.', days: 7, sections: ['kpis', 'code_volume', 'contributors'] },
  { id: 'monthly-executive', name: 'Monthly Executive Report', description: 'High-level KPIs and trends for the past 30 days. Ideal for stakeholders.', days: 30, sections: ['kpis', 'code_volume', 'contributors', 'insights'] },
  { id: 'quarterly-review', name: 'Quarterly Engineering Review', description: 'Full 90-day breakdown with time series, contributor analysis, and AI insights.', days: 90, sections: ['kpis', 'code_volume', 'contributors', 'timeseries', 'insights'] },
  { id: 'sprint-retrospective', name: 'Sprint Retrospective (14 days)', description: 'Two-week sprint metrics: velocity, PR health, and team contributions.', days: 14, sections: ['kpis', 'code_volume', 'contributors'] },
];

export default function ReportsPage() {
  const { showToast } = useToast();
  const [exportingId, setExportingId] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ['report-templates'],
    queryFn: exportsAPI.getTemplates,
    retry: false,
  });

  const templates = data?.templates ?? MOCK_TEMPLATES;

  const handleTemplateExport = async (template: ReportTemplate) => {
    const isCsv = template.id.endsWith('-csv');
    const baseId = isCsv ? template.id.replace('-csv', '') : template.id;
    const { start, end } = getDateRange(template.days);

    setExportingId(template.id);
    try {
      if (isCsv) {
        await exportsAPI.downloadTeamCSV(ORG_ID, start, end);
        showToast({ type: 'success', title: 'CSV downloaded', message: `${template.name} exported.` });
      } else {
        await exportsAPI.downloadTeamPDF(ORG_ID, start, end, template.name);
        showToast({ type: 'success', title: 'PDF downloaded', message: `${template.name} exported.` });
      }
    } catch {
      showToast({ type: 'error', title: 'Export failed', message: 'Backend may be unavailable — try again later.' });
    } finally {
      setExportingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Reports</h1>
        <p className="text-gray-600 mt-2">
          Export team metrics as PDF or CSV, schedule email reports, and build custom reports.
        </p>
      </div>

      <Tabs defaultValue="templates">
        <TabsList>
          <TabsTrigger value="templates">Templates</TabsTrigger>
          <TabsTrigger value="custom">Custom Builder</TabsTrigger>
          <TabsTrigger value="email">Email Reports</TabsTrigger>
        </TabsList>

        {/* Templates */}
        <TabsContent value="templates">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            {templates.map((t) => (
              <TemplateCard
                key={t.id}
                template={t}
                onExport={handleTemplateExport}
                isExporting={exportingId === t.id || exportingId === t.id + '-csv'}
              />
            ))}
          </div>

          {/* Quick CSV exports */}
          <Card className="mt-6">
            <CardHeader>
              <CardTitle>Quick Data Exports</CardTitle>
              <CardDescription>Export raw time series data as CSV</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {(['commits', 'prs', 'additions'] as const).map((metric) => {
                  const labels: Record<string, string> = {
                    commits: 'Commit Activity',
                    prs: 'PR Activity',
                    additions: 'Code Volume',
                  };
                  return (
                    <Button
                      key={metric}
                      variant="outline"
                      onClick={async () => {
                        const { start, end } = getDateRange(30);
                        try {
                          await exportsAPI.downloadTimeseriesCSV(ORG_ID, metric, start, end);
                          showToast({ type: 'success', title: 'CSV downloaded', message: `${labels[metric]} exported.` });
                        } catch {
                          showToast({ type: 'error', title: 'Export failed', message: 'Backend unavailable.' });
                        }
                      }}
                      className="flex items-center gap-2"
                    >
                      <svg className="h-4 w-4 text-green-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><polyline points="14 2 14 8 20 8" />
                      </svg>
                      {labels[metric]}
                    </Button>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Custom Builder */}
        <TabsContent value="custom">
          <div className="mt-4 max-w-md">
            <CustomReportBuilder />
          </div>
        </TabsContent>

        {/* Email */}
        <TabsContent value="email">
          <div className="mt-4 max-w-md">
            <EmailReportSender />
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
