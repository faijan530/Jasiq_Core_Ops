import React from 'react';
import { usePagedQuery } from '../../../hooks/usePagedQuery.js';

export function LeaveBalanceCards() {
  // API call for leave balances
  const { data, status, error } = usePagedQuery({ 
    path: "/api/v1/leave/balances", 
    page: 1, 
    pageSize: 50,
    enabled: true
  });

  if (status === 'loading') {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((index) => (
          <div key={index} className="bg-white rounded-xl border border-gray-100 p-4 animate-pulse">
            <div className="h-4 bg-gray-200 rounded mb-2"></div>
            <div className="h-8 bg-gray-200 rounded mb-1"></div>
            <div className="h-3 bg-gray-200 rounded"></div>
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <div className="text-red-800 text-sm">Failed to load leave balances</div>
      </div>
    );
  }

  // Use real data or fallback to empty state
  const balances = data?.content || [];

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
      {balances.length > 0 ? (
        balances.map((balance, index) => (
          <div key={index} className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-600">{balance.leaveType}</h4>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                {balance.leaveCode}
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-800">
              {balance.availableDays}
            </div>
            <div className="text-xs text-gray-500 mt-1">
              of {balance.totalDays} total
            </div>
            <div className="mt-3">
              <div className="w-full bg-gray-200 rounded-full h-2">
                <div
                  className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: balance.totalDays === 'Unlimited' ? '0%' : `${(balance.availableDays / balance.totalDays) * 100}%`
                  }}
                ></div>
              </div>
            </div>
          </div>
        ))
      ) : (
        // Default empty state
        <>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-600">Paid Leave</h4>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                PL
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-800">-</div>
            <div className="text-xs text-gray-500 mt-1">No data available</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-600">Sick Leave</h4>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                SL
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-800">-</div>
            <div className="text-xs text-gray-500 mt-1">No data available</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-600">Casual Leave</h4>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                CL
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-800">-</div>
            <div className="text-xs text-gray-500 mt-1">No data available</div>
          </div>
          <div className="bg-white rounded-xl border border-gray-100 p-4">
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-medium text-gray-600">Unpaid Leave</h4>
              <span className="text-xs font-medium text-gray-500 bg-gray-100 px-2 py-1 rounded">
                LWP
              </span>
            </div>
            <div className="text-2xl font-bold text-gray-800">∞</div>
            <div className="text-xs text-gray-500 mt-1">Unlimited</div>
          </div>
        </>
      )}
    </div>
  );
}
