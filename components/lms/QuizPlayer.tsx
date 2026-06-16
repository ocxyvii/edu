'use client'

import { useState, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { ProgressBar } from './ProgressBar'
import { CheckCircle, XCircle, ChevronLeft, ChevronRight, Flag, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Question {
  question_text: string
  question_type: 'mcq' | 'true_false' | 'short_answer'
  options?: string[]
  correct_answer: string
  marks: number
}

interface QuizResult {
  question_text: string
  correct_answer: string
  student_answer: string
  is_correct: boolean
  marks: number
}

interface QuizPlayerProps {
  quizTitle: string
  questions: Question[]
  totalMarks: number
  onSubmit: (answers: Record<string, string>) => Promise<{
    score: number
    earnedMarks: number
    totalMarks: number
    results: QuizResult[]
    passed: boolean
  }>
}

export function QuizPlayer({ quizTitle, questions, totalMarks, onSubmit }: QuizPlayerProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [submitted, setSubmitted] = useState(false)
  const [result, setResult] = useState<{
    score: number
    earnedMarks: number
    totalMarks: number
    results: QuizResult[]
    passed: boolean
  } | null>(null)
  const [loading, setLoading] = useState(false)

  const currentQuestion = questions[currentIndex]
  const answeredCount = Object.keys(answers).length
  const progress = Math.round((answeredCount / questions.length) * 100)

  const setAnswer = useCallback((question: string, answer: string) => {
    setAnswers(prev => ({ ...prev, [question]: answer }))
  }, [])

  const handleSubmit = async () => {
    setLoading(true)
    try {
      const res = await onSubmit(answers)
      setResult(res)
      setSubmitted(true)
    } finally {
      setLoading(false)
    }
  }

  if (submitted && result) {
    return (
      <div className="space-y-6">
        <Card className={cn(
          'border-2',
          result.passed ? 'border-green-400' : 'border-red-400',
        )}>
          <CardHeader className="text-center pb-2">
            <div className={cn(
              'h-16 w-16 rounded-full mx-auto flex items-center justify-center mb-2',
              result.passed ? 'bg-green-100' : 'bg-red-100',
            )}>
              {result.passed
                ? <CheckCircle className="h-8 w-8 text-green-600" />
                : <XCircle className="h-8 w-8 text-red-600" />
              }
            </div>
            <CardTitle className="text-xl">{result.passed ? 'Quiz Passed!' : 'Quiz Not Passed'}</CardTitle>
            <CardDescription>
              You scored {result.earnedMarks} out of {result.totalMarks} marks ({result.score}%)
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ProgressBar value={result.score} max={100} size="lg" className="max-w-md mx-auto" />
          </CardContent>
        </Card>

        <div className="space-y-3">
          {result.results.map((r: any, i: any) => (
            <Card key={i} className={cn(r.is_correct ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50')}>
              <CardContent className="pt-4 text-sm space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <p className="font-medium">
                    {i + 1}. {r.question_text}
                    <span className="text-muted-foreground ml-2 font-normal">({r.marks} mark{r.marks > 1 ? 's' : ''})</span>
                  </p>
                  {r.is_correct
                    ? <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0 mt-0.5" />
                    : <XCircle className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
                  }
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-muted-foreground">Your answer:</span>
                    <p className="font-mono mt-0.5">{r.student_answer || '(no answer)'}</p>
                  </div>
                  {!r.is_correct && (
                    <div>
                      <span className="text-muted-foreground">Correct answer:</span>
                      <p className="font-mono mt-0.5 text-green-700">{r.correct_answer}</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    )
  }

  if (questions.length === 0) {
    return (
      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          No questions in this quiz.
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="font-semibold">{quizTitle}</h3>
          <p className="text-sm text-muted-foreground">
            Question {currentIndex + 1} of {questions.length} · {totalMarks} total marks
          </p>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Flag className="h-4 w-4" />
          <span>{answeredCount}/{questions.length} answered</span>
        </div>
      </div>

      <ProgressBar value={progress} max={100} size="sm" showLabel={false} />

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-start gap-2">
            <span className="text-muted-foreground font-normal">{currentIndex + 1}.</span>
            <span>{currentQuestion.question_text}</span>
          </CardTitle>
          <CardDescription>
            {currentQuestion.marks} mark{currentQuestion.marks > 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {currentQuestion.question_type === 'mcq' && currentQuestion.options && (
            <RadioGroup
              value={answers[currentQuestion.question_text] || ''}
              onValueChange={(v) => setAnswer(currentQuestion.question_text, v)}
            >
              <div className="space-y-3">
                {currentQuestion.options.map((opt: any, i: any) => (
                  <div key={i} className="flex items-center space-x-2">
                    <RadioGroupItem value={opt} id={`q${currentIndex}_opt${i}`} />
                    <Label htmlFor={`q${currentIndex}_opt${i}`} className="cursor-pointer font-normal">{opt}</Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}

          {currentQuestion.question_type === 'true_false' && (
            <RadioGroup
              value={answers[currentQuestion.question_text] || ''}
              onValueChange={(v) => setAnswer(currentQuestion.question_text, v)}
            >
              <div className="flex gap-4">
                {['True', 'False'].map((opt: any) => (
                  <div key={opt} className="flex items-center space-x-2">
                    <RadioGroupItem value={opt} id={`q${currentIndex}_${opt}`} />
                    <Label htmlFor={`q${currentIndex}_${opt}`} className="cursor-pointer font-normal">{opt}</Label>
                  </div>
                ))}
              </div>
            </RadioGroup>
          )}

          {currentQuestion.question_type === 'short_answer' && (
            <input
              type="text"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              placeholder="Type your answer..."
              value={answers[currentQuestion.question_text] || ''}
              onChange={(e) => setAnswer(currentQuestion.question_text, e.target.value)}
            />
          )}
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setCurrentIndex(i => Math.max(0, i - 1))}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          {currentIndex < questions.length - 1 ? (
            <Button
              size="sm"
              onClick={() => setCurrentIndex(i => Math.min(questions.length - 1, i + 1))}
            >
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          ) : (
            <Button
              size="sm"
              onClick={handleSubmit}
              disabled={loading || answeredCount === 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {loading ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : null}
              Submit Quiz
            </Button>
          )}
        </CardFooter>
      </Card>
    </div>
  )
}
