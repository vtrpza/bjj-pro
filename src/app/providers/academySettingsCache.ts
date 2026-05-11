import type { AcademySettings } from '../../shared/domain/academy'

const STORAGE_PREFIX = 'bjj_academy_settings'

export function getStorageKey(academyId: string): string {
  return `${STORAGE_PREFIX}:${academyId}`
}

export function loadCachedSettings(academyId: string): AcademySettings | null {
  try {
    const raw = localStorage.getItem(getStorageKey(academyId))
    if (raw) return JSON.parse(raw) as AcademySettings
  } catch {
    // ignore parse errors
  }
  return null
}

export function saveCachedSettings(academyId: string, settings: AcademySettings): void {
  try {
    localStorage.setItem(getStorageKey(academyId), JSON.stringify(settings))
  } catch {
    // ignore quota errors
  }
}

export function applyAccentColor(color: string | null | undefined) {
  if (color) {
    document.documentElement.style.setProperty('--c-accent', color)
  }
}
