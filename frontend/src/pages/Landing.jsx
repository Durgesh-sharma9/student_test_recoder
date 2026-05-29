import { Link } from 'react-router-dom';
import {
  GraduationCap,
  BarChart3,
  Shield,
  Users,
  ClipboardCheck,
  BookOpen,
  Trophy,
  CreditCard,
  Bus,
  Calendar,
  Bell,
  ArrowRight,
  CheckCircle2,
} from 'lucide-react';

import { Button } from '@/components/ui/button';

export default function Landing() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/80 to-indigo-100">

      {/* ==========================================
          HEADER
      ========================================== */}
      <header className="sticky top-0 z-50 border-b border-slate-200/80 bg-white/90 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4">

          {/* Logo */}
          <div className="flex items-center gap-2.5 text-xl font-bold">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-blue-600 shadow-sm">
              <GraduationCap className="h-6 w-6 text-white" />
            </div>

            <span className="text-slate-800">
              SchoolResult SaaS
            </span>
          </div>

          {/* Navigation */}
          <nav className="hidden items-center gap-8 text-sm font-medium text-slate-600 md:flex">
            <a href="#features" className="transition-colors hover:text-blue-600">
              Features
            </a>

            <a href="#modules" className="transition-colors hover:text-blue-600">
              Modules
            </a>

            <a href="#about" className="transition-colors hover:text-blue-600">
              About
            </a>

            <a href="#contact" className="transition-colors hover:text-blue-600">
              Contact
            </a>
          </nav>

          {/* Buttons */}
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link to="/login">
                Login
              </Link>
            </Button>

            <Button asChild>
              <Link to="/signup">
                Sign Up
              </Link>
            </Button>
          </div>
        </div>
      </header>

      {/* ==========================================
          HERO SECTION
      ========================================== */}
      <section className="mx-auto max-w-7xl px-4 py-20 sm:py-24">

        <div className="grid items-center gap-12 lg:grid-cols-2">

          {/* Left Content */}
          <div>

            <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-blue-200 bg-blue-50 px-4 py-2 text-sm font-semibold text-blue-700">
              <CheckCircle2 className="h-4 w-4" />
              Trusted School ERP Platform
            </div>

            <h1 className="text-4xl font-extrabold leading-tight tracking-tight text-slate-900 sm:text-5xl md:text-6xl">
              Modern School
              <span className="mt-1 block text-blue-600">
                Management System
              </span>
            </h1>

            <p className="mt-6 max-w-xl text-lg leading-relaxed text-slate-600">
              Manage students, teachers, attendance,
              daily tests, results, rankings, reports,
              notifications and analytics from one
              powerful dashboard.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Button
                size="lg"
                asChild
              >
                <Link to="/signup">
                  Start Free Trial
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button
                size="lg"
                variant="outline"
                asChild
              >
                <Link to="/login">
                  Login
                </Link>
              </Button>
            </div>

            {/* Small Features */}
            <div className="mt-10 grid grid-cols-2 gap-4">

              <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/60 px-3 py-2.5">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                <span className="text-sm font-medium text-slate-700">
                  Multi School Support
                </span>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/60 px-3 py-2.5">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                <span className="text-sm font-medium text-slate-700">
                  Daily Test System
                </span>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/60 px-3 py-2.5">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                <span className="text-sm font-medium text-slate-700">
                  Teacher Portal
                </span>
              </div>

              <div className="flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/60 px-3 py-2.5">
                <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-500" />
                <span className="text-sm font-medium text-slate-700">
                  Result Analytics
                </span>
              </div>

            </div>

          </div>

          {/* Right Dashboard Preview */}
          <div>

            <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-2xl shadow-indigo-100/50">

              <div className="grid grid-cols-2 gap-4">

                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-5">
                  <Users className="mb-3 h-8 w-8 text-blue-600" />
                  <h3 className="text-2xl font-bold text-slate-900">
                    12,540
                  </h3>
                  <p className="text-sm text-slate-500">
                    Students
                  </p>
                </div>

                <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                  <BookOpen className="mb-3 h-8 w-8 text-emerald-600" />
                  <h3 className="text-2xl font-bold text-slate-900">
                    98%
                  </h3>
                  <p className="text-sm text-slate-500">
                    Attendance
                  </p>
                </div>

                <div className="rounded-2xl border border-orange-100 bg-orange-50 p-5">
                  <Trophy className="mb-3 h-8 w-8 text-orange-600" />
                  <h3 className="text-2xl font-bold text-slate-900">
                    1,250
                  </h3>
                  <p className="text-sm text-slate-500">
                    Tests Conducted
                  </p>
                </div>

                <div className="rounded-2xl border border-violet-100 bg-violet-50 p-5">
                  <BarChart3 className="mb-3 h-8 w-8 text-violet-600" />
                  <h3 className="text-2xl font-bold text-slate-900">
                    99.9%
                  </h3>
                  <p className="text-sm text-slate-500">
                    Uptime
                  </p>
                </div>

              </div>

            </div>

          </div>

        </div>
      </section>

      {/* ==========================================
          PLATFORM STATS
      ========================================== */}
      <section className="pb-20">
        <div className="mx-auto max-w-7xl px-4">

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">

            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <h3 className="text-4xl font-bold text-blue-600">
                10K+
              </h3>
              <p className="mt-2 text-slate-500">
                Students
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <h3 className="text-4xl font-bold text-emerald-600">
                500+
              </h3>
              <p className="mt-2 text-slate-500">
                Teachers
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <h3 className="text-4xl font-bold text-orange-600">
                100+
              </h3>
              <p className="mt-2 text-slate-500">
                Schools
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
              <h3 className="text-4xl font-bold text-violet-600">
                99.9%
              </h3>
              <p className="mt-2 text-slate-500">
                Uptime
              </p>
            </div>

          </div>

        </div>
      </section>

      {/* ==========================================
          FEATURES SECTION
      ========================================== */}
      <section
        id="features"
        className="bg-white py-20"
      >
        <div className="mx-auto max-w-7xl px-4">

          <div className="mb-14 text-center">
            <h2 className="text-4xl font-bold text-slate-900">
              Powerful Features
            </h2>

            <p className="mt-4 text-slate-500">
              Everything schools need in one platform.
            </p>
          </div>
          <div className="grid gap-6 md:grid-cols-3">

            {[
              {
                icon: Users,
                title: 'Multi-School SaaS',
                desc: 'Separate and secure data for every school.',
                tone: 'border-blue-100 bg-blue-50/50',
                iconColor: 'text-blue-600',
              },
              {
                icon: BarChart3,
                title: 'Smart Analytics',
                desc: 'Performance reports and rankings instantly.',
                tone: 'border-violet-100 bg-violet-50/50',
                iconColor: 'text-violet-600',
              },
              {
                icon: Shield,
                title: 'Role Permissions',
                desc: 'Admin, teacher and student access control.',
                tone: 'border-emerald-100 bg-emerald-50/50',
                iconColor: 'text-emerald-600',
              },
              {
                icon: ClipboardCheck,
                title: 'Attendance',
                desc: 'Track student attendance digitally.',
                tone: 'border-orange-100 bg-orange-50/50',
                iconColor: 'text-orange-600',
              },
              {
                icon: BookOpen,
                title: 'Daily Tests',
                desc: 'Create and manage daily assessments.',
                tone: 'border-blue-100 bg-blue-50/50',
                iconColor: 'text-blue-600',
              },
              {
                icon: Trophy,
                title: 'Exam Results',
                desc: 'Generate rankings and report cards.',
                tone: 'border-amber-100 bg-amber-50/50',
                iconColor: 'text-amber-600',
              },
            ].map((item) => (
              <div
                key={item.title}
                className={`rounded-2xl border p-6 transition-shadow hover:shadow-lg ${item.tone}`}
              >
                <item.icon className={`mb-4 h-10 w-10 ${item.iconColor}`} />

                <h3 className="text-lg font-semibold text-slate-900">
                  {item.title}
                </h3>

                <p className="mt-2 text-sm text-slate-500">
                  {item.desc}
                </p>
              </div>
            ))}

          </div>
        </div>
      </section>

      {/* ==========================================
          ERP MODULES
      ========================================== */}
      <section
        id="modules"
        className="py-20"
      >
        <div className="mx-auto max-w-7xl px-4">

          <div className="mb-14 text-center">
            <h2 className="text-4xl font-bold text-slate-900">
              Complete School ERP
            </h2>

            <p className="mt-4 text-slate-500">
              Manage every aspect of your institution.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 md:grid-cols-4 md:gap-6">

            {[
              { icon: Users, title: 'Students' },
              { icon: ClipboardCheck, title: 'Attendance' },
              { icon: BookOpen, title: 'Tests' },
              { icon: Trophy, title: 'Results' },
              { icon: CreditCard, title: 'Fees' },
              { icon: Bus, title: 'Transport' },
              { icon: Calendar, title: 'Calendar' },
              { icon: Bell, title: 'Notifications' },
            ].map((module) => (
              <div
                key={module.title}
                className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm transition-shadow hover:shadow-xl"
              >
                <module.icon className="mx-auto mb-4 h-10 w-10 text-blue-600" />

                <h3 className="font-semibold text-slate-800">
                  {module.title}
                </h3>
              </div>
            ))}

          </div>
        </div>
      </section>

      {/* ==========================================
          WHY CHOOSE US
      ========================================== */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4">

          <div className="grid items-center gap-12 lg:grid-cols-2">

            <div>
              <h2 className="mb-8 text-4xl font-bold text-slate-900">
                Why Schools Choose Us
              </h2>

              <div className="space-y-6">

                <div className="flex gap-4 rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
                  <Shield className="h-8 w-8 shrink-0 text-emerald-600" />

                  <div>
                    <h3 className="font-semibold text-slate-900">
                      Secure Platform
                    </h3>

                    <p className="mt-1 text-slate-500">
                      School data remains isolated and protected.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 rounded-xl border border-blue-100 bg-blue-50/40 p-4">
                  <BarChart3 className="h-8 w-8 shrink-0 text-blue-600" />

                  <div>
                    <h3 className="font-semibold text-slate-900">
                      Real Time Reports
                    </h3>

                    <p className="mt-1 text-slate-500">
                      Instant analytics and performance tracking.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 rounded-xl border border-violet-100 bg-violet-50/40 p-4">
                  <Users className="h-8 w-8 shrink-0 text-violet-600" />

                  <div>
                    <h3 className="font-semibold text-slate-900">
                      Multi User Access
                    </h3>

                    <p className="mt-1 text-slate-500">
                      Dedicated portals for admins and teachers.
                    </p>
                  </div>
                </div>

              </div>
            </div>

            <div className="rounded-3xl bg-gradient-to-br from-blue-600 to-violet-600 p-10 text-white shadow-xl">
              <h3 className="mb-4 text-3xl font-bold">
                One Dashboard.
              </h3>

              <h3 className="mb-6 text-3xl font-bold">
                Complete Control.
              </h3>

              <p className="leading-relaxed text-blue-100">
                Manage students, attendance,
                tests, rankings, teachers,
                reports and notifications
                from a single dashboard.
              </p>
            </div>

          </div>
        </div>
      </section>

      {/* ==========================================
          ABOUT
      ========================================== */}
      <section
        id="about"
        className="py-20"
      >
        <div className="mx-auto max-w-4xl px-4 text-center">

          <h2 className="text-4xl font-bold text-slate-900">
            About SchoolResult SaaS
          </h2>

          <p className="mt-6 leading-8 text-slate-600">
            SchoolResult SaaS helps schools digitize
            result processing, daily tests,
            attendance management and academic
            analytics with a modern cloud platform.
          </p>

        </div>
      </section>

      {/* ==========================================
          TESTIMONIALS
      ========================================== */}
      <section className="bg-white py-20">
        <div className="mx-auto max-w-7xl px-4">

          <h2 className="mb-12 text-center text-4xl font-bold text-slate-900">
            What Schools Say
          </h2>

          <div className="grid gap-6 md:grid-cols-3">

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-slate-700">
                &quot;Result generation became
                90% faster.&quot;
              </p>

              <h4 className="mt-4 font-semibold text-slate-900">
                School Principal
              </h4>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-slate-700">
                &quot;Teachers save hours every week.&quot;
              </p>

              <h4 className="mt-4 font-semibold text-slate-900">
                Academic Coordinator
              </h4>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-6">
              <p className="text-slate-700">
                &quot;Simple and easy for our staff.&quot;
              </p>

              <h4 className="mt-4 font-semibold text-slate-900">
                School Administrator
              </h4>
            </div>

          </div>
        </div>
      </section>

      {/* ==========================================
          CONTACT
      ========================================== */}
      <section
        id="contact"
        className="py-20"
      >
        <div className="mx-auto max-w-4xl px-4 text-center">

          <h2 className="text-4xl font-bold text-slate-900">
            Contact Us
          </h2>

          <p className="mt-4 text-slate-500">
            support@schoolresult.app
          </p>

          <p className="mt-2 text-slate-500">
            +91 98765 43210
          </p>

        </div>
      </section>

      {/* ==========================================
          FOOTER
      ========================================== */}
      <footer className="bg-slate-900 py-10 text-white">
        <div className="mx-auto max-w-7xl px-4 text-center">

          <GraduationCap className="mx-auto mb-4 h-10 w-10 text-blue-400" />

          <h3 className="text-xl font-semibold">
            SchoolResult SaaS
          </h3>

          <p className="mt-3 text-slate-400">
            Modern School ERP & Result Management Platform
          </p>

          <p className="mt-6 text-sm text-slate-500">
            © 2026 SchoolResult SaaS. All Rights Reserved.
          </p>

        </div>
      </footer>

    </div>
  );
}
