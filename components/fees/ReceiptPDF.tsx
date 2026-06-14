import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer'

interface ReceiptPDFProps {
  invoice: any
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
  },
  logo: {
    width: 64,
    height: 64,
    marginBottom: 8,
    alignSelf: 'center',
  },
  schoolName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  schoolDetail: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
  divider: {
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    marginVertical: 12,
  },
  receiptHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  receiptTitle: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  receiptNumber: {
    fontSize: 10,
    color: '#6b7280',
    marginTop: 2,
  },
  badge: {
    fontSize: 10,
    fontWeight: 'bold',
    padding: '4 12',
    borderRadius: 4,
  },
  badgePaid: { color: '#16a34a' },
  badgePartial: { color: '#ca8a04' },
  badgePending: { color: '#dc2626' },
  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 16,
  },
  infoItem: {
    width: '50%',
    marginBottom: 8,
  },
  infoLabel: {
    fontSize: 9,
    color: '#6b7280',
    marginBottom: 2,
  },
  infoValue: {
    fontSize: 10,
    fontWeight: 'medium',
  },
  table: {
    width: '100%',
    marginBottom: 20,
  },
  tableHeader: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingVertical: 6,
  },
  tableHeaderCell: {
    fontSize: 10,
    fontWeight: 'medium',
  },
  descCol: { width: '60%', textAlign: 'left' },
  amountCol: { width: '40%', textAlign: 'right' },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingVertical: 8,
  },
  tableCell: {
    fontSize: 10,
  },
  paymentRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingVertical: 6,
    color: '#16a34a',
  },
  totalRow: {
    flexDirection: 'row',
    borderTopWidth: 2,
    borderTopColor: '#1f2937',
    paddingVertical: 8,
    fontWeight: 'bold',
    fontSize: 11,
  },
  footer: {
    marginTop: 24,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#d1d5db',
    textAlign: 'center',
    fontSize: 9,
    color: '#9ca3af',
  },
})

const badgeStyle = (status: string) => {
  switch (status) {
    case 'paid': return styles.badgePaid
    case 'partial': return styles.badgePartial
    default: return styles.badgePending
  }
}

export function ReceiptPDF({ invoice, school }: ReceiptPDFProps) {
  const student = invoice?.students
  const profile = student?.profiles
  const fee = invoice?.fee_structures
  const payments = invoice?.payments ?? []

  return (
    <Document title={`Receipt - ${invoice?.invoice_number}`} author={school?.name}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          {school?.logo_url && (
            <Image style={styles.logo} src={school.logo_url} />
          )}
          <Text style={styles.schoolName}>{school?.name ?? 'School Name'}</Text>
          <Text style={styles.schoolDetail}>{school?.address}</Text>
          <Text style={styles.schoolDetail}>{school?.phone} · {school?.email}</Text>
        </View>

        <View style={styles.divider} />

        <View style={styles.receiptHeader}>
          <View>
            <Text style={styles.receiptTitle}>OFFICIAL RECEIPT</Text>
            <Text style={styles.receiptNumber}>Receipt: {invoice?.invoice_number}</Text>
          </View>
          <Text style={[styles.badge, badgeStyle(invoice?.status)]}>{invoice?.status?.toUpperCase()}</Text>
        </View>

        <View style={styles.infoGrid}>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Student Name</Text>
            <Text style={styles.infoValue}>{profile?.first_name} {profile?.last_name}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Admission No.</Text>
            <Text style={styles.infoValue}>{student?.admission_number}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Fee Type</Text>
            <Text style={styles.infoValue}>{fee?.name}</Text>
          </View>
          <View style={styles.infoItem}>
            <Text style={styles.infoLabel}>Due Date</Text>
            <Text style={styles.infoValue}>{invoice?.due_date ?? 'N/A'}</Text>
          </View>
        </View>

        <View style={styles.divider} />

        <View style={styles.table}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.descCol]}>Description</Text>
            <Text style={[styles.tableHeaderCell, styles.amountCol]}>Amount (KES)</Text>
          </View>
          <View style={styles.tableRow}>
            <Text style={[styles.tableCell, styles.descCol]}>{invoice?.description ?? fee?.name}</Text>
            <Text style={[styles.tableCell, styles.amountCol]}>{Number(invoice?.amount).toLocaleString()}</Text>
          </View>
          {payments.map((p: any, i: number) => (
            <View key={i} style={styles.paymentRow}>
              <Text style={[styles.tableCell, styles.descCol]}>
                Payment via {p.payment_method} - {p.paid_at ? new Date(p.paid_at).toLocaleDateString() : ''}
              </Text>
              <Text style={[styles.tableCell, styles.amountCol]}>-{Number(p.amount).toLocaleString()}</Text>
            </View>
          ))}
          <View style={styles.totalRow}>
            <Text style={styles.descCol}>Balance</Text>
            <Text style={styles.amountCol}>KES {Number(invoice?.balance).toLocaleString()}</Text>
          </View>
        </View>

        <View style={styles.footer}>
          <Text>This is a computer-generated receipt. No signature required.</Text>
          <Text>Generated on {new Date().toLocaleString()}</Text>
        </View>
      </Page>
    </Document>
  )
}
