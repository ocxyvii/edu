'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQuery, useMutation } from '@tanstack/react-query'
import { getExamById, getQuestionsForExam, getOnlineExamSession, startOnlineExam, saveAnswers, submitOnlineExam } from '@/lib/actions/exam.actions'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { Progress } from '@/components/ui/progress'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { Label } from '@/components/ui/label'
import {
  Dialog, DialogTrigger, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose,
} from '@/components/ui/dialog'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import { Clock, AlertTriangle, CheckCircle, ChevronLeft, ChevronRight, Flag, Loader2 } from 'lucide-react'

export default function OnlineExamEngine() {
  const params = useParams()
  const router = useRouter()
  const examId = params.examId as string
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [showReview, setShowReview] = useState(false)
  const [showSubmitModal, setShowSubmitModal] = useState(false)
  const [timeLeft, setTimeLeft] = useState<number | null>(null)
  const autoSaveTimer = useRef<NodeJS.Timeout | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const initialized = useRef(false)

  const { data: exam, isLoading: examLoading } = useQuery({
    queryKey: ['online-exam', examId],
    queryFn: () => getExamById(examId),
  })

  const { data: questions = [], isLoading: questionsLoading } = useQuery({
    queryKey: ['exam-questions', examId],
    queryFn: () => getQuestionsForExam(examId),
    enabled: !!examId,
  })

  const { data: session, isLoading: sessionLoading } = useQuery({
    queryKey: ['exam-session', examId],
    queryFn: () => getOnlineExamSession(examId),
    enabled: !!examId,
  })

  const startMutation = useMutation({
    mutationFn: () => startOnlineExam(examId),
    onError: (err: Error) => toast.error(err.message),
  })

  const saveMutation = useMutation({
    mutationFn: (data: Record<string, string>) => saveAnswers(examId, data),
    onError: (err: Error) => toast.error('Auto-save failed: ' + err.message),
  })

  const submitMutation = useMutation({
    mutationFn: () => submitOnlineExam(examId),
    onSuccess: () => {
      toast.success('Exam submitted successfully')
      router.push('/student/dashboard')
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const isSubmitted = session?.is_submitted ?? false

  useEffect(() => {
    if (!initialized.current && session && !session.is_submitted && questions.length > 0) {
      initialized.current = true
      const savedAnswers = (session.answers ?? {}) as Record<string, string>
      if (Object.keys(savedAnswers).length > 0) {
        setAnswers(savedAnswers)
      } else {
        const initial: Record<string, string> = {}
        questions.forEach((q: any) => { initial[q.id] = '' })
        setAnswers(initial)
      }
    }
  }, [session, questions])

  useEffect(() => {
    if (!session && !sessionLoading && !startMutation.isPending && exam && exam.is_online && !examLoading) {
      startMutation.mutate()
    }
  }, [session, sessionLoading, exam, examLoading])

  useEffect(() => {
    if (exam?.end_date && exam?.start_date) {
      const end = new Date(exam.end_date).getTime()
      const start = new Date(exam.start_date).getTime()
      const duration = Math.max(0, Math.floor((end - Date.now()) / 1000))
      if (duration > 0) {
        setTimeLeft(duration)
        timerRef.current = setInterval(() => {
          setTimeLeft(prev => {
            if (prev !== null && prev <= 1) {
              clearInterval(timerRef.current!)
              handleAutoSubmit()
              return 0
            }
            return prev !== null ? prev - 1 : null
          })
        }, 1000)
      }
    }

    if (!exam?.end_date && questions.length > 0) {
      const totalDuration = questions.reduce((sum: number, q: any) => sum + (q.marks || 1) * 60, 1800)
      setTimeLeft(totalDuration)
      timerRef.current = setInterval(() => {
        setTimeLeft(prev => {
          if (prev !== null && prev <= 1) {
            clearInterval(timerRef.current!)
            handleAutoSubmit()
            return 0
          }
          return prev !== null ? prev - 1 : null
        })
      }, 1000)
    }

    return () => { if (timerRef.current) clearInterval(timerRef.current) }
  }, [exam, questions])

  const handleAutoSubmit = useCallback(() => {
    submitMutation.mutate()
  }, [submitMutation])

  useEffect(() => {
    autoSaveTimer.current = setInterval(() => {
      const currentAnswers = answers
      if (Object.keys(currentAnswers).length > 0) {
        saveMutation.mutate(currentAnswers)
      }
    }, 60000)

    return () => {
      if (autoSaveTimer.current) clearInterval(autoSaveTimer.current)
    }
  }, [answers])

  function handleAnswer(questionId: string, value: string) {
    setAnswers(prev => ({ ...prev, [questionId]: value }))
  }

  function handleFinalSubmit() {
    submitMutation.mutate()
  }

  const answeredCount = Object.values(answers).filter((v: any) => v !== '' && v !== undefined).length
  const progress = questions.length > 0 ? (answeredCount / questions.length) * 100 : 0
  const currentQuestion = questions[currentIndex]

  function formatTime(seconds: number): string {
    const h = Math.floor(seconds / 3600)
    const m = Math.floor((seconds % 3600) / 60)
    const s = seconds % 60
    if (h > 0) return `${h}h ${m}m ${s}s`
    return `${m}m ${s}s`
  }

  function isTimeLow(): boolean {
    return timeLeft !== null && timeLeft < 300
  }

  if (isSubmitted) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card>
          <CardContent className="py-16 text-center">
            <CheckCircle className="h-16 w-16 mx-auto mb-4 text-green-500" />
            <h2 className="text-2xl font-bold text-gray-900 mb-2">Exam Submitted</h2>
            <p className="text-muted-foreground mb-6">Your answers have been submitted successfully.</p>
            <Button onClick={() => router.push('/student/dashboard')}>Back to Dashboard</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (examLoading || questionsLoading || sessionLoading) {
    return (
      <div className="max-w-3xl mx-auto py-8 space-y-4">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-64 w-full" />
      </div>
    )
  }

  if (!exam || !exam.is_online) {
    return (
      <div className="max-w-2xl mx-auto py-12">
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <AlertTriangle className="h-10 w-10 mx-auto mb-3" />
            <p>This exam is not available online</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto py-6 px-4">
      {/* Sticky Header */}
      <div className="sticky top-0 z-50 bg-white border-b shadow-sm rounded-t-xl mb-4">
        <div className="flex items-center justify-between p-3">
          <div className="min-w-0">
            <h1 className="text-lg font-bold text-gray-900 truncate">{exam.name}</h1>
            <p className="text-xs text-muted-foreground">
              {answeredCount} of {questions.length} answered
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Badge variant="outline" className={cn(
              'font-mono text-sm',
              isTimeLow() ? 'bg-red-50 text-red-700 border-red-300 animate-pulse' : ''
            )}>
              <Clock className="h-3.5 w-3.5 mr-1" />
              {timeLeft !== null ? formatTime(timeLeft) : '--:--'}
            </Badge>
            {saveMutation.isPending && (
              <Badge variant="outline" className="text-yellow-600">
                <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Saving
              </Badge>
            )}
            <Button size="sm" variant="outline" onClick={() => setShowReview(true)}>
              <Flag className="h-3.5 w-3.5 mr-1" /> Review
            </Button>
            <Button size="sm" onClick={() => setShowSubmitModal(true)}>
              Submit
            </Button>
          </div>
        </div>
        <Progress value={progress} className="h-1 rounded-none" />
      </div>

      {/* Question Display */}
      {questions.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center text-muted-foreground">
            <AlertTriangle className="h-10 w-10 mx-auto mb-3" />
            <p>No questions available for this exam</p>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <Badge variant="secondary">
                Question {currentIndex + 1} of {questions.length}
              </Badge>
              <Badge variant="outline" className="font-mono">{currentQuestion?.marks ?? 1} mark{(currentQuestion?.marks ?? 1) > 1 ? 's' : ''}</Badge>
            </div>
            <CardTitle className="text-base mt-2">
              {currentQuestion?.question_text}
            </CardTitle>
            {currentQuestion?.topic && (
              <CardDescription>Topic: {currentQuestion.topic}</CardDescription>
            )}
          </CardHeader>
          <CardContent>
            {currentQuestion?.question_type === 'mcq' && currentQuestion?.options && (
              <RadioGroup
                value={answers[currentQuestion.id] ?? ''}
                onValueChange={(v) => handleAnswer(currentQuestion.id, v)}
              >
                {Object.entries(currentQuestion.options as Record<string, string>).map(([key, val]) => (
                  <div key={key} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value={key} id={`${currentQuestion.id}-${key}`} />
                    <Label htmlFor={`${currentQuestion.id}-${key}`} className="flex-1 cursor-pointer">{val}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {currentQuestion?.question_type === 'true_false' && (
              <RadioGroup
                value={answers[currentQuestion.id] ?? ''}
                onValueChange={(v) => handleAnswer(currentQuestion.id, v)}
              >
                {['True', 'False'].map((opt: any) => (
                  <div key={opt} className="flex items-center space-x-2 p-3 rounded-lg border hover:bg-gray-50 cursor-pointer">
                    <RadioGroupItem value={opt.toLowerCase()} id={`${currentQuestion.id}-${opt}`} />
                    <Label htmlFor={`${currentQuestion.id}-${opt}`} className="flex-1 cursor-pointer">{opt}</Label>
                  </div>
                ))}
              </RadioGroup>
            )}

            {(currentQuestion?.question_type === 'short_answer' || currentQuestion?.question_type === 'essay') && (
              <textarea
                value={answers[currentQuestion.id] ?? ''}
                onChange={(e) => handleAnswer(currentQuestion.id, e.target.value)}
                className="w-full min-h-[120px] rounded-md border border-input bg-background px-3 py-2 text-sm"
                placeholder="Type your answer here..."
              />
            )}
          </CardContent>
        </Card>
      )}

      {/* Navigation */}
      {questions.length > 0 && (
        <div className="flex items-center justify-between mt-4">
          <Button
            variant="outline"
            disabled={currentIndex === 0}
            onClick={() => setCurrentIndex(i => i - 1)}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>

          <div className="flex gap-1">
            {questions.map((q: any, i: number) => {
              const isAnswered = answers[q.id] !== undefined && answers[q.id] !== ''
              return (
                <button
                  key={q.id}
                  onClick={() => setCurrentIndex(i)}
                  className={cn(
                    'w-8 h-8 rounded text-xs font-medium transition-colors',
                    i === currentIndex ? 'ring-2 ring-edu-blue-500' : '',
                    isAnswered ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                  )}
                >
                  {i + 1}
                </button>
              )
            })}
          </div>

          <Button
            variant="outline"
            disabled={currentIndex === questions.length - 1}
            onClick={() => setCurrentIndex(i => i + 1)}
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}

      {/* Review Dialog */}
      <Dialog open={showReview} onOpenChange={setShowReview}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>Review Answers</DialogTitle>
            <DialogDescription>
              {answeredCount} of {questions.length} questions answered
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-5 gap-2 max-h-60 overflow-y-auto p-2">
            {questions.map((q: any, i: number) => {
              const isAnswered = answers[q.id] !== undefined && answers[q.id] !== ''
              return (
                <button
                  key={q.id}
                  onClick={() => { setCurrentIndex(i); setShowReview(false) }}
                  className={cn(
                    'p-3 rounded-lg text-center text-sm font-medium border transition-colors',
                    isAnswered ? 'bg-green-50 border-green-300 text-green-800' : 'bg-gray-50 border-gray-200 text-gray-500'
                  )}
                >
                  <div className="text-xs text-gray-400">Q{i + 1}</div>
                  <div className={isAnswered ? 'text-green-600' : 'text-gray-400'}>{isAnswered ? '✓' : '?'}</div>
                </button>
              )
            })}
          </div>
          <DialogFooter>
            <Button onClick={() => setShowReview(false)}>Continue</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Submit Confirmation */}
      <Dialog open={showSubmitModal} onOpenChange={setShowSubmitModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Exam</DialogTitle>
            <DialogDescription>
              You are about to submit your exam. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <p>Questions answered: <strong>{answeredCount}/{questions.length}</strong></p>
            <p>Unanswered: <strong>{questions.length - answeredCount}</strong></p>
            {questions.length - answeredCount > 0 && (
              <p className="text-yellow-600 flex items-center gap-1">
                <AlertTriangle className="h-4 w-4" /> You have unanswered questions
              </p>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowSubmitModal(false)}>Review Again</Button>
            <Button onClick={handleFinalSubmit} disabled={submitMutation.isPending}>
              {submitMutation.isPending && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
              Confirm Submit
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}


