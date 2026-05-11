import { useCallback } from 'react'
import type { Control, UseFormRegister } from 'react-hook-form'
import { useFieldArray } from 'react-hook-form'
import type { AcademySettingsFormValues } from '../../shared/domain/academy'
import { DAY_KEYS, DAY_LABELS, type DayKey } from '../../shared/domain/academy'

function DayScheduleEditor({
  control,
  dayKey,
  label,
  register
}: {
  control: Control<AcademySettingsFormValues>
  dayKey: DayKey
  label: string
  register: UseFormRegister<AcademySettingsFormValues>
}) {
  const { fields, append, remove } = useFieldArray({
    control,
    name: `openingHours.${dayKey}`
  })

  const handleAdd = useCallback(() => {
    append({ end: '', start: '' })
  }, [append])

  return (
    <div className="day-schedule">
      <div className="day-schedule-header">
        <strong>{label}</strong>
        <button className="btn-sm" onClick={handleAdd} type="button">
          + Periodo
        </button>
      </div>
      {fields.length === 0 ? (
        <p className="day-schedule-empty">Sem aulas neste dia</p>
      ) : (
        <div className="day-schedule-periods">
          {fields.map((field, index) => (
            <div className="period-row" key={field.id}>
              <label className="field-inline">
                <span>Inicio</span>
                <input
                  {...register(`openingHours.${dayKey}.${index}.start`)}
                  placeholder="14:00"
                  type="time"
                />
              </label>
              <span className="period-separator">—</span>
              <label className="field-inline">
                <span>Fim</span>
                <input
                  {...register(`openingHours.${dayKey}.${index}.end`)}
                  placeholder="15:30"
                  type="time"
                />
              </label>
              <button
                className="btn-remove"
                onClick={() => remove(index)}
                title="Remover periodo"
                type="button"
              >
                Remover
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export function OpeningHoursEditor({
  control,
  register
}: {
  control: Control<AcademySettingsFormValues>
  register: UseFormRegister<AcademySettingsFormValues>
}) {
  return (
    <div className="opening-hours-editor">
      <h3>Horarios de Aula</h3>
      <p className="field-hint">
        Configure os horarios de treino para cada dia da semana. Deixe em branco para dias sem aula.
      </p>
      {DAY_KEYS.map((dayKey) => (
        <DayScheduleEditor
          control={control}
          dayKey={dayKey}
          key={dayKey}
          label={DAY_LABELS[dayKey]}
          register={register}
        />
      ))}
    </div>
  )
}
