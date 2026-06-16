import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

interface SalarySlipPDFProps {
  entry: any
  school?: { name?: string; address?: string; phone?: string; email?: string; logo_url?: string } | null
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Times-Roman',
    fontSize: 10,
    color: '#1f2937',
  },
  header: {
    textAlign: 'center',
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#1f2937',
    paddingBottom: 12,
  },
  logo: {
    width: 56,
    height: 56,
    marginBottom: 6,
    alignSelf: 'center',
  },
  schoolName: {
    fontSize: 20,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 2,
  },
  schoolDetail: {
    fontSize: 9,
    color: '#6b7280',
    marginTop: 2,
  },
  slipTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
    textTransform: 'uppercase',
  },
  periodRow: {
    textAlign: 'center',
    fontSize: 10,
    color: '#6b7280',
    marginBottom: 20,
  },
  sectionCard: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    marginBottom: 16,
    borderRadius: 2,
  },
  sectionHeader: {
    backgroundColor: '#f3f4f6',
    padding: '6 10',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    fontSize: 10,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  sectionBody: {
    padding: 8,
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 3,
  },
  infoLabel: {
    width: '30%',
    fontSize: 9,
    color: '#6b7280',
  },
  infoValue: {
    width: '70%',
    fontSize: 9,
    fontWeight: 'medium',
  },
  earningsTable: {
    width: '100%',
    marginTop: 8,
  },
  earningsHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingVertical: 4,
    backgroundColor: '#f9fafb',
  },
  earningsHeaderCell: {
    fontSize: 9,
    fontWeight: 'bold',
  },
  earningsRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    paddingVertical: 4,
  },
  earningsCell: {
    fontSize: 9,
  },
  earningsLabelCol: { width: '50%', textAlign: 'left' },
  earningsAmountCol: { width: '25%', textAlign: 'right' },
  earningsTypeCol: { width: '25%', textAlign: 'center' },
  totalRow: {
    flexDirection: 'row',
    borderTopWidth: 2,
    borderTopColor: '#1f2937',
    paddingVertical: 6,
    fontWeight: 'bold',
    fontSize: 11,
  },
  netPayBox: {
    borderWidth: 2,
    borderColor: '#1f2937',
    padding: 12,
    marginTop: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  netPayLabel: {
    fontSize: 10,
    color: '#6b7280',
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  netPayAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    marginTop: 4,
  },
  bankInfo: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
    fontSize: 8,
    color: '#6b7280',
  },
  statusBadge: {
    fontSize: 9,
    fontWeight: 'bold',
    padding: '3 8',
    borderRadius: 4,
  },
  statusPaid: { color: '#16a34a' },
  statusPending: { color: '#ca8a04' },
  statusProcessed: { color: '#2563eb' },
  footer: {
    marginTop: 24,
    textAlign: 'center',
    fontSize: 9,
    color: '#9ca3af',
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
    paddingTop: 12,
  },
})

