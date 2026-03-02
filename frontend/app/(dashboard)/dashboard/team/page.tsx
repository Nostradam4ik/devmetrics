'use client';

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

const teamMembers = [
  {
    name: 'Alice Johnson',
    role: 'Senior Engineer',
    email: 'alice@example.com',
    commits: 42,
    prs: 8,
    reviews: 15,
    status: 'active',
  },
  {
    name: 'Bob Smith',
    role: 'Full Stack Developer',
    email: 'bob@example.com',
    commits: 38,
    prs: 6,
    reviews: 12,
    status: 'active',
  },
  {
    name: 'Carol White',
    role: 'Backend Engineer',
    email: 'carol@example.com',
    commits: 35,
    prs: 10,
    reviews: 8,
    status: 'active',
  },
  {
    name: 'David Brown',
    role: 'Frontend Engineer',
    email: 'david@example.com',
    commits: 28,
    prs: 5,
    reviews: 11,
    status: 'away',
  },
  {
    name: 'Eve Davis',
    role: 'DevOps Engineer',
    email: 'eve@example.com',
    commits: 24,
    prs: 4,
    reviews: 6,
    status: 'active',
  },
];

export default function TeamPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Team</h1>
          <p className="text-gray-600 mt-2">
            Manage and monitor your team members
          </p>
        </div>
      </div>

      {/* Team Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">5</div>
            <p className="text-sm text-gray-500">Total Members</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">4</div>
            <p className="text-sm text-gray-500">Active Now</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">167</div>
            <p className="text-sm text-gray-500">Total Commits (7d)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">33</div>
            <p className="text-sm text-gray-500">PRs Opened (7d)</p>
          </CardContent>
        </Card>
      </div>

      {/* Team Members Table */}
      <Card>
        <CardHeader>
          <CardTitle>Team Members</CardTitle>
          <CardDescription>
            View activity and performance of each team member
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    Member
                  </th>
                  <th className="text-left py-3 px-4 text-sm font-medium text-gray-500">
                    Role
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                    Commits
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                    PRs
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                    Reviews
                  </th>
                  <th className="text-center py-3 px-4 text-sm font-medium text-gray-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {teamMembers.map((member) => (
                  <tr
                    key={member.email}
                    className="border-b border-gray-100 hover:bg-gray-50"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center text-xs font-medium text-blue-600">
                          {member.name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{member.name}</p>
                          <p className="text-xs text-gray-500">
                            {member.email}
                          </p>
                        </div>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-sm text-gray-600">
                      {member.role}
                    </td>
                    <td className="py-3 px-4 text-center text-sm font-medium">
                      {member.commits}
                    </td>
                    <td className="py-3 px-4 text-center text-sm font-medium">
                      {member.prs}
                    </td>
                    <td className="py-3 px-4 text-center text-sm font-medium">
                      {member.reviews}
                    </td>
                    <td className="py-3 px-4 text-center">
                      <Badge
                        variant={
                          member.status === 'active' ? 'success' : 'warning'
                        }
                      >
                        {member.status}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
