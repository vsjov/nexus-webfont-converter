const updateProgress = (
  section: HTMLElement,
  current: number,
  total: number,
  step: string
): void => {
  const fill = section.querySelector<HTMLElement>('.progress-bar__fill')
  const count = section.querySelector<HTMLElement>('.progress-bar__count')
  const stepEl = section.querySelector<HTMLElement>('#progress-step')
  const bar = section.querySelector<HTMLElement>('.progress-bar')

  const pct = total > 0 ? Math.round((current / total) * 100) : 0

  if (fill) fill.style.width = `${pct}%`
  if (count) count.textContent = `${current} / ${total}`
  if (stepEl) stepEl.textContent = step
  if (bar) bar.setAttribute('aria-valuenow', String(pct))
}

const resetProgress = (section: HTMLElement): void => {
  updateProgress(section, 0, 0, '')
}

export { updateProgress, resetProgress }