const statusStyle = (status: string) => {
  switch (status) {
    case 'paid': return styles.statusPaid
    case 'processed': return styles.statusProcessed
    default: return styles.statusPending
  }
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']

export function SalarySlipPDF({ entry, school }: SalarySlipPDFProps) {
  const e = entry
  const employee = e?.employees
  const profile = employee?.profiles
  const allowances: Record<string, number> = (e?.allowances as Record<string, number>) ?? {}
  const deductions: Record<string, number> = (e?.deductions as Record<string, number>) ?? {}
  const monthName = MONTHS[(e?.month ?? 1) - 1] || ''

  const totalAllowances = Object.values(allowances).reduce((s: any, v: any) => s + Number(v), 0)
  const totalDeductions = Object.values(deductions).reduce((s: any, v: any) => s + Number(v), 0)

  return (
    <Document title={`Salary Slip - ${profile?.first_name ?? ''} ${profile?.last_name ?? ''} - ${monthName} ${e?.year}`} author={school?.name}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {school?.logo_url && <Image style={styles.logo} src={school.logo_url} />}
          <Text style={styles.schoolName}>{school?.name ?? 'School Name'}</Text>
          <Text style={styles.schoolDetail}>{school?.address}</Text>
          <Text style={styles.schoolDetail}>{school?.phone} · {school?.email}</Text>
        </View>

        <Text style={styles.slipTitle}>PAYROLL SALARY SLIP</Text>
        <Text style={styles.periodRow}>Pay Period: {monthName} {e?.year}</Text>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Employee Information</Text>
          <View style={styles.sectionBody}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Employee Name</Text>
              <Text style={styles.infoValue}>{profile?.first_name} {profile?.last_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Employee No.</Text>
              <Text style={styles.infoValue}>{employee?.employee_number ?? '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Department</Text>
              <Text style={styles.infoValue}>{employee?.department ?? '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Position</Text>
              <Text style={styles.infoValue}>{employee?.position ?? '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Contract Type</Text>
              <Text style={styles.infoValue}>{employee?.contract_type ?? '—'}</Text>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Earnings</Text>
          <View style={styles.sectionBody}>
            <View style={styles.earningsTable}>
              <View style={styles.earningsHeader}>
                <Text style={[styles.earningsHeaderCell, styles.earningsLabelCol]}>Description</Text>
                <Text style={[styles.earningsHeaderCell, styles.earningsTypeCol]}>Type</Text>
                <Text style={[styles.earningsHeaderCell, styles.earningsAmountCol]}>Amount (KES)</Text>
              </View>
              <View style={styles.earningsRow}>
                <Text style={[styles.earningsCell, styles.earningsLabelCol]}>Basic Salary</Text>
                <Text style={[styles.earningsCell, styles.earningsTypeCol]}>Fixed</Text>
                <Text style={[styles.earningsCell, styles.earningsAmountCol]}>{Number(e?.basic_salary ?? 0).toLocaleString()}</Text>
              </View>
              {Object.entries(allowances).map(([key, val]) => (
                <View key={key} style={styles.earningsRow}>
                  <Text style={[styles.earningsCell, styles.earningsLabelCol]}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                  <Text style={[styles.earningsCell, styles.earningsTypeCol]}>Allowance</Text>
                  <Text style={[styles.earningsCell, styles.earningsAmountCol]}>{Number(val).toLocaleString()}</Text>
                </View>
              ))}
              <View style={[styles.earningsRow, { fontWeight: 'bold', backgroundColor: '#f0fdf4' }]}>
                <Text style={[styles.earningsCell, styles.earningsLabelCol, { fontWeight: 'bold' }]}>Gross Salary</Text>
                <Text style={[styles.earningsCell, styles.earningsTypeCol]} />
                <Text style={[styles.earningsCell, styles.earningsAmountCol, { fontWeight: 'bold' }]}>{Number(e?.gross_salary ?? 0).toLocaleString()}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.sectionCard}>
          <Text style={styles.sectionHeader}>Deductions</Text>
          <View style={styles.sectionBody}>
            <View style={styles.earningsTable}>
              <View style={styles.earningsHeader}>
                <Text style={[styles.earningsHeaderCell, styles.earningsLabelCol]}>Description</Text>
                <Text style={[styles.earningsHeaderCell, styles.earningsTypeCol]}>Type</Text>
                <Text style={[styles.earningsHeaderCell, styles.earningsAmountCol]}>Amount (KES)</Text>
              </View>
              {Object.keys(deductions).length === 0 ? (
                <View style={styles.earningsRow}>
                  <Text style={[styles.earningsCell, styles.earningsLabelCol, { color: '#9ca3af' }]}>No deductions</Text>
                  <Text style={[styles.earningsCell, styles.earningsTypeCol]} />
                  <Text style={[styles.earningsCell, styles.earningsAmountCol]}>0</Text>
                </View>
              ) : (
                Object.entries(deductions).map(([key, val]) => (
                  <View key={key} style={styles.earningsRow}>
                    <Text style={[styles.earningsCell, styles.earningsLabelCol]}>{key.charAt(0).toUpperCase() + key.slice(1)}</Text>
                    <Text style={[styles.earningsCell, styles.earningsTypeCol]}>Deduction</Text>
                    <Text style={[styles.earningsCell, styles.earningsAmountCol]}>{Number(val).toLocaleString()}</Text>
                  </View>
                ))
              )}
              <View style={[styles.earningsRow, { fontWeight: 'bold', backgroundColor: '#fef2f2' }]}>
                <Text style={[styles.earningsCell, styles.earningsLabelCol, { fontWeight: 'bold' }]}>Total Deductions</Text>
                <Text style={[styles.earningsCell, styles.earningsTypeCol]} />
                <Text style={[styles.earningsCell, styles.earningsAmountCol, { fontWeight: 'bold' }]}>{totalDeductions.toLocaleString()}</Text>
              </View>
            </View>
          </View>
        </View>

        <View style={styles.netPayBox}>
          <Text style={styles.netPayLabel}>Net Pay</Text>
          <Text style={styles.netPayAmount}>KES {Number(e?.net_salary ?? 0).toLocaleString()}</Text>
          <Text style={[styles.statusBadge, statusStyle(e?.status), { marginTop: 6 }]}>
            {e?.status?.toUpperCase() ?? 'PENDING'}
          </Text>
        </View>

        {employee?.bank_name && (
          <View style={styles.bankInfo}>
            <Text>Bank: {employee.bank_name}</Text>
            <Text>Account: {employee.bank_account ? `****${employee.bank_account.slice(-4)}` : '—'}</Text>
            <Text>Period: {monthName} {e?.year}</Text>
          </View>
        )}

        <View style={styles.footer}>
          <Text>This is a computer-generated salary slip. No signature required.</Text>
          <Text>Generated on {new Date().toLocaleString()}</Text>
        </View>
      </Page>
    </Document>
  )
}
