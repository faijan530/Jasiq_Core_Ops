import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useBootstrap } from '../../state/bootstrap.jsx';
import { apiFetch } from '../../api/client.js';

export function CreateEmployeePage() {
  const { bootstrap } = useBootstrap();
  const navigate = useNavigate();
  const [currentStep, setCurrentStep] = useState(1);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [reportingManagers, setReportingManagers] = useState([]);
  const [isLoadingManagers, setIsLoadingManagers] = useState(false);

  // Form data for all steps
  const [formData, setFormData] = useState({
    // Step 1: Identity
    employeeCode: '',
    firstName: '',
    lastName: '',
    email: '',
    phone: '',
    joiningDate: '',
    employmentType: '',

    // Step 2: Scope
    scope: '',
    primaryDivisionId: '',
    scopeConfirmation: false,

    // Step 3: Compensation
    salaryType: '',
    amount: '',
    currency: '',
    effectiveFrom: '',
    effectiveTo: '',
    compensationNotes: '',

    // Step 4: Access
    reportingManager: '',
    designation: '',
    roleId: ''
  });

  const [errors, setErrors] = useState({});

  const roles = bootstrap?.rbac?.roles || [];
  const userRole = roles[0]; // Get current user's role for compensation visibility
  const canEditCompensation = ['COREOPS_ADMIN', 'HR_ADMIN', 'FINANCE_ADMIN', 'FOUNDER'].includes(userRole);

  const fetchReportingManagers = async (divisionId) => {
    setIsLoadingManagers(true);
    try {
      const params = divisionId ? `?divisionId=${divisionId}` : '';
      const response = await apiFetch(`/api/v1/employees/eligible-managers${params}`);
      setReportingManagers(response.items || []);
    } catch (error) {
      console.error('Failed to fetch reporting managers:', error);
      setReportingManagers([]);
    } finally {
      setIsLoadingManagers(false);
    }
  };

  // Fetch reporting managers when scope/division changes
  useEffect(() => {
    if (formData.scope === 'DIVISION' && formData.primaryDivisionId) {
      fetchReportingManagers(formData.primaryDivisionId);
    } else if (formData.scope === 'COMPANY') {
      fetchReportingManagers(null); // Company scope - no division filter
    } else {
      setReportingManagers([]);
    }
  }, [formData.scope, formData.primaryDivisionId]);

  const handleInputChange = (step, field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error for this field
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateStep = (step) => {
    const newErrors = {};

    if (step === 1) {
      if (!formData.employeeCode) newErrors.employeeCode = 'Employee Code is required';
      if (!formData.firstName) newErrors.firstName = 'First Name is required';
      if (!formData.lastName) newErrors.lastName = 'Last Name is required';
      if (!formData.email) newErrors.email = 'Email is required';
      if (!formData.joiningDate) newErrors.joiningDate = 'Joining Date is required';
      if (!formData.employmentType) newErrors.employmentType = 'Employment Type is required';
    }

    if (step === 2) {
      if (!formData.scope) newErrors.scope = 'Employment Scope is required';
      if (formData.scope === 'DIVISION' && !formData.primaryDivisionId) {
        newErrors.primaryDivisionId = 'Division selection is required for Division scope';
      }
      if (!formData.scopeConfirmation) {
        newErrors.scopeConfirmation = 'Please confirm you understand the financial impact';
      }
    }

    if (step === 3 && canEditCompensation) {
      if (!formData.salaryType) newErrors.salaryType = 'Salary Type is required';
      if (!formData.amount) newErrors.amount = 'Amount is required';
      if (!formData.currency) newErrors.currency = 'Currency is required';
      if (!formData.effectiveFrom) newErrors.effectiveFrom = 'Effective From is required';
    }

    if (step === 4) {
      if (!formData.designation) newErrors.designation = 'Designation is required';
      if (!formData.roleId) newErrors.roleId = 'System Role is required';
      
      // Validate that employee cannot report to themselves
      // This is a basic validation - in practice, we'd need to check if the selected manager
      // is the same employee being created, but since we don't have the employee ID yet,
      // this would be handled on the backend
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 4));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(4)) return;

    setIsSubmitting(true);
    try {
      const payload = {
        employeeCode: formData.employeeCode,
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        phone: formData.phone,
        joiningDate: formData.joiningDate,
        employmentType: formData.employmentType,
        status: "ACTIVE",
        scope: formData.scope,
        primaryDivisionId: formData.scope === 'DIVISION' ? formData.primaryDivisionId : null,
        reportingManagerId: formData.reportingManager || null,
        designation: formData.designation,
        roleId: formData.roleId
      };

      // Add compensation if user has permission
      if (canEditCompensation && formData.salaryType) {
        payload.compensation = {
          salaryType: formData.salaryType,
          amount: formData.amount,
          currency: formData.currency,
          effectiveFrom: formData.effectiveFrom,
          effectiveTo: formData.effectiveTo || null,
          notes: formData.compensationNotes
        };
      }

      await apiFetch('/api/v1/employees', {
        method: 'POST',
        body: payload
      });

      // Show success message and redirect
      // Note: In a real implementation, you'd show a toast notification
      alert('Employee created successfully. Password setup email sent.');
      navigate('/admin/employees');

    } catch (error) {
      console.error('Failed to create employee:', error);
      alert('Failed to create employee. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getStepNumber = (step) => {
    const stepMap = { 1: 'Identity', 2: 'Scope', 3: 'Compensation', 4: 'Access' };
    return stepMap[step];
  };

  const isStepComplete = (step) => {
    if (step < currentStep) return true;
    if (step === currentStep) return false;
    return false;
  };

  return (
    <div className="flex-1 bg-white">
      {/* Step Indicator - Sticky */}
      <div className="sticky top-0 z-10 bg-white border-b border-slate-200 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-8">
              {[1, 2, 3, 4].map((step) => (
                <div key={step} className="flex items-center">
                  <div
                    className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                      isStepComplete(step)
                        ? 'bg-green-600 text-white'
                        : step === currentStep
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-200 text-slate-500'
                    }`}
                  >
                    {isStepComplete(step) ? '✓' : step}
                  </div>
                  <span
                    className={`ml-2 text-sm font-medium ${
                      step === currentStep ? 'text-slate-900' : 'text-slate-500'
                    }`}
                  >
                    {getStepNumber(step)}
                  </span>
                  {step < 4 && (
                    <div className="ml-8 w-8 h-0.5 bg-slate-200"></div>
                  )}
                </div>
              ))}
            </div>
            <button
              onClick={() => navigate('/admin/employees')}
              className="text-sm text-slate-600 hover:text-slate-900"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-4xl mx-auto px-6 py-8">
        {/* Step 1: Identity */}
        {currentStep === 1 && (
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 mb-6">Employee Identity</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Employee Code *
                </label>
                <input
                  type="text"
                  value={formData.employeeCode}
                  onChange={(e) => handleInputChange(1, 'employeeCode', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="e.g., EMP001"
                />
                {errors.employeeCode && (
                  <p className="mt-1 text-sm text-red-600">{errors.employeeCode}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  value={formData.firstName}
                  onChange={(e) => handleInputChange(1, 'firstName', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="John"
                />
                {errors.firstName && (
                  <p className="mt-1 text-sm text-red-600">{errors.firstName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  value={formData.lastName}
                  onChange={(e) => handleInputChange(1, 'lastName', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="Doe"
                />
                {errors.lastName && (
                  <p className="mt-1 text-sm text-red-600">{errors.lastName}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Email *
                </label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => handleInputChange(1, 'email', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="john.doe@company.com"
                />
                {errors.email && (
                  <p className="mt-1 text-sm text-red-600">{errors.email}</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Phone
                </label>
                <input
                  type="tel"
                  value={formData.phone}
                  onChange={(e) => handleInputChange(1, 'phone', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="+1 234 567 8900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Joining Date *
                </label>
                <input
                  type="date"
                  value={formData.joiningDate}
                  onChange={(e) => handleInputChange(1, 'joiningDate', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                />
                {errors.joiningDate && (
                  <p className="mt-1 text-sm text-red-600">{errors.joiningDate}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Employment Type *
                </label>
                <select
                  value={formData.employmentType}
                  onChange={(e) => handleInputChange(1, 'employmentType', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="">Select employment type</option>
                  <option value="INTERN">Intern</option>
                  <option value="TRAINEE">Trainee</option>
                  <option value="CONTRACT">Contract</option>
                  <option value="FULL_TIME">Full-time</option>
                </select>
                {errors.employmentType && (
                  <p className="mt-1 text-sm text-red-600">{errors.employmentType}</p>
                )}
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={() => navigate('/admin/employees')}
                className="px-4 py-2 text-slate-600 hover:text-slate-900"
              >
                Cancel
              </button>
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
              >
                Continue to Scope
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Employment Scope */}
        {currentStep === 2 && (
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 mb-2">Employment Scope</h1>
            <p className="text-slate-600 mb-6">Choose how this employee's costs and contributions are tracked</p>

            {/* Warning */}
            <div className="mb-6 p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <div className="flex items-start gap-3">
                <svg className="w-5 h-5 text-amber-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-amber-800">Financial Impact Notice</h3>
                  <p className="text-sm text-amber-700 mt-1">This decision affects financial reports.</p>
                </div>
              </div>
            </div>

            {/* Scope Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              <div
                className={`border-2 rounded-lg p-6 cursor-pointer transition-colors ${
                  formData.scope === 'COMPANY'
                    ? 'border-slate-900 bg-slate-50'
                    : 'border-slate-200 hover:border-slate-400'
                }`}
                onClick={() => handleInputChange(2, 'scope', 'COMPANY')}
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">COMPANY</h3>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-blue-100 text-blue-800">
                    Shared Cost
                  </span>
                </div>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>• Works across company</li>
                  <li>• Salary treated as company overhead</li>
                  <li>• Not counted in division P&L</li>
                  <li>• Timesheet mandatory</li>
                </ul>
                <div className="mt-4">
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${
                      formData.scope === 'COMPANY'
                        ? 'border-slate-900 bg-slate-900'
                        : 'border-slate-300'
                    }`}
                  >
                    {formData.scope === 'COMPANY' && (
                      <div className="w-full h-full rounded-full bg-white scale-50"></div>
                    )}
                  </div>
                </div>
              </div>

              <div
                className={`border-2 rounded-lg p-6 cursor-pointer transition-colors ${
                  formData.scope === 'DIVISION'
                    ? 'border-slate-900 bg-slate-50'
                    : 'border-slate-200 hover:border-slate-400'
                }`}
                onClick={() => handleInputChange(2, 'scope', 'DIVISION')}
              >
                <div className="flex items-start justify-between mb-4">
                  <h3 className="text-lg font-semibold text-slate-900">DIVISION</h3>
                  <span className="px-2 py-1 text-xs font-medium rounded-full bg-green-100 text-green-800">
                    Dedicated Resource
                  </span>
                </div>
                <ul className="space-y-2 text-sm text-slate-600">
                  <li>• Salary belongs to one division</li>
                  <li>• Appears in division P&L</li>
                  <li>• Division selection mandatory</li>
                  <li>• Cost tracking by division</li>
                </ul>
                <div className="mt-4">
                  <div
                    className={`w-4 h-4 rounded-full border-2 ${
                      formData.scope === 'DIVISION'
                        ? 'border-slate-900 bg-slate-900'
                        : 'border-slate-300'
                    }`}
                  >
                    {formData.scope === 'DIVISION' && (
                      <div className="w-full h-full rounded-full bg-white scale-50"></div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Division Selection (only if DIVISION scope) */}
            {formData.scope === 'DIVISION' && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Select Division *
                </label>
                <select
                  value={formData.primaryDivisionId}
                  onChange={(e) => handleInputChange(2, 'primaryDivisionId', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                >
                  <option value="">Select a division</option>
                  <option value="rws">RWS</option>
                  <option value="tws">TWS</option>
                  <option value="products">Products</option>
                  <option value="internal">Internal</option>
                </select>
                {errors.primaryDivisionId && (
                  <p className="mt-1 text-sm text-red-600">{errors.primaryDivisionId}</p>
                )}
              </div>
            )}

            {/* Confirmation Checkbox */}
            <div className="mb-6">
              <label className="flex items-start gap-3">
                <input
                  type="checkbox"
                  checked={formData.scopeConfirmation}
                  onChange={(e) => handleInputChange(2, 'scopeConfirmation', e.target.checked)}
                  className="mt-1 w-4 h-4 text-slate-900 border-slate-300 rounded focus:ring-slate-500"
                />
                <span className="text-sm text-slate-700">
                  I understand this decision affects financial reporting.
                </span>
              </label>
              {errors.scopeConfirmation && (
                <p className="mt-1 text-sm text-red-600">{errors.scopeConfirmation}</p>
              )}
            </div>

            <div className="flex justify-between">
              <button
                onClick={handleBack}
                className="px-4 py-2 text-slate-600 hover:text-slate-900"
              >
                ← Back
              </button>
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
              >
                Continue to Compensation
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Compensation */}
        {currentStep === 3 && (
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 mb-6">Compensation</h1>

            {!canEditCompensation ? (
              <div className="bg-slate-50 border border-slate-200 rounded-lg p-6 text-center">
                <svg className="w-12 h-12 text-slate-400 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                <h3 className="text-lg font-medium text-slate-900 mb-2">Access Restricted</h3>
                <p className="text-slate-600 mb-4">
                  Only HR Admin, Finance Admin, and Founder can set compensation details.
                </p>
                <p className="text-sm text-slate-500">
                  You can skip this step and proceed to access configuration.
                </p>
              </div>
            ) : (
              <div>
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                  <div className="flex items-start gap-3">
                    <svg className="w-5 h-5 text-blue-600 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-medium text-blue-800">Audit Notice</h3>
                      <p className="text-sm text-blue-700 mt-1">
                        Compensation history is preserved for audit accuracy. This is append-only.
                      </p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Salary Type *
                    </label>
                    <select
                      value={formData.salaryType}
                      onChange={(e) => handleInputChange(3, 'salaryType', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                    >
                      <option value="">Select salary type</option>
                      <option value="MONTHLY_FIXED">Monthly Fixed</option>
                      <option value="STIPEND">Stipend</option>
                    </select>
                    {errors.salaryType && (
                      <p className="mt-1 text-sm text-red-600">{errors.salaryType}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Amount *
                    </label>
                    <input
                      type="number"
                      value={formData.amount}
                      onChange={(e) => handleInputChange(3, 'amount', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                      placeholder="5000"
                    />
                    {errors.amount && (
                      <p className="mt-1 text-sm text-red-600">{errors.amount}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Currency *
                    </label>
                    <select
                      value={formData.currency}
                      onChange={(e) => handleInputChange(3, 'currency', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                    >
                      <option value="">Select currency</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                      <option value="INR">INR</option>
                    </select>
                    {errors.currency && (
                      <p className="mt-1 text-sm text-red-600">{errors.currency}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Effective From *
                    </label>
                    <input
                      type="date"
                      value={formData.effectiveFrom}
                      onChange={(e) => handleInputChange(3, 'effectiveFrom', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                    />
                    {errors.effectiveFrom && (
                      <p className="mt-1 text-sm text-red-600">{errors.effectiveFrom}</p>
                )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      End Date (Optional)
                    </label>
                    <input
                      type="date"
                      value={formData.effectiveTo}
                      onChange={(e) => handleInputChange(3, 'effectiveTo', e.target.value)}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Notes
                    </label>
                    <textarea
                      value={formData.compensationNotes}
                      onChange={(e) => handleInputChange(3, 'compensationNotes', e.target.value)}
                      rows={3}
                      className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                      placeholder="Any additional notes about compensation..."
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="mt-8 flex justify-between">
              <button
                onClick={handleBack}
                className="px-4 py-2 text-slate-600 hover:text-slate-900"
              >
                ← Back
              </button>
              <button
                onClick={handleNext}
                className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800"
              >
                Continue to Access
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Access & Reporting */}
        {currentStep === 4 && (
          <div>
            <h1 className="text-2xl font-semibold text-slate-900 mb-6">Access & Reporting</h1>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Reporting Manager
                </label>
                <select
                  value={formData.reportingManager}
                  onChange={(e) => handleInputChange(4, 'reportingManager', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  disabled={isLoadingManagers}
                >
                  <option value="">Select manager (optional)</option>
                  {reportingManagers.map((manager) => (
                    <option key={manager.id} value={manager.id}>
                      {manager.name}{manager.designation ? ` - ${manager.designation}` : ''}
                    </option>
                  ))}
                </select>
                {isLoadingManagers && (
                  <p className="mt-1 text-sm text-slate-500">Loading managers...</p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  Designation *
                </label>
                <input
                  type="text"
                  value={formData.designation}
                  onChange={(e) => handleInputChange(4, 'designation', e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-slate-500"
                  placeholder="Software Engineer"
                />
                {errors.designation && (
                  <p className="mt-1 text-sm text-red-600">{errors.designation}</p>
                )}
              </div>

              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-slate-700 mb-2">
                  System Role *
                </label>
                <div className="space-y-3">
                  {[
                    { id: 'EMPLOYEE', name: 'Employee', description: 'Basic employee access' },
                    { id: 'HR_ADMIN', name: 'HR Admin', description: 'HR management access', restricted: true },
                    { id: 'FINANCE_ADMIN', name: 'Finance Admin', description: 'Financial access', restricted: true },
                    { id: 'FOUNDER', name: 'Founder', description: 'Full system access', restricted: true }
                  ].map((role) => (
                    <label key={role.id} className="flex items-center p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                      <input
                        type="radio"
                        name="systemRole"
                        value={role.id}
                        checked={formData.roleId === role.id}
                        onChange={(e) => handleInputChange(4, 'roleId', e.target.value)}
                        className="mr-3"
                      />
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium text-slate-900">{role.name}</span>
                          {role.restricted && <span className="text-slate-400">🔒</span>}
                        </div>
                        <p className="text-sm text-slate-600">{role.description}</p>
                      </div>
                    </label>
                  ))}
                </div>
                {errors.roleId && (
                  <p className="mt-1 text-sm text-red-600">{errors.roleId}</p>
                )}
              </div>
            </div>

            <div className="mt-8 flex justify-between">
              <button
                onClick={handleBack}
                className="px-4 py-2 text-slate-600 hover:text-slate-900"
              >
                ← Back
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-2 bg-slate-900 text-white rounded-lg hover:bg-slate-800 disabled:bg-slate-300"
              >
                {isSubmitting ? 'Creating Employee...' : 'Create Employee'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
