import { useMemo, useState } from 'react'
import { EmptyState, LoadingState } from '../../shared/components/StateViews'
import type { BjjBeltOption, StudentRecord } from '../../shared/domain/academy'

import { StudentCard } from './StudentCard'

type SortField = 'name' | 'belt' | 'status' | 'dueDate'
type SortDirection = 'asc' | 'desc'

type SortIconProps = {
  field: SortField
  currentField: SortField
  direction: SortDirection
}

function SortIcon({ field, currentField, direction }: SortIconProps) {
  if (currentField !== field) return <span className="sort-icon">↕</span>
  return <span className="sort-icon active">{direction === 'asc' ? '↑' : '↓'}</span>
}

type StudentListProps = {
  belts: BjjBeltOption[]
  isLoading: boolean
  isError: boolean
  students: StudentRecord[]
  onEdit: (student: StudentRecord) => void
  onToggleStatus: (student: StudentRecord) => void
}

export function StudentList({ belts, isLoading, isError, students, onEdit, onToggleStatus }: StudentListProps) {
  const [search, setSearch] = useState('')
  const [beltFilter, setBeltFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [sortField, setSortField] = useState<SortField>('name')
  const [sortDir, setSortDir] = useState<SortDirection>('asc')

  const filteredStudents = useMemo(() => {
    let result = [...students]

    if (search.trim()) {
      const query = search.toLowerCase().trim()
      result = result.filter(
        (s) =>
          s.full_name.toLowerCase().includes(query) ||
          (s.email?.toLowerCase().includes(query) ?? false) ||
          (s.phone?.includes(query) ?? false)
      )
    }

    if (beltFilter) {
      result = result.filter((s) => s.belt_id === beltFilter)
    }

    if (statusFilter) {
      result = result.filter((s) => s.status === statusFilter)
    }

    result.sort((a, b) => {
      let comparison = 0
      switch (sortField) {
        case 'name':
          comparison = a.full_name.localeCompare(b.full_name)
          break
        case 'belt': {
          const beltA = belts.find((bt) => bt.id === a.belt_id)?.rank ?? 0
          const beltB = belts.find((bt) => bt.id === b.belt_id)?.rank ?? 0
          comparison = beltA - beltB || a.grau - b.grau
          break
        }
        case 'status':
          comparison = a.status.localeCompare(b.status)
          break
        case 'dueDate': {
          const dateA = a.next_due_date ?? '9999-12-31'
          const dateB = b.next_due_date ?? '9999-12-31'
          comparison = dateA.localeCompare(dateB)
          break
        }
      }
      return sortDir === 'asc' ? comparison : -comparison
    })

    return result
  }, [students, search, beltFilter, statusFilter, sortField, sortDir, belts])

  function toggleSort(field: SortField) {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  if (isLoading) {
    return <LoadingState title="Carregando alunos" description="Buscando alunos e faixas da academia." />
  }

  if (isError) {
    return (
      <EmptyState
        title="Erro ao buscar alunos"
        description="Confira RLS, tabelas students/bjj_belts e contexto da academia."
      />
    )
  }

  if (students.length === 0) {
    return (
      <EmptyState
        title="Nenhum aluno cadastrado"
        description="Cadastre o primeiro aluno da academia piloto."
      />
    )
  }

  return (
    <div className="student-list-container">
      <div className="student-toolbar">
        <div className="toolbar-search">
          <input
            placeholder="Buscar por nome, email ou telefone..."
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <span className="search-count">
            {filteredStudents.length} de {students.length}
          </span>
        </div>

        <div className="toolbar-filters">
          <select
            value={beltFilter}
            onChange={(e) => setBeltFilter(e.target.value)}
          >
            <option value="">Todas as faixas</option>
            {belts.map((belt) => (
              <option key={belt.id} value={belt.id}>
                {belt.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Todos os status</option>
            <option value="active">Ativos</option>
            <option value="inactive">Inativos</option>
          </select>
        </div>
      </div>

      <div className="student-sort-bar">
        <button
          className={sortField === 'name' ? 'active' : ''}
          onClick={() => toggleSort('name')}
        >
          Nome <SortIcon currentField={sortField} direction={sortDir} field="name" />
        </button>
        <button
          className={sortField === 'belt' ? 'active' : ''}
          onClick={() => toggleSort('belt')}
        >
          Faixa <SortIcon currentField={sortField} direction={sortDir} field="belt" />
        </button>
        <button
          className={sortField === 'status' ? 'active' : ''}
          onClick={() => toggleSort('status')}
        >
          Status <SortIcon currentField={sortField} direction={sortDir} field="status" />
        </button>
        <button
          className={sortField === 'dueDate' ? 'active' : ''}
          onClick={() => toggleSort('dueDate')}
        >
          Vencimento <SortIcon currentField={sortField} direction={sortDir} field="dueDate" />
        </button>
      </div>

      {filteredStudents.length === 0 ? (
        <EmptyState
          title="Nenhum aluno encontrado"
          description="Tente ajustar os filtros ou a busca."
        />
      ) : (
        <div className="student-cards">
          {filteredStudents.map((student) => (
            <StudentCard
              key={student.id}
              student={student}
              onEdit={onEdit}
              onToggleStatus={onToggleStatus}
            />
          ))}
        </div>
      )}
    </div>
  )
}
