import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

interface SubjectResult {
  subject: string
  code: string
  maxMarks: number
  passMarks: number
  marksObtained: number | null
  grade: string
  remarks: string
}

interface ReportCardData {
  exam: { name: string; type: string; start_date: string | null; end_date: string | null }
  term: string
  className: string
  student: { name: string; admissionNumber: string; section: string }
  subjects: SubjectResult[]
  summary: {
    totalMarks: number
    totalMaxMarks: number
    average: number
    percentage: number
    overallGrade: string
    passed: number
    totalSubjects: number
    position: number
    totalStudents: number
  }
}

interface ReportCardPDFProps {
  data: ReportCardData
  schoolName?: string
}

const styles = StyleSheet.create({
  page: {
    padding: 40,
    fontFamily: 'Times-Roman',
    fontSize: 11,
    color: '#1f2937',
  },
  header: {
    textAlign: 'center',
    marginBottom: 20,
    borderBottomWidth: 2,
    borderBottomColor: '#1f2937',
    paddingBottom: 12,
  },
  schoolName: {
    fontSize: 22,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
  reportTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 4,
    textTransform: 'uppercase',
  },
  headerSub: {
    fontSize: 11,
    color: '#6b7280',
    marginTop: 4,
  },
  infoTable: {
    width: '100%',
    marginBottom: 16,
  },
  infoRow: {
    flexDirection: 'row',
    paddingVertical: 2,
  },
  infoLabel: {
    fontWeight: 'bold',
    width: 100,
    fontSize: 10,
  },
  infoValue: {
    fontSize: 10,
    width: 180,
  },
  marksTable: {
    width: '100%',
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  tableHeaderCell: {
    padding: 6,
    fontSize: 9,
    fontWeight: 'bold',
    textAlign: 'center',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  tableCell: {
    padding: 6,
    fontSize: 10,
    textAlign: 'center',
  },
  tableCellLeft: {
    padding: 6,
    fontSize: 10,
    textAlign: 'left',
  },
  codeCol: { width: '10%' },
  subjectCol: { width: '22%' },
  maxCol: { width: '10%' },
  scoreCol: { width: '12%' },
  gradeCol: { width: '12%' },
  statusCol: { width: '12%' },
  remarksCol: { width: '22%' },
  summaryTable: {
    width: '100%',
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  summaryRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
  },
  summaryLabel: {
    padding: 6,
    fontSize: 10,
    fontWeight: 'bold',
    backgroundColor: '#f9fafb',
    width: '30%',
    borderRightWidth: 1,
    borderRightColor: '#d1d5db',
  },
  summaryValue: {
    padding: 6,
    fontSize: 10,
    width: '20%',
  },
  remarksSection: {
    marginBottom: 16,
  },
  remarksLabel: {
    fontWeight: 'bold',
    fontSize: 10,
    marginBottom: 4,
  },
  remarksBox: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    minHeight: 50,
    padding: 6,
    fontSize: 10,
  },
  signatures: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 32,
  },
  signatureItem: {
    alignItems: 'center',
    width: '30%',
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    width: '100%',
    paddingTop: 4,
    fontSize: 10,
    textAlign: 'center',
    marginTop: 32,
  },
  gradeA: { color: '#16a34a' },
  gradeB: { color: '#2563eb' },
  gradeC: { color: '#ca8a04' },
  gradeD: { color: '#ea580c' },
  gradeF: { color: '#dc2626' },
  passText: { color: '#16a34a' },
  failText: { color: '#dc2626' },
})

const gradeStyle = (grade: string) => {
  const map: Record<string, any> = {
    A: styles.gradeA,
    B: styles.gradeB,
    C: styles.gradeC,
    D: styles.gradeD,
    F: styles.gradeF,
  }
  return map[grade] || {}
}

const summaryGradeStyle = (grade: string) => gradeStyle(grade)

