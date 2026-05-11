import { Link } from 'react-router-dom'
import { useAcademySettings } from '../../app/providers/AcademySettingsContext'
import { DAY_KEYS, DAY_LABELS } from '../../shared/domain/academy'
import { formatPeriod } from '../../shared/domain/academy'

export function StudentSchedulePage() {
  const { settings } = useAcademySettings()
  const openingHours = settings?.opening_hours

  const todayIndex = new Date().getDay()
  const todayKey = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'][todayIndex]

  return (
    <section>
      <div className="page-header">
        <div>
          <span className="eyebrow">Horarios</span>
          <h1>Horarios de Aula</h1>
          <p>Confira os horarios de treino da academia para cada dia da semana.</p>
        </div>
      </div>
      <Link className="back-link" to="/aluno">← Voltar</Link>

      <div className="schedule-week-grid">
        {DAY_KEYS.map((dayKey) => {
          const periods = openingHours?.[dayKey] ?? []
          const isToday = dayKey === todayKey

          return (
            <div className={`card schedule-day-card ${isToday ? 'today' : ''}`} key={dayKey}>
              <div className="schedule-day-header">
                <strong>{DAY_LABELS[dayKey]}</strong>
                {isToday && <span className="schedule-today-badge">Hoje</span>}
              </div>
              {periods.length === 0 ? (
                <p className="schedule-day-empty">Sem aulas</p>
              ) : (
                <div className="schedule-day-periods">
                  {periods.map((period, i) => (
                    <div className="schedule-day-period" key={i}>
                      {formatPeriod(period)}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )
        })}
      </div>
    </section>
  )
}
