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
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">

      {/* ==========================================
          HEADER
      ========================================== */}
      <header className="sticky top-0 z-50 border-b bg-white/80 backdrop-blur">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">

          {/* Logo */}
          <div className="flex items-center gap-2 font-bold text-xl">
            <div className="h-10 w-10 rounded-xl bg-indigo-100 flex items-center justify-center">
              <GraduationCap className="h-6 w-6 text-indigo-600" />
            </div>

            <span className="text-slate-800">
              SchoolResult SaaS
            </span>
          </div>

          {/* Navigation */}
          <nav className="hidden md:flex items-center gap-8 text-sm text-slate-600">
            <a href="#features" className="hover:text-indigo-600">
              Features
            </a>

            <a href="#modules" className="hover:text-indigo-600">
              Modules
            </a>

            <a href="#about" className="hover:text-indigo-600">
              About
            </a>

            <a href="#contact" className="hover:text-indigo-600">
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

            <Button
              className="bg-indigo-600 hover:bg-indigo-700"
              asChild
            >
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
      <section className="max-w-7xl mx-auto px-4 py-24">

        <div className="grid lg:grid-cols-2 gap-12 items-center">

          {/* Left Content */}
          <div>

            <div className="inline-flex items-center gap-2 bg-indigo-100 text-indigo-700 px-4 py-2 rounded-full text-sm font-medium mb-6">
              <CheckCircle2 className="h-4 w-4" />
              Trusted School ERP Platform
            </div>

            <h1 className="text-5xl md:text-6xl font-bold text-slate-900 leading-tight">
              Modern School
              <span className="text-indigo-600 block">
                Management System
              </span>
            </h1>

            <p className="mt-6 text-lg text-slate-600 max-w-xl">
              Manage students, teachers, attendance,
              daily tests, results, rankings, reports,
              notifications and analytics from one
              powerful dashboard.
            </p>

            <div className="mt-8 flex flex-wrap gap-4">
              <Button
                size="lg"
                className="bg-indigo-600 hover:bg-indigo-700"
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
            <div className="grid grid-cols-2 gap-4 mt-10">

              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm">
                  Multi School Support
                </span>
              </div>

              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm">
                  Daily Test System
                </span>
              </div>

              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm">
                  Teacher Portal
                </span>
              </div>

              <div className="flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
                <span className="text-sm">
                  Result Analytics
                </span>
              </div>

            </div>

          </div>

          {/* Right Dashboard Preview */}
          <div>

            <div className="bg-white rounded-3xl shadow-2xl p-6">

              <div className="grid grid-cols-2 gap-4">

                <div className="bg-blue-50 rounded-2xl p-5">
                  <Users className="h-8 w-8 text-blue-600 mb-3" />
                  <h3 className="text-2xl font-bold">
                    12,540
                  </h3>
                  <p className="text-sm text-slate-500">
                    Students
                  </p>
                </div>

                <div className="bg-green-50 rounded-2xl p-5">
                  <BookOpen className="h-8 w-8 text-green-600 mb-3" />
                  <h3 className="text-2xl font-bold">
                    98%
                  </h3>
                  <p className="text-sm text-slate-500">
                    Attendance
                  </p>
                </div>

                <div className="bg-orange-50 rounded-2xl p-5">
                  <Trophy className="h-8 w-8 text-orange-600 mb-3" />
                  <h3 className="text-2xl font-bold">
                    1,250
                  </h3>
                  <p className="text-sm text-slate-500">
                    Tests Conducted
                  </p>
                </div>

                <div className="bg-purple-50 rounded-2xl p-5">
                  <BarChart3 className="h-8 w-8 text-purple-600 mb-3" />
                  <h3 className="text-2xl font-bold">
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
        <div className="max-w-7xl mx-auto px-4">

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">

            <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
              <h3 className="text-4xl font-bold text-indigo-600">
                10K+
              </h3>
              <p className="text-slate-500 mt-2">
                Students
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
              <h3 className="text-4xl font-bold text-green-600">
                500+
              </h3>
              <p className="text-slate-500 mt-2">
                Teachers
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
              <h3 className="text-4xl font-bold text-orange-600">
                100+
              </h3>
              <p className="text-slate-500 mt-2">
                Schools
              </p>
            </div>

            <div className="bg-white rounded-2xl p-6 text-center shadow-sm">
              <h3 className="text-4xl font-bold text-purple-600">
                99.9%
              </h3>
              <p className="text-slate-500 mt-2">
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
        className="py-20 bg-white"
      >
        <div className="max-w-7xl mx-auto px-4">

          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold">
              Powerful Features
            </h2>

            <p className="text-slate-500 mt-4">
              Everything schools need in one platform.
            </p>
          </div>
                    <div className="grid md:grid-cols-3 gap-6">

            {[
              {
                icon: Users,
                title: 'Multi-School SaaS',
                desc: 'Separate and secure data for every school.',
              },
              {
                icon: BarChart3,
                title: 'Smart Analytics',
                desc: 'Performance reports and rankings instantly.',
              },
              {
                icon: Shield,
                title: 'Role Permissions',
                desc: 'Admin, teacher and student access control.',
              },
              {
                icon: ClipboardCheck,
                title: 'Attendance',
                desc: 'Track student attendance digitally.',
              },
              {
                icon: BookOpen,
                title: 'Daily Tests',
                desc: 'Create and manage daily assessments.',
              },
              {
                icon: Trophy,
                title: 'Exam Results',
                desc: 'Generate rankings and report cards.',
              },
            ].map((item) => (
              <div
                key={item.title}
                className="
                  bg-slate-50
                  rounded-2xl
                  p-6
                  hover:shadow-lg
                  transition
                "
              >
                <item.icon className="h-10 w-10 text-indigo-600 mb-4" />

                <h3 className="font-semibold text-lg">
                  {item.title}
                </h3>

                <p className="text-slate-500 text-sm mt-2">
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
        <div className="max-w-7xl mx-auto px-4">

          <div className="text-center mb-14">
            <h2 className="text-4xl font-bold">
              Complete School ERP
            </h2>

            <p className="text-slate-500 mt-4">
              Manage every aspect of your institution.
            </p>
          </div>

          <div className="grid md:grid-cols-4 gap-6">

            {[
              {
                icon: Users,
                title: 'Students',
              },
              {
                icon: ClipboardCheck,
                title: 'Attendance',
              },
              {
                icon: BookOpen,
                title: 'Tests',
              },
              {
                icon: Trophy,
                title: 'Results',
              },
              {
                icon: CreditCard,
                title: 'Fees',
              },
              {
                icon: Bus,
                title: 'Transport',
              },
              {
                icon: Calendar,
                title: 'Calendar',
              },
              {
                icon: Bell,
                title: 'Notifications',
              },
            ].map((module) => (
              <div
                key={module.title}
                className="
                  bg-white
                  rounded-2xl
                  p-6
                  text-center
                  shadow-sm
                  hover:shadow-xl
                  transition
                "
              >
                <module.icon className="h-10 w-10 text-indigo-600 mx-auto mb-4" />

                <h3 className="font-semibold">
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
      <section className="py-20 bg-white">
        <div className="max-w-7xl mx-auto px-4">

          <div className="grid lg:grid-cols-2 gap-12 items-center">

            <div>
              <h2 className="text-4xl font-bold mb-8">
                Why Schools Choose Us
              </h2>

              <div className="space-y-6">

                <div className="flex gap-4">
                  <Shield className="h-8 w-8 text-green-600" />

                  <div>
                    <h3 className="font-semibold">
                      Secure Platform
                    </h3>

                    <p className="text-slate-500 mt-1">
                      School data remains isolated and protected.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <BarChart3 className="h-8 w-8 text-blue-600" />

                  <div>
                    <h3 className="font-semibold">
                      Real Time Reports
                    </h3>

                    <p className="text-slate-500 mt-1">
                      Instant analytics and performance tracking.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4">
                  <Users className="h-8 w-8 text-purple-600" />

                  <div>
                    <h3 className="font-semibold">
                      Multi User Access
                    </h3>

                    <p className="text-slate-500 mt-1">
                      Dedicated portals for admins and teachers.
                    </p>
                  </div>
                </div>

              </div>
            </div>

            <div className="
              bg-gradient-to-br
              from-indigo-600
              to-purple-600
              text-white
              rounded-3xl
              p-10
            ">
              <h3 className="text-3xl font-bold mb-4">
                One Dashboard.
              </h3>

              <h3 className="text-3xl font-bold mb-6">
                Complete Control.
              </h3>

              <p className="text-indigo-100">
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
        <div className="max-w-4xl mx-auto px-4 text-center">

          <h2 className="text-4xl font-bold">
            About SchoolResult SaaS
          </h2>

          <p className="mt-6 text-slate-600 leading-8">
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
        <div className="max-w-7xl mx-auto px-4">

          <h2 className="text-4xl font-bold text-center mb-12">
            What Schools Say
          </h2>

          <div className="grid md:grid-cols-3 gap-6">

            <div className="bg-slate-50 rounded-2xl p-6">
              <p>
                "Result generation became
                90% faster."
              </p>

              <h4 className="font-semibold mt-4">
                School Principal
              </h4>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6">
              <p>
                "Teachers save hours every week."
              </p>

              <h4 className="font-semibold mt-4">
                Academic Coordinator
              </h4>
            </div>

            <div className="bg-slate-50 rounded-2xl p-6">
              <p>
                "Simple and easy for our staff."
              </p>

              <h4 className="font-semibold mt-4">
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
        <div className="max-w-4xl mx-auto px-4 text-center">

          <h2 className="text-4xl font-bold">
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
      <footer className="bg-slate-900 text-white py-10">
        <div className="max-w-7xl mx-auto px-4 text-center">

          <GraduationCap className="h-10 w-10 mx-auto mb-4" />

          <h3 className="font-semibold text-xl">
            SchoolResult SaaS
          </h3>

          <p className="text-slate-400 mt-3">
            Modern School ERP & Result Management Platform
          </p>

          <p className="text-slate-500 mt-6 text-sm">
            © 2026 SchoolResult SaaS. All Rights Reserved.
          </p>

        </div>
      </footer>

    </div>
  );
}