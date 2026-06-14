import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer'

interface SubjectResult {
  subject: string
  code: string
  maxMarks: number
  marksObtained: number | null
  grade: string
}

interface AttendanceSummary {
  totalDays: number
  presentDays: number
  absentDays: number
  lateDays: number
  percentage: number
}

interface ReportCardData {
  schoolName: string
  schoolLogo?: string
  studentName: string
  admissionNumber: string
  className: string
  term: string
  academicYear: string
  subjects: SubjectResult[]
  summary: {
    totalMarks: number
    totalMaxMarks: number
    percentage: number
    overallGrade: string
    passed: number
    totalSubjects: number
    position: number
    totalStudents: number
  }
  attendance: AttendanceSummary
  teacherComment?: string
  principalName?: string
}

interface ReportCardProps {
  data: ReportCardData
}

const styles = StyleSheet.create({
  page: {
    padding: 32,
    fontFamily: 'Times-Roman',
    fontSize: 10,
    color: '#1f2937',
  },
  header: {
    textAlign: 'center',
    marginBottom: 16,
    borderBottomWidth: 2,
    borderBottomColor: '#1f2937',
    paddingBottom: 10,
  },
  schoolName: {
    fontSize: 20,
    fontWeight: 'bold',
    textTransform: 'uppercase',
    letterSpacing: 3,
  },
  reportTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 4,
  },
  termInfo: {
    fontSize: 10,
    marginTop: 2,
    color: '#4b5563',
  },
  section: {
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: 'bold',
    backgroundColor: '#f3f4f6',
    padding: '4 8',
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  studentInfoRow: {
    flexDirection: 'row',
    marginBottom: 3,
  },
  studentLabel: {
    width: 100,
    color: '#6b7280',
  },
  studentValue: {
    flex: 1,
    fontWeight: 'bold',
  },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: '#f3f4f6',
    borderBottomWidth: 1,
    borderBottomColor: '#d1d5db',
    paddingVertical: 4,
  },
  tableRow: {
    flexDirection: 'row',
    borderBottomWidth: 0.5,
    borderBottomColor: '#e5e7eb',
    paddingVertical: 3,
  },
  colSubject: { width: '35%', paddingHorizontal: 4, fontWeight: 'bold' },
  colCode: { width: '15%', paddingHorizontal: 4, color: '#6b7280' },
  colMax: { width: '15%', paddingHorizontal: 4, textAlign: 'center' },
  colObtained: { width: '15%', paddingHorizontal: 4, textAlign: 'center' },
  colGrade: { width: '10%', paddingHorizontal: 4, textAlign: 'center' },
  colRemark: { width: '10%', paddingHorizontal: 4, textAlign: 'center' },
  summaryRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    marginTop: 2,
  },
  summaryBold: { fontWeight: 'bold' },
  attendanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 2,
  },
  attendanceBox: {
    width: '22%',
    textAlign: 'center',
    padding: 6,
    borderWidth: 0.5,
    borderColor: '#d1d5db',
    borderRadius: 2,
  },
  attendanceNumber: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  attendanceLabel: {
    fontSize: 8,
    color: '#6b7280',
    marginTop: 2,
  },
  commentBox: {
    borderWidth: 0.5,
    borderColor: '#d1d5db',
    padding: 10,
    minHeight: 40,
    marginBottom: 4,
  },
  footer: {
    marginTop: 24,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  signatureBlock: {
    alignItems: 'center',
    width: '40%',
  },
  signatureLine: {
    borderTopWidth: 1,
    borderTopColor: '#1f2937',
    width: '100%',
    marginTop: 32,
    marginBottom: 4,
  },
  gradingScale: {
    marginTop: 16,
    padding: 8,
    borderWidth: 0.5,
    borderColor: '#d1d5db',
    borderRadius: 2,
  },
  gradingTitle: {
    fontSize: 9,
    fontWeight: 'bold',
    marginBottom: 3,
  },
  gradingRow: {
    flexDirection: 'row',
    fontSize: 8,
    color: '#6b7280',
  },
  gradingItem: {
    marginRight: 12,
  },
})

function GradeBadge({ grade }: { grade: string }) {
  const colors: Record<string, string> = {
    A: '#16a34a', B: '#2563eb', C: '#f59e0b', D: '#f97316', F: '#dc2626',
  }
  return (
    <Text style={{ color: colors[grade] || '#6b7280', fontWeight: 'bold' }}>
      {grade}
    </Text>
  )
}

