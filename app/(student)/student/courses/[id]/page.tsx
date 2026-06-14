'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { getStudentCourseDetail, markMaterialComplete, submitQuiz, trackProgress } from '@/lib/actions/lms.actions'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { QuizPlayer } from '@/components/lms/QuizPlayer'
import { ProgressBar } from '@/components/lms/ProgressBar'
import {
  ArrowLeft, FileText, Film, Link as LinkIcon, BookOpen, CheckCircle2,
  Circle, Download, PlayCircle, ExternalLink, CheckCircle,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

const materialLabels: Record<string, string> = {
  video: 'Video Lesson',
  document: 'Reading Material',
  link: 'Reference Link',
  quiz: 'Quiz',
  audio: 'Audio',
}

function getYouTubeId(url: string) {
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([a-zA-Z0-9_-]{11})/)
  return m?.[1] || null
}

function getVimeoId(url: string) {
  const m = url.match(/vimeo\.com\/(\d+)/)
  return m?.[1] || null
}

function isYouTubeUrl(url: string) {
  return url.includes('youtube.com') || url.includes('youtu.be')
}

function isVimeoUrl(url: string) {
  return url.includes('vimeo.com')
}

export default function StudentCourseDetailPage() {
  const params = useParams()
  const queryClient = useQueryClient()
  const id = params.id as string

  const [activeMaterialId, setActiveMaterialId] = useState<string | null>(null)
  const [quizLoading, setQuizLoading] = useState(false)

  const { data: course, isLoading } = useQuery({
    queryKey: ['student-course-detail', id],
    queryFn: () => getStudentCourseDetail(id),
  })

  const markCompleteMutation = useMutation({
    mutationFn: (materialId: string) => markMaterialComplete(materialId),
    onMutate: async (materialId: string) => {
      await queryClient.cancelQueries({ queryKey: ['student-course-detail', id] })
      const prev = queryClient.getQueryData(['student-course-detail', id])
      queryClient.setQueryData(['student-course-detail', id], (old: any) => {
        if (!old) return old
        return {
          ...old,
          materials: old.materials.map((m: any) =>
            m.id === materialId ? { ...m, progress: { completed: true, progress: 100 } } : m
          ),
          progress_summary: {
            ...old.progress_summary,
            completed: old.materials.filter((m: any) => m.id === materialId ? true : m.progress?.completed).length,
            percent: Math.round((old.materials.filter((m: any) => m.id === materialId ? true : m.progress?.completed).length / old.materials.length) * 100),
          },
        }
      })
      return { prev }
    },
    onError: (err: Error, _vars, context) => {
      if (context?.prev) queryClient.setQueryData(['student-course-detail', id], context.prev)
      toast.error(err.message)
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['student-course-detail', id] })
    },
  })

  const activeMaterial = course?.materials?.find((m: any) => m.id === (activeMaterialId || course.materials[0]?.id))

  if (isLoading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-8 w-64" />
        <div className="flex gap-6">
          <Skeleton className="h-96 w-64 flex-shrink-0" />
          <Skeleton className="h-96 flex-1" />
        </div>
      </div>
    )
  }

  if (!course) {
    return (
      <div className="text-center py-12">
        <p className="font-medium">Course not found or not available</p>
        <Button className="mt-4" asChild><Link href="/student/courses">Back to Courses</Link></Button>
      </div>
    )
  }

  const progress = course.progress_summary

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3 min-w-0">
          <Button variant="ghost" size="icon" asChild className="flex-shrink-0">
            <Link href="/student/courses"><ArrowLeft className="h-5 w-5" /></Link>
          </Button>
          <div className="min-w-0">
            <h1 className="text-2xl font-bold text-gray-900 truncate">{course.title}</h1>
            <p className="text-muted-foreground text-sm">
              {course.subjects?.name || ''}{course.classes ? ` · ${course.classes.name}` : ''}
            </p>
          </div>
        </div>
        <div className="text-right flex-shrink-0">
          <p className="text-sm text-muted-foreground">Course Progress</p>
          <ProgressBar value={progress.percent} max={100} size="sm" />
          <p className="text-xs text-muted-foreground mt-0.5">
            {progress.completed} of {progress.total} materials
          </p>
        </div>
      </div>

      <div className="flex flex-col lg:flex-row gap-6">
        <div className="lg:w-64 flex-shrink-0">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Materials</CardTitle>
              <CardDescription className="text-xs">{progress.total} items</CardDescription>
            </CardHeader>
            <CardContent className="p-2">
              <div className="space-y-1">
                {course.materials?.map((material: any, i: number) => {
                  const isActive = material.id === activeMaterial?.id
                  const completed = material.progress?.completed
                  const Icon = material.type === 'video' ? Film :
                    material.type === 'document' ? FileText :
                    material.type === 'link' ? LinkIcon :
                    material.type === 'quiz' ? BookOpen : FileText

                  return (
                    <button
                      key={material.id}
                      onClick={() => setActiveMaterialId(material.id)}
                      className={`
                        w-full text-left flex items-center gap-2 px-3 py-2 rounded-md text-sm transition-colors
                        ${isActive ? 'bg-blue-50 text-blue-700 font-medium' : 'hover:bg-gray-100 text-gray-700'}
                        ${completed ? '' : ''}
                      `}
                    >
                      <span className="flex-shrink-0">
                        {completed
                          ? <CheckCircle2 className="h-4 w-4 text-green-500" />
                          : <Circle className="h-4 w-4 text-gray-300" />
                        }
                      </span>
                      <Icon className="h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" />
                      <span className="truncate">{material.title}</span>
                    </button>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="flex-1 min-w-0">
          {activeMaterial ? (
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-lg">{activeMaterial.title}</CardTitle>
                    <CardDescription>{materialLabels[activeMaterial.type] || activeMaterial.type}</CardDescription>
                  </div>
                  {activeMaterial.type !== 'quiz' && (
                    <Button
                      variant={activeMaterial.progress?.completed ? 'outline' : 'default'}
                      size="sm"
                      onClick={() => markCompleteMutation.mutate(activeMaterial.id)}
                      disabled={markCompleteMutation.isPending}
                      className={activeMaterial.progress?.completed ? 'text-green-600' : ''}
                    >
                      {activeMaterial.progress?.completed
                        ? <><CheckCircle2 className="h-4 w-4 mr-1" /> Completed</>
                        : <><CheckCircle className="h-4 w-4 mr-1" /> Mark Complete</>
                      }
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent>
                {/* Video */}
                {activeMaterial.type === 'video' && activeMaterial.content_url && (
                  <div className="aspect-video rounded-lg overflow-hidden bg-black">
                    {isYouTubeUrl(activeMaterial.content_url) ? (
                      <iframe
                        src={`https://www.youtube.com/embed/${getYouTubeId(activeMaterial.content_url)}`}
                        className="w-full h-full"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                      />
                    ) : isVimeoUrl(activeMaterial.content_url) ? (
                      <iframe
                        src={`https://player.vimeo.com/video/${getVimeoId(activeMaterial.content_url)}`}
                        className="w-full h-full"
                        allow="autoplay; fullscreen; picture-in-picture"
                        allowFullScreen
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-white">
                        <p className="text-center p-4">
                          <Film className="h-8 w-8 mx-auto mb-2 opacity-50" />
                          <span className="opacity-50">Video URL not recognized. <a href={activeMaterial.content_url} target="_blank" rel="noopener noreferrer" className="underline">Open directly</a></span>
                        </p>
                      </div>
                    )}
                  </div>
                )}

                {/* Document */}
                {activeMaterial.type === 'document' && (
                  <div className="prose max-w-none">
                    {activeMaterial.content && (
                      <div className="mb-4 whitespace-pre-wrap text-sm">{activeMaterial.content}</div>
                    )}
                    {activeMaterial.content_url && (
                      <Button variant="outline" asChild>
                        <a href={activeMaterial.content_url} target="_blank" rel="noopener noreferrer">
                          <Download className="h-4 w-4 mr-2" /> Download Document
                        </a>
                      </Button>
                    )}
                    {!activeMaterial.content && !activeMaterial.content_url && (
                      <p className="text-muted-foreground text-center py-8">No content available for this material.</p>
                    )}
                  </div>
                )}

                {/* Link */}
                {activeMaterial.type === 'link' && activeMaterial.content_url && (
                  <div className="text-center py-8">
                    <LinkIcon className="h-12 w-12 text-muted-foreground mx-auto mb-3" />
                    <p className="font-medium mb-1">{activeMaterial.title}</p>
                    <p className="text-sm text-muted-foreground mb-4">{activeMaterial.content_url}</p>
                    <Button asChild>
                      <a href={activeMaterial.content_url} target="_blank" rel="noopener noreferrer">
                        <ExternalLink className="h-4 w-4 mr-2" /> Open Link
                      </a>
                    </Button>
                  </div>
                )}

                {/* Audio */}
                {activeMaterial.type === 'audio' && activeMaterial.content_url && (
                  <div className="py-8">
                    <audio controls className="w-full" src={activeMaterial.content_url}>
                      Your browser does not support the audio element.
                    </audio>
                  </div>
                )}

                {/* Quiz */}
                {activeMaterial.type === 'quiz' && activeMaterial.metadata?.questions && (
                  <QuizPlayer
                    quizTitle={activeMaterial.title}
                    questions={activeMaterial.metadata.questions}
                    totalMarks={activeMaterial.metadata.questions.reduce((sum: number, q: any) => sum + (q.marks || 1), 0)}
                    onSubmit={async (answers) => {
                      setQuizLoading(true)
                      try {
                        const result = await submitQuiz({
                          course_id: id,
                          material_id: activeMaterial.id,
                          answers: Object.entries(answers).map(([question, answer]) => ({
                            question_text: question,
                            answer: answer as string,
                          })),
                        })
                        await markMaterialComplete(activeMaterial.id)
                        queryClient.invalidateQueries({ queryKey: ['student-course-detail', id] })
                        return {
                          score: result.score,
                          earnedMarks: result.earnedMarks,
                          totalMarks: result.totalMarks,
                          results: result.results,
                          passed: result.passed,
                        }
                      } finally {
                        setQuizLoading(false)
                      }
                    }}
                  />
                )}

                {activeMaterial.type === 'quiz' && !activeMaterial.metadata?.questions && (
                  <p className="text-muted-foreground text-center py-8">Quiz has no questions configured.</p>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <BookOpen className="h-12 w-12 mx-auto mb-3 text-gray-300" />
                <p>Select a material from the sidebar to begin</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  )
}
