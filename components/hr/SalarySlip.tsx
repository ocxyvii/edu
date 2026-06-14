'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Download, Loader2 } from 'lucide-react'
import { pdf } from '@react-pdf/renderer'
import { SalarySlipPDF } from './SalarySlipPDF'

interface SalarySlipProps {
  entry: any
  school?: { name?: string; address?: string; phone?: string; email?: string; logo_url?: string } | null
}

export function SalarySlip({ entry, school }: SalarySlipProps) {
  const [loading, setLoading] = useState(false)
  const employee = entry?.employees
  const profile = employee?.profiles
  const allowances: Record<string, number> = (entry?.allowances as Record<string, number>) ?? {}
  const deductions: Record<string, number> = (entry?.deductions as Record<string, number>) ?? {}
  const totalAllowances = Object.values(allowances).reduce((s, v) => s + Number(v), 0)
  const totalDeductions = Object.values(deductions).reduce((s, v) => s + Number(v), 0)
  const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  const monthName = MONTHS[(entry?.month ?? 1) - 1] || ''

  const handleDownload = async () => {
    setLoading(true)
    try {
      const blob = await pdf(<SalarySlipPDF entry={entry} school={school} />).toBlob()
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `salary-slip-${(profile?.first_name ?? 'employee').replace(/\s+/g, '-').toLowerCase()}-${monthName.toLowerCase()}-${entry?.year}.pdf`
      document.body.appendChild(a)
      a.click()
      document.body.removeChild(a)
      URL.revokeObjectURL(url)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={handleDownload} variant="outline" size="sm" disabled={loading}>
          {loading ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <Download className="h-4 w-4 mr-2" />
          )}
          {loading ? 'Generating PDF...' : 'Download PDF'}
        </Button>
      </div>

      <div className="bg-white border rounded-lg p-6 max-w-[210mm] mx-auto text-sm">
        <div className="text-center border-b-2 border-gray-900 pb-4 mb-4">
          {school?.logo_url && (
            <img src={school.logo_url} alt="School Logo" className="h-12 mx-auto mb-2" />
          )}
          <h2 className="text-lg font-bold uppercase tracking-wider">{school?.name ?? 'School Name'}</h2>
          <p className="text-xs text-gray-500">{school?.address}</p>
          <p className="text-xs text-gray-500">{school?.phone} · {school?.email}</p>
        </div>

        <h3 className="text-base font-bold text-center uppercase mb-1">PAYROLL SALARY SLIP</h3>
        <p className="text-xs text-gray-500 text-center mb-4">Pay Period: {monthName} {entry?.year}</p>

        <div className="border rounded mb-4">
          <div className="bg-gray-50 px-3 py-2 text-xs font-bold uppercase border-b">Employee Information</div>
          <div className="p-3 space-y-2 text-xs">
            <div className="flex">
              <span className="text-gray-500 w-28">Employee Name</span>
              <span className="font-medium">{profile?.first_name} {profile?.last_name}</span>
            </div>
            <div className="flex">
              <span className="text-gray-500 w-28">Employee No.</span>
              <span className="font-medium">{employee?.employee_number ?? '—'}</span>
            </div>
            <div className="flex">
              <span className="text-gray-500 w-28">Department</span>
              <span className="font-medium">{employee?.department ?? '—'}</span>
            </div>
            <div className="flex">
              <span className="text-gray-500 w-28">Position</span>
              <span className="font-medium">{employee?.position ?? '—'}</span>
            </div>
            <div className="flex">
              <span className="text-gray-500 w-28">Contract Type</span>
              <span className="font-medium capitalize">{employee?.contract_type ?? '—'}</span>
            </div>
          </div>
        </div>

        <div className="border rounded mb-4">
          <div className="bg-gray-50 px-3 py-2 text-xs font-bold uppercase border-b">Earnings</div>
          <div className="p-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="text-left py-1 font-medium">Description</th>
                  <th className="text-center py-1 font-medium">Type</th>
                  <th className="text-right py-1 font-medium">Amount (KES)</th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-b">
                  <td className="py-2">Basic Salary</td>
                  <td className="py-2 text-center text-gray-500">Fixed</td>
                  <td className="py-2 text-right">{Number(entry?.basic_salary ?? 0).toLocaleString()}</td>
                </tr>
                {Object.entries(allowances).map(([key, val]) => (
                  <tr key={key} className="border-b">
                    <td className="py-2 capitalize">{key}</td>
                    <td className="py-2 text-center text-gray-500">Allowance</td>
                    <td className="py-2 text-right">{Number(val).toLocaleString()}</td>
                  </tr>
                ))}
                <tr className="bg-green-50 font-bold">
                  <td className="py-2">Gross Salary</td>
                  <td className="py-2 text-center" />
                  <td className="py-2 text-right">{Number(entry?.gross_salary ?? 0).toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="border rounded mb-4">
          <div className="bg-gray-50 px-3 py-2 text-xs font-bold uppercase border-b">Deductions</div>
          <div className="p-3">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b text-gray-500">
                  <th className="text-left py-1 font-medium">Description</th>
                  <th className="text-center py-1 font-medium">Type</th>
                  <th className="text-right py-1 font-medium">Amount (KES)</th>
                </tr>
              </thead>
              <tbody>
                {Object.keys(deductions).length === 0 ? (
                  <tr>
                    <td className="py-2 text-gray-400" colSpan={3}>No deductions</td>
                  </tr>
                ) : (
                  Object.entries(deductions).map(([key, val]) => (
                    <tr key={key} className="border-b">
                      <td className="py-2 capitalize">{key}</td>
                      <td className="py-2 text-center text-gray-500">Deduction</td>
                      <td className="py-2 text-right">{Number(val).toLocaleString()}</td>
                    </tr>
                  ))
                )}
                <tr className="bg-red-50 font-bold">
                  <td className="py-2">Total Deductions</td>
                  <td className="py-2 text-center" />
                  <td className="py-2 text-right">{totalDeductions.toLocaleString()}</td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>

        <div className="border-2 border-gray-900 p-4 text-center mb-4">
          <p className="text-xs text-gray-500 uppercase tracking-wider">Net Pay</p>
          <p className="text-xl font-bold">KES {Number(entry?.net_salary ?? 0).toLocaleString()}</p>
          <p className={`text-xs font-bold mt-1 ${
            entry?.status === 'paid' ? 'text-green-600' :
            entry?.status === 'processed' ? 'text-blue-600' :
            'text-yellow-600'
          }`}>
            {(entry?.status ?? 'pending').toUpperCase()}
          </p>
        </div>

        {employee?.bank_name && (
          <div className="flex justify-between text-[10px] text-gray-500 border-t pt-2 mt-2">
            <span>Bank: {employee.bank_name}</span>
            <span>Account: ****{employee.bank_account?.slice(-4) ?? '—'}</span>
            <span>Period: {monthName} {entry?.year}</span>
          </div>
        )}

        <p className="text-center text-[10px] text-gray-400 border-t pt-3 mt-4">
          This is a computer-generated salary slip. No signature required.
          <br />
          Generated on {new Date().toLocaleString()}
        </p>
      </div>
    </div>
  )
}
