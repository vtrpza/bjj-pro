import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useState } from 'react'
import { useAuth } from '../../app/providers/AuthContext'
import { Button } from '../../shared/components/Button'
import { EmptyState } from '../../shared/components/StateViews'
import { PageHeader } from '../../shared/components/PageHeader'
import type { StudentFormValues, StudentRecord } from '../../shared/domain/academy'
import { fetchBjjBelts, fetchStudents, saveStudent } from '../../shared/lib/academyQueries'
import { supabase } from '../../shared/lib/supabase'
import { StudentList } from './StudentList'
import { StudentStats } from './StudentStats'
import { StudentFormModal } from './StudentFormModal'

export function StudentsPage() {
  const { isPlaceholderMode, profile } = useAuth()
  const academyId = profile?.academyId ?? undefined
  const queryClient = useQueryClient()
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingStudent, setEditingStudent] = useState<StudentRecord | null>(null)

  const canUseSupabase = Boolean(supabase && academyId && !isPlaceholderMode)

  const studentsQuery = useQuery({
    enabled: canUseSupabase,
    queryFn: () => fetchStudents(supabase, academyId),
    queryKey: ['students', academyId]
  })

  const beltsQuery = useQuery({
    enabled: canUseSupabase,
    queryFn: () => fetchBjjBelts(supabase),
    queryKey: ['bjj-belts']
  })

  const mutation = useMutation({
    mutationFn: (values: StudentFormValues) =>
      saveStudent({ academyId, client: supabase, studentId: editingStudent?.id, values }),
    onSuccess: async () => {
      setIsModalOpen(false)
      setEditingStudent(null)
      await queryClient.invalidateQueries({ queryKey: ['students', academyId] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard', academyId] })
    }
  })

  const toggleStatusMutation = useMutation({
    mutationFn: (student: StudentRecord) => {
      const values: StudentFormValues = {
        beltId: student.belt_id,
        grau: student.grau,
        email: student.email ?? '',
        fullName: student.full_name,
        mensalidadeDueDate: student.next_due_date ?? '',
        phone: student.phone ?? '',
        status: student.status === 'active' ? 'inactive' : 'active'
      }
      return saveStudent({ academyId, client: supabase, studentId: student.id, values })
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['students', academyId] })
      await queryClient.invalidateQueries({ queryKey: ['dashboard', academyId] })
    }
  })

  function handleEdit(student: StudentRecord) {
    setEditingStudent(student)
    setIsModalOpen(true)
  }

  function handleNew() {
    setEditingStudent(null)
    setIsModalOpen(true)
  }

  function handleCloseModal() {
    setIsModalOpen(false)
    setEditingStudent(null)
  }

  function handleSubmit(values: StudentFormValues) {
    mutation.mutate(values)
  }

  const students = studentsQuery.data ?? []
  const belts = beltsQuery.data ?? []

  return (
    <section>
      <PageHeader
        eyebrow="Alunos"
        title="Cadastro de alunos de Jiu-Jitsu"
        description="Cadastre alunos com faixa, grau, contato e vencimento da mensalidade Pix."
        action={<Button onClick={handleNew}>Novo aluno</Button>}
      />

      {!canUseSupabase ? (
        <EmptyState
          title="Supabase ainda nao conectado"
          description="Quando VITE_SUPABASE_URL, VITE_SUPABASE_ANON_KEY e o contexto da academia estiverem disponiveis, os alunos serao listados aqui."
        />
      ) : null}

      {canUseSupabase ? (
        <>
          <StudentStats students={students} />

          <div className="student-list-card card">
            <StudentList
              belts={belts}
              isError={!!(studentsQuery.error || beltsQuery.error)}
              isLoading={studentsQuery.isLoading || beltsQuery.isLoading}
              students={students}
              onEdit={handleEdit}
              onToggleStatus={(student) => toggleStatusMutation.mutate(student)}
            />
          </div>
        </>
      ) : null}

      <StudentFormModal
        belts={belts}
        editingStudent={editingStudent}
        isOpen={isModalOpen}
        isPending={mutation.isPending}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
      />
    </section>
  )
}
