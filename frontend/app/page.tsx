import Link from 'next/link';
import { Button } from '@/components/ui/button';

const features = [
  {
    icon: 'M3 3v18h18M9 17V9m4 8V5m4 12v-6',
    title: 'Real-time Analytics',
    description:
      'Track commits, PRs, and code reviews in real-time with beautiful visualizations',
  },
  {
    icon: 'M9.937 15.5A2 2 0 0 0 8.5 14.063l-6.135-1.582a.5.5 0 0 1 0-.962L8.5 9.936A2 2 0 0 0 9.937 8.5l1.582-6.135a.5.5 0 0 1 .963 0L14.063 8.5A2 2 0 0 0 15.5 9.937l6.135 1.581a.5.5 0 0 1 0 .964L15.5 14.063a2 2 0 0 0-1.437 1.437l-1.582 6.135a.5.5 0 0 1-.963 0z',
    title: 'AI Insights',
    description:
      'Get actionable recommendations powered by GPT-4 to improve team productivity',
  },
  {
    icon: 'M6 3v12M18 9a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM6 21a3 3 0 1 0 0-6 3 3 0 0 0 0 6ZM18 9a9 9 0 0 1-9 9',
    title: 'GitHub Integration',
    description:
      'Seamlessly connect your repositories and start tracking metrics instantly',
  },
  {
    icon: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 7a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75',
    title: 'Team Collaboration',
    description:
      'Understand team dynamics and identify bottlenecks in your development process',
  },
];

function FeatureIcon({ path }: { path: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6 text-blue-600"
    >
      <path d={path} />
    </svg>
  );
}

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      {/* Hero Section */}
      <div className="container mx-auto px-4 py-16">
        <nav className="flex items-center justify-between mb-16">
          <div className="flex items-center space-x-2">
            <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-xl">D</span>
            </div>
            <span className="text-2xl font-bold">DevMetrics</span>
          </div>
          <div className="space-x-4">
            <Link href="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
            <Link href="/register">
              <Button>Get Started</Button>
            </Link>
          </div>
        </nav>

        <div className="text-center max-w-4xl mx-auto mb-20">
          <h1 className="text-6xl font-bold mb-6 bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
            Unlock Your Team&apos;s Full Potential
          </h1>
          <p className="text-xl text-gray-600 mb-8">
            DevMetrics helps engineering teams track productivity metrics,
            analyze code quality, and get AI-powered insights to work smarter.
          </p>
          <div className="flex items-center justify-center space-x-4">
            <Link href="/register">
              <Button size="lg" className="text-lg px-8 py-6">
                Start Free Trial
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  width="20"
                  height="20"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  className="ml-2 h-5 w-5"
                >
                  <path d="M5 12h14M12 5l7 7-7 7" />
                </svg>
              </Button>
            </Link>
            <Link href="#features">
              <Button
                size="lg"
                variant="outline"
                className="text-lg px-8 py-6"
              >
                Learn More
              </Button>
            </Link>
          </div>
          <p className="text-sm text-gray-500 mt-4">
            Free for teams up to 5 developers - No credit card required
          </p>
        </div>

        {/* Features Grid */}
        <div
          id="features"
          className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-5xl mx-auto mb-20"
        >
          {features.map((feature) => (
            <div
              key={feature.title}
              className="p-8 bg-white rounded-2xl shadow-lg hover:shadow-xl transition-shadow"
            >
              <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mb-4">
                <FeatureIcon path={feature.icon} />
              </div>
              <h3 className="text-xl font-bold mb-2">{feature.title}</h3>
              <p className="text-gray-600">{feature.description}</p>
            </div>
          ))}
        </div>

        {/* Stats Section */}
        <div className="bg-blue-600 rounded-3xl p-12 text-white text-center mb-20">
          <h2 className="text-3xl font-bold mb-12">
            Trusted by development teams worldwide
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <div className="text-5xl font-bold mb-2">10K+</div>
              <div className="text-blue-100">Active Developers</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">500+</div>
              <div className="text-blue-100">Companies</div>
            </div>
            <div>
              <div className="text-5xl font-bold mb-2">1M+</div>
              <div className="text-blue-100">Commits Tracked</div>
            </div>
          </div>
        </div>

        {/* CTA Section */}
        <div className="text-center max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold mb-6">
            Ready to boost your team&apos;s productivity?
          </h2>
          <p className="text-xl text-gray-600 mb-8">
            Join hundreds of teams already using DevMetrics to ship better code,
            faster.
          </p>
          <Link href="/register">
            <Button size="lg" className="text-lg px-12 py-6">
              Get Started for Free
            </Button>
          </Link>
        </div>
      </div>

      {/* Footer */}
      <footer className="border-t border-gray-200 py-12">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
                  <span className="text-white font-bold">D</span>
                </div>
                <span className="text-xl font-bold">DevMetrics</span>
              </div>
              <p className="text-sm text-gray-600">
                AI-powered developer analytics for modern teams
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="#" className="hover:text-blue-600">
                    Features
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-blue-600">
                    Pricing
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-blue-600">
                    Integrations
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="#" className="hover:text-blue-600">
                    About
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-blue-600">
                    Blog
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-blue-600">
                    Careers
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="font-semibold mb-4">Legal</h3>
              <ul className="space-y-2 text-sm text-gray-600">
                <li>
                  <Link href="#" className="hover:text-blue-600">
                    Privacy
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-blue-600">
                    Terms
                  </Link>
                </li>
                <li>
                  <Link href="#" className="hover:text-blue-600">
                    Security
                  </Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-200 mt-12 pt-8 text-center text-sm text-gray-600">
            &copy; 2026 DevMetrics. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