export function ReportCardPDF({ data, schoolName = 'EduCore School' }: ReportCardPDFProps) {
  return (
    <Document title={`Report Card - ${data.student.name}`} author={schoolName}>
      <Page size="A4" style={styles.page}>
        <View style={styles.header}>
          <Text style={styles.schoolName}>{schoolName}</Text>
          <Text style={styles.reportTitle}>STUDENT REPORT CARD</Text>
          <Text style={styles.headerSub}>
            {data.exam.name} · {data.term} · {data.className}
          </Text>
        </View>

        <View style={styles.infoTable}>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Student Name:</Text>
            <Text style={styles.infoValue}>{data.student.name}</Text>
            <Text style={styles.infoLabel}>Admission No:</Text>
            <Text style={styles.infoValue}>{data.student.admissionNumber}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Class:</Text>
            <Text style={styles.infoValue}>{data.className}</Text>
            <Text style={styles.infoLabel}>Section:</Text>
            <Text style={styles.infoValue}>{data.student.section}</Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.infoLabel}>Exam:</Text>
            <Text style={styles.infoValue}>{data.exam.name} ({data.exam.type})</Text>
            <Text style={styles.infoLabel}>Term:</Text>
            <Text style={styles.infoValue}>{data.term}</Text>
          </View>
          {data.exam.start_date && (
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Date:</Text>
              <Text style={styles.infoValue}>
                {data.exam.start_date}{data.exam.end_date ? ` - ${data.exam.end_date}` : ''}
              </Text>
            </View>
          )}
        </View>

        <View style={styles.marksTable}>
          <View style={styles.tableHeader}>
            <Text style={[styles.tableHeaderCell, styles.codeCol]}>Code</Text>
            <Text style={[styles.tableHeaderCell, styles.subjectCol, { textAlign: 'left' }]}>Subject</Text>
            <Text style={[styles.tableHeaderCell, styles.maxCol]}>Max</Text>
            <Text style={[styles.tableHeaderCell, styles.scoreCol]}>Score</Text>
            <Text style={[styles.tableHeaderCell, styles.gradeCol]}>Grade</Text>
            <Text style={[styles.tableHeaderCell, styles.statusCol]}>Status</Text>
            <Text style={[styles.tableHeaderCell, styles.remarksCol, { textAlign: 'left' }]}>Remarks</Text>
          </View>
          {data.subjects.map((s: any, i: any) => {
            const passed = s.marksObtained !== null && s.marksObtained >= s.passMarks
            return (
              <View key={s.code} style={[styles.tableRow, i % 2 === 0 ? { backgroundColor: '#fafafa' } : {}]}>
                <Text style={[styles.tableCell, styles.codeCol]}>{s.code}</Text>
                <Text style={[styles.tableCellLeft, styles.subjectCol]}>{s.subject}</Text>
                <Text style={[styles.tableCell, styles.maxCol]}>{s.maxMarks}</Text>
                <Text style={[styles.tableCell, styles.scoreCol, s.marksObtained === null ? { color: '#9ca3af' } : {}]}>
                  {s.marksObtained ?? '-'}
                </Text>
                <Text style={[styles.tableCell, styles.gradeCol, { fontWeight: 'bold' }, gradeStyle(s.grade)]}>
                  {s.grade}
                </Text>
                <Text style={[styles.tableCell, styles.statusCol, s.marksObtained === null
                  ? {}
                  : passed ? styles.passText : styles.failText
                ]}>
                  {s.marksObtained === null ? '-' : passed ? 'PASS' : 'FAIL'}
                </Text>
                <Text style={[styles.tableCellLeft, styles.remarksCol]}>{s.remarks || '-'}</Text>
              </View>
            )
          })}
        </View>

        <View style={styles.summaryTable}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Marks</Text>
            <Text style={styles.summaryValue}>{data.summary.totalMarks} / {data.summary.totalMaxMarks}</Text>
            <Text style={styles.summaryLabel}>Percentage</Text>
            <Text style={[styles.summaryValue, { fontWeight: 'bold' }, summaryGradeStyle(data.summary.overallGrade)]}>
              {data.summary.percentage}%
            </Text>
          </View>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Average</Text>
            <Text style={styles.summaryValue}>{data.summary.average}</Text>
            <Text style={styles.summaryLabel}>Overall Grade</Text>
            <Text style={[styles.summaryValue, { fontWeight: 'bold' }, summaryGradeStyle(data.summary.overallGrade)]}>
              {data.summary.overallGrade}
            </Text>
          </View>
          <View style={[styles.summaryRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.summaryLabel}>Passed Subjects</Text>
            <Text style={styles.summaryValue}>{data.summary.passed} / {data.summary.totalSubjects}</Text>
            <Text style={styles.summaryLabel}>Class Position</Text>
            <Text style={[styles.summaryValue, { fontWeight: 'bold' }]}>
              {data.summary.position} / {data.summary.totalStudents}
            </Text>
          </View>
        </View>

        <View style={styles.remarksSection}>
          <Text style={styles.remarksLabel}>Teacher's Remarks:</Text>
          <View style={styles.remarksBox}>
            <Text>{''}</Text>
          </View>
        </View>

        <View style={styles.signatures}>
          <View style={styles.signatureItem}>
            <Text style={styles.signatureLine}>Class Teacher</Text>
          </View>
          <View style={styles.signatureItem}>
            <Text style={styles.signatureLine}>Principal</Text>
          </View>
          <View style={styles.signatureItem}>
            <Text style={styles.signatureLine}>Parent/Guardian</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}