export function ReportCardPDF({ data }: ReportCardProps) {
  const { subjects, summary, attendance, teacherComment, principalName, schoolName, schoolLogo, studentName, admissionNumber, className, term, academicYear } = data

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.schoolName}>{schoolName}</Text>
          <Text style={styles.reportTitle}>STUDENT REPORT CARD</Text>
          <Text style={styles.termInfo}>{term} | {academicYear}</Text>
        </View>

        {/* Student Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Student Information</Text>
          <View style={styles.studentInfoRow}>
            <Text style={styles.studentLabel}>Student Name:</Text>
            <Text style={styles.studentValue}>{studentName}</Text>
          </View>
          <View style={styles.studentInfoRow}>
            <Text style={styles.studentLabel}>Admission No:</Text>
            <Text style={styles.studentValue}>{admissionNumber}</Text>
          </View>
          <View style={styles.studentInfoRow}>
            <Text style={styles.studentLabel}>Class:</Text>
            <Text style={styles.studentValue}>{className}</Text>
          </View>
        </View>

        {/* Results Table */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Examination Results</Text>
          <View style={styles.tableHead}>
            <Text style={styles.colSubject}>Subject</Text>
            <Text style={styles.colCode}>Code</Text>
            <Text style={styles.colMax}>Max</Text>
            <Text style={styles.colObtained}>Score</Text>
            <Text style={styles.colGrade}>Grade</Text>
            <Text style={styles.colRemark}>Status</Text>
          </View>
          {subjects.map((s, i) => (
            <View key={i} style={styles.tableRow}>
              <Text style={styles.colSubject}>{s.subject}</Text>
              <Text style={styles.colCode}>{s.code}</Text>
              <Text style={styles.colMax}>{s.maxMarks}</Text>
              <Text style={styles.colObtained}>{s.marksObtained ?? '-'}</Text>
              <Text style={styles.colGrade}>
                <GradeBadge grade={s.grade} />
              </Text>
              <Text style={[styles.colRemark, { color: s.marksObtained != null && s.marksObtained >= 40 ? '#16a34a' : '#dc2626' }]}>
                {s.marksObtained != null ? (s.marksObtained >= 40 ? 'PASS' : 'FAIL') : '-'}
              </Text>
            </View>
          ))}
          <View style={styles.summaryRow}>
            <Text style={[styles.colSubject, styles.summaryBold]}>Total</Text>
            <Text style={styles.colCode} />
            <Text style={[styles.colMax, styles.summaryBold]}>{summary.totalMaxMarks}</Text>
            <Text style={[styles.colObtained, styles.summaryBold]}>{summary.totalMarks}</Text>
            <Text style={styles.colGrade} />
            <Text style={styles.colRemark} />
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 6, fontSize: 9 }}>
            <Text>Average: <Text style={{ fontWeight: 'bold' }}>{summary.percentage}%</Text></Text>
            <Text>Overall Grade: <Text style={{ fontWeight: 'bold' }}>{summary.overallGrade}</Text></Text>
            <Text>Class Rank: <Text style={{ fontWeight: 'bold' }}>{summary.position} of {summary.totalStudents}</Text></Text>
            <Text>Passed: <Text style={{ fontWeight: 'bold' }}>{summary.passed}/{summary.totalSubjects}</Text></Text>
          </View>
        </View>

        {/* Attendance Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Attendance Summary</Text>
          <View style={styles.attendanceRow}>
            <View style={styles.attendanceBox}>
              <Text style={styles.attendanceNumber}>{attendance.totalDays}</Text>
              <Text style={styles.attendanceLabel}>Total Days</Text>
            </View>
            <View style={styles.attendanceBox}>
              <Text style={[styles.attendanceNumber, { color: '#16a34a' }]}>{attendance.presentDays}</Text>
              <Text style={styles.attendanceLabel}>Present</Text>
            </View>
            <View style={styles.attendanceBox}>
              <Text style={[styles.attendanceNumber, { color: attendance.absentDays > 5 ? '#dc2626' : '#6b7280' }]}>{attendance.absentDays}</Text>
              <Text style={styles.attendanceLabel}>Absent</Text>
            </View>
            <View style={styles.attendanceBox}>
              <Text style={styles.attendanceNumber}>{attendance.lateDays}</Text>
              <Text style={styles.attendanceLabel}>Late</Text>
            </View>
          </View>
          <View style={{ marginTop: 4, flexDirection: 'row', justifyContent: 'center' }}>
            <Text style={{ fontSize: 9 }}>
              Attendance Rate: <Text style={{ fontWeight: 'bold', color: attendance.percentage >= 80 ? '#16a34a' : '#dc2626' }}>{attendance.percentage}%</Text>
            </Text>
          </View>
        </View>

        {/* Teacher Comment */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Teacher&apos;s Comment</Text>
          <View style={styles.commentBox}>
            <Text style={{ fontSize: 10, lineHeight: 1.5 }}>
              {teacherComment || 'No comment provided.'}
            </Text>
          </View>
        </View>

        {/* Signatures */}
        <View style={styles.footer}>
          <View style={styles.signatureBlock}>
            <Text style={{ fontSize: 9 }}>Class Teacher</Text>
            <View style={styles.signatureLine} />
            <Text style={{ fontSize: 8, color: '#6b7280' }}>Signature & Date</Text>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={{ fontSize: 9 }}>Principal</Text>
            <View style={styles.signatureLine} />
            <Text style={{ fontSize: 8, color: '#6b7280' }}>
              {principalName || 'Principal'}
              {principalName ? '' : ''}
            </Text>
          </View>
          <View style={styles.signatureBlock}>
            <Text style={{ fontSize: 9 }}>Parent/Guardian</Text>
            <View style={styles.signatureLine} />
            <Text style={{ fontSize: 8, color: '#6b7280' }}>Signature & Date</Text>
          </View>
        </View>

        {/* Grading Scale */}
        <View style={styles.gradingScale}>
          <Text style={styles.gradingTitle}>Grading Scale</Text>
          <View style={styles.gradingRow}>
            <Text style={styles.gradingItem}>A: 80-100% (Excellent)</Text>
            <Text style={styles.gradingItem}>B: 65-79% (Good)</Text>
            <Text style={styles.gradingItem}>C: 50-64% (Satisfactory)</Text>
            <Text style={styles.gradingItem}>D: 40-49% (Pass)</Text>
            <Text style={styles.gradingItem}>F: 0-39% (Fail)</Text>
          </View>
        </View>
      </Page>
    </Document>
  )
}

export function downloadReportCard(data: ReportCardData) {
  const { pdf } = require('@react-pdf/renderer')
  const blob = pdf(<ReportCardPDF data={data} />).toBlob()
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `report-card-${data.studentName.replace(/\s+/g, '-').toLowerCase()}.pdf`
  link.click()
  URL.revokeObjectURL(url)
}
