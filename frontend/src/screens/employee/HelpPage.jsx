import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useBootstrap } from '../../state/bootstrap.jsx';

function cx(...parts) {
  return parts.filter(Boolean).join(' ');
}

export function HelpPage() {
  const navigate = useNavigate();
  const { bootstrap } = useBootstrap();

  const scrollToId = (id) => {
    const el = document.getElementById(id);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-8 animate-in fade-in duration-500">
      {/* Header Section */}
      <div className="bg-gradient-to-br from-slate-800 via-slate-900 to-black rounded-3xl p-10 text-white shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-blue-500/10 rounded-full -mr-48 -mt-48 blur-3xl"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="space-y-4 text-center md:text-left">
             <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-blue-500/20 rounded-full border border-blue-500/30 text-blue-300 text-xs font-black uppercase tracking-widest">
                Knowledge Hub
             </div>
             <h1 className="text-4xl md:text-5xl font-black tracking-tight">Help & Support</h1>
             <p className="text-slate-400 text-lg font-medium max-w-xl">Everything you need to navigate our platform, understand policies, and reach out for assistance.</p>
          </div>
          
          <div className="grid grid-cols-2 gap-4 w-full md:w-auto">
             <button onClick={() => scrollToId('handbook')} className="p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 hover:bg-white/10 transition-all text-center group">
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📚</div>
                <div className="text-xs font-bold uppercase tracking-widest opacity-60">Handbook</div>
             </button>
             <button onClick={() => scrollToId('policies')} className="p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 hover:bg-white/10 transition-all text-center group">
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">⚖️</div>
                <div className="text-xs font-bold uppercase tracking-widest opacity-60">Policies</div>
             </button>
             <button onClick={() => scrollToId('contacts')} className="p-4 bg-white/5 backdrop-blur-md rounded-2xl border border-white/10 hover:bg-white/10 transition-all text-center group">
                <div className="text-2xl mb-2 group-hover:scale-110 transition-transform">📞</div>
                <div className="text-xs font-bold uppercase tracking-widest opacity-60">Support</div>
             </button>
             <button onClick={() => navigate(-1)} className="p-4 bg-blue-600 rounded-2xl hover:bg-blue-500 transition-all text-center group shadow-lg shadow-blue-900/40">
                <div className="text-2xl mb-2 group-hover:-translate-x-1 transition-transform">↩</div>
                <div className="text-xs font-bold uppercase tracking-widest">Go Back</div>
             </button>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* FAQ Section */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center gap-3 px-2">
             <div className="w-1.5 h-6 bg-blue-600 rounded-full"></div>
             <h2 className="text-2xl font-black text-slate-900">Common Questions</h2>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             {[
               { q: "How do I request leave?", a: "Navigate to 'My Leave' section and use the 'Apply Leave' button. Requests are routed to your manager." },
               { q: "Submission of timesheets?", a: "Open 'My Timesheets', log your daily tasks, and submit at the end of every week." },
               { q: "Finding my payslips?", a: "Your financial records are securely stored in the 'My Payslips' section." },
               { q: "Updating my profile?", a: "Personal details can be updated in 'My Profile'. Some changes require HR verification." }
             ].map((item, i) => (
               <div key={i} className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow group">
                  <div className="w-10 h-10 bg-slate-50 rounded-xl flex items-center justify-center text-blue-600 font-black mb-4 group-hover:bg-blue-600 group-hover:text-white transition-colors">?</div>
                  <h3 className="text-lg font-bold text-slate-900 mb-2">{item.q}</h3>
                  <p className="text-sm text-slate-500 font-medium leading-relaxed">{item.a}</p>
               </div>
             ))}
          </div>

          <div id="handbook" className="bg-slate-900 rounded-3xl p-8 text-white relative overflow-hidden group">
            <div className="absolute bottom-0 right-0 w-64 h-64 bg-blue-600/10 rounded-full -mr-32 -mb-32 blur-3xl"></div>
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6">
               <div className="space-y-2">
                  <h3 className="text-2xl font-bold">Employee Handbook</h3>
                  <p className="text-slate-400 font-medium max-w-md">Our comprehensive guide covering onboarding, culture, and operational excellence.</p>
               </div>
               <button className="px-8 py-3 bg-white text-slate-900 font-black rounded-2xl hover:bg-slate-100 transition-all active:scale-95 shadow-xl">
                  Download PDF
               </button>
            </div>
          </div>
        </div>

        {/* Support Channels */}
        <div className="space-y-6">
           <div className="flex items-center gap-3 px-2">
             <div className="w-1.5 h-6 bg-indigo-600 rounded-full"></div>
             <h2 className="text-2xl font-black text-slate-900">Assistance</h2>
          </div>

          <div id="contacts" className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
             <div className="p-6 border-b border-slate-50 bg-slate-50/50">
                <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Direct Support</h3>
                <div className="space-y-4">
                   <div className="flex items-center gap-4 group cursor-pointer">
                      <div className="w-12 h-12 bg-blue-50 rounded-2xl flex items-center justify-center text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      </div>
                       <div>
                          <div className="text-sm font-black text-slate-900">HR Department</div>
                          <div className="text-xs text-slate-500 font-bold">{bootstrap?.systemConfig?.HR_SUPPORT_EMAIL?.value || 'hr@example.com'}</div>
                       </div>
                   </div>
                   
                   <div className="flex items-center gap-4 group cursor-pointer">
                      <div className="w-12 h-12 bg-indigo-50 rounded-2xl flex items-center justify-center text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" /></svg>
                      </div>
                       <div>
                          <div className="text-sm font-black text-slate-900">IT Helpdesk</div>
                          <div className="text-xs text-slate-500 font-bold">Extension: {bootstrap?.systemConfig?.IT_HELPDESK_EXT?.value || '987'}</div>
                       </div>
                   </div>

                   <div className="flex items-center gap-4 group cursor-pointer">
                      <div className="w-12 h-12 bg-emerald-50 rounded-2xl flex items-center justify-center text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                      </div>
                       <div>
                          <div className="text-sm font-black text-slate-900">Finance & Payroll</div>
                          <div className="text-xs text-slate-500 font-bold">{bootstrap?.systemConfig?.FINANCE_SUPPORT_EMAIL?.value || 'finance@example.com'}</div>
                       </div>
                   </div>
                </div>
             </div>
             
             <div className="p-6 bg-indigo-600 text-white text-center space-y-4">
                <div className="text-xs font-black uppercase tracking-widest opacity-60">System Status</div>
                <div className="flex items-center justify-center gap-2">
                   <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse"></div>
                   <span className="text-sm font-black">All Systems Operational</span>
                </div>
             </div>
          </div>
        </div>
      </div>

      {/* Policies Grid */}
      <div id="policies" className="space-y-6 pt-8">
        <div className="flex items-center gap-3 px-2">
          <div className="w-1.5 h-6 bg-slate-900 rounded-full"></div>
          <h2 className="text-2xl font-black text-slate-900">Global Policies</h2>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
           {[
             { title: "Code of Conduct", icon: "🤝", desc: "Our commitment to ethical behavior and professionalism." },
             { title: "IT Security", icon: "🛡️", desc: "Guidelines for device use and data protection." },
             { title: "Leave Policy", icon: "✈️", desc: "Detailed breakdown of leave types and eligibility." },
             { title: "Expense Policy", icon: "📊", desc: "Framework for reimbursements and official spending." }
           ].map((policy, i) => (
             <div key={i} className="bg-white p-8 rounded-3xl border border-slate-100 shadow-sm hover:border-blue-400 transition-all cursor-pointer group">
                <div className="text-3xl mb-4 group-hover:scale-125 transition-transform inline-block">{policy.icon}</div>
                <h3 className="text-lg font-bold text-slate-900 mb-2">{policy.title}</h3>
                <p className="text-xs text-slate-500 font-bold leading-relaxed">{policy.desc}</p>
             </div>
           ))}
        </div>
      </div>
    </div>
  );
}
