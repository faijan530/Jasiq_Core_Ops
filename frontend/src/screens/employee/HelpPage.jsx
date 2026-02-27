import React from 'react';
import { useNavigate } from 'react-router-dom';

export function HelpPage() {
  const navigate = useNavigate();

  const scrollToId = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Help & Policies</h1>
          <p className="text-slate-600 mt-1">Find answers, policies, and contacts.</p>
        </div>
      </div>

      <div className="mb-6">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Quick Links</h2>
          <ul className="space-y-3">
            <li>
              <button type="button" onClick={() => scrollToId('handbook')} className="text-blue-600 hover:text-blue-800 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
                Employee Handbook
              </button>
            </li>
            <li>
              <button type="button" onClick={() => scrollToId('policies')} className="text-blue-600 hover:text-blue-800 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Company Policies
              </button>
            </li>
            <li>
              <button type="button" onClick={() => scrollToId('it-support')} className="text-blue-600 hover:text-blue-800 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                IT Support
              </button>
            </li>
            <li>
              <button type="button" onClick={() => scrollToId('hr-contact')} className="text-blue-600 hover:text-blue-800 flex items-center gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                </svg>
                HR Contact
              </button>
            </li>
          </ul>
        </div>

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-slate-900 mb-4">Frequently Asked Questions</h2>
          <ul className="space-y-3">
            <li>
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <div className="text-slate-900 font-medium">How do I request leave?</div>
                  <div className="text-sm text-slate-600">Go to My Leave and click Apply Leave.</div>
                </div>
              </div>
            </li>
            <li>
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <div className="text-slate-900 font-medium">How do I submit timesheet?</div>
                  <div className="text-sm text-slate-600">Open My Timesheets, fill your week, and submit.</div>
                </div>
              </div>
            </li>
            <li>
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <div className="text-slate-900 font-medium">Where can I find my payslips?</div>
                  <div className="text-sm text-slate-600">Open My Payslips from the sidebar.</div>
                </div>
              </div>
            </li>
            <li>
              <div className="flex items-start gap-2">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <div className="text-slate-900 font-medium">How do I update my profile?</div>
                  <div className="text-sm text-slate-600">Go to My Profile and update your details.</div>
                </div>
              </div>
            </li>
          </ul>
        </div>
      </div>

      <div id="handbook" className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Employee Handbook</h2>
        <p className="text-sm text-slate-600">Guidelines, onboarding information, and workplace expectations.</p>
        <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
          Contact HR if you need the latest handbook PDF.
        </div>
      </div>

      <div id="policies" className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 mb-8">
        <h2 className="text-lg font-semibold text-slate-900 mb-2">Company Policies</h2>
        <p className="text-sm text-slate-600">Key policies every employee should know.</p>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="font-medium text-slate-900">Leave & Attendance</div>
            <div className="text-sm text-slate-600 mt-1">Rules for attendance marking, leave eligibility, and approvals.</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="font-medium text-slate-900">Code of Conduct</div>
            <div className="text-sm text-slate-600 mt-1">Professional behavior, compliance, and workplace safety.</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="font-medium text-slate-900">Expenses & Reimbursements</div>
            <div className="text-sm text-slate-600 mt-1">How to submit expenses and reimbursement timelines.</div>
          </div>
          <div className="rounded-xl border border-slate-200 p-4">
            <div className="font-medium text-slate-900">IT & Security</div>
            <div className="text-sm text-slate-600 mt-1">Account security, device policy, and support channels.</div>
          </div>
        </div>
      </div>

      {/* Contact Information */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6" id="contacts">
        <h2 className="text-lg font-semibold text-slate-900 mb-4">Contact Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div id="hr-contact">
            <h3 className="font-medium text-slate-900 mb-2">HR Department</h3>
            <p className="text-sm text-slate-600 mb-1">Email: hr@company.com</p>
            <p className="text-sm text-slate-600 mb-1">Phone: +1 (555) 123-4567</p>
            <p className="text-sm text-slate-600">Hours: 9:00 AM - 6:00 PM</p>
          </div>
          <div id="it-support">
            <h3 className="font-medium text-slate-900 mb-2">IT Support</h3>
            <p className="text-sm text-slate-600 mb-1">Email: it@company.com</p>
            <p className="text-sm text-slate-600 mb-1">Phone: +1 (555) 987-6543</p>
            <p className="text-sm text-slate-600">24/7 Support Available</p>
          </div>
          <div>
            <h3 className="font-medium text-slate-900 mb-2">Finance Department</h3>
            <p className="text-sm text-slate-600 mb-1">Email: finance@company.com</p>
            <p className="text-sm text-slate-600 mb-1">Phone: +1 (555) 456-7890</p>
            <p className="text-sm text-slate-600">Hours: 9:00 AM - 5:00 PM</p>
          </div>
        </div>
      </div>
    </div>
  );
}
