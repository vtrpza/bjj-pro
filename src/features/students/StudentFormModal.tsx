import { zodResolver } from '@hookform/resolvers/zod'
import { useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { Button } from '../../shared/components/Button'
import type { BjjBeltOption, StudentFormValues, StudentRecord } from '../../shared/domain/academy'
import { studentFormSchema } from '../../shared/domain/academy'
import { maskPhone } from '../../shared/lib/masks'

type StudentFormModalProps = {
  belts: BjjBeltOption[]
  editingStudent: StudentRecord | null
  isOpen: boolean
  isPending: boolean
  onClose: () => void
  onSubmit: (values: StudentFormValues) => void
}

const emptyStudentValues: StudentFormValues = {
  beltId: '',
  grau: 0,
  email: '',
  fullName: '',
  mensalidadeDueDate: '',
  phone: '',
  status: 'active'
}

function toFormValues(student: StudentRecord): StudentFormValues {
  return {
    beltId: student.belt_id,
    grau: student.grau,
    email: student.email ?? '',
    fullName: student.full_name,
    mensalidadeDueDate: student.next_due_date ?? '',
    phone: student.phone ?? '',
    status: student.status
  }
}

export function StudentFormModal({
  belts,
  editingStudent,
  isOpen,
  isPending,
  onClose,
  onSubmit
}: StudentFormModalProps) {
  const form = useForm<StudentFormValues>({
    defaultValues: emptyStudentValues,
    resolver: zodResolver(studentFormSchema)
  })

  useEffect(() => {
    if (isOpen) {
      if (editingStudent) {
        form.reset(toFormValues(editingStudent))
      } else {
        form.reset(emptyStudentValues)
      }
    }
  }, [isOpen, editingStudent, form])

  if (!isOpen) return null

  return (
    <div className="modal-backdrop" onClick={(e) => { if (e.target === e.currentTarget) onClose() }}>
      <div className="modal-content">
        <div className="modal-header">
          <h2>{editingStudent ? 'Editar aluno' : 'Novo aluno'}</h2>
          <button className="modal-close" onClick={onClose} type="button">&times;</button>
        </div>

        <form
          className="modal-body"
          onSubmit={form.handleSubmit(onSubmit)}
        >
          <div className="form-group">
            <label>Nome do aluno *</label>
            <input
              {...form.register('fullName')}
              placeholder="Ex.: Ana Silva"
              autoFocus
            />
            {form.formState.errors.fullName ? (
              <p className="form-error">{form.formState.errors.fullName.message}</p>
            ) : null}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Faixa *</label>
              <select {...form.register('beltId')}>
                <option value="">Selecione</option>
                {belts.map((belt) => (
                  <option key={belt.id} value={belt.id}>
                    {belt.name} ({belt.audience === 'kids' ? 'infantil' : 'adulto'})
                  </option>
                ))}
              </select>
              {form.formState.errors.beltId ? (
                <p className="form-error">{form.formState.errors.beltId.message}</p>
              ) : null}
            </div>

            <div className="form-group">
              <label>Grau *</label>
              <input
                {...form.register('grau', { valueAsNumber: true })}
                inputMode="numeric"
                min={0}
                max={4}
                type="number"
              />
              {form.formState.errors.grau ? (
                <p className="form-error">{form.formState.errors.grau.message}</p>
              ) : null}
            </div>
          </div>

          <div className="form-group">
            <label>Vencimento da mensalidade</label>
            <input {...form.register('mensalidadeDueDate')} type="date" />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>E-mail</label>
              <input
                {...form.register('email')}
                inputMode="email"
                placeholder="aluno@email.com"
                type="email"
              />
              {form.formState.errors.email ? (
                <p className="form-error">{form.formState.errors.email.message}</p>
              ) : null}
            </div>

            <div className="form-group">
              <label>Telefone</label>
              <input
                {...form.register('phone', {
                  onChange: (e) => {
                    e.target.value = maskPhone(e.target.value)
                  }
                })}
                inputMode="tel"
                placeholder="(11) 99999-9999"
                maxLength={16}
              />
              {form.formState.errors.phone ? (
                <p className="form-error">{form.formState.errors.phone.message}</p>
              ) : null}
            </div>
          </div>

          <div className="form-group">
            <label>Status</label>
            <select {...form.register('status')}>
              <option value="active">Ativo</option>
              <option value="inactive">Inativo</option>
            </select>
          </div>
        </form>

        <div className="modal-footer">
          <Button disabled={isPending} onClick={onClose} type="button" variant="secondary">
            Cancelar
          </Button>
          <Button
            disabled={isPending}
            onClick={form.handleSubmit(onSubmit)}
            type="button"
          >
            {isPending ? 'Salvando...' : 'Salvar aluno'}
          </Button>
        </div>
      </div>
    </div>
  )
}
