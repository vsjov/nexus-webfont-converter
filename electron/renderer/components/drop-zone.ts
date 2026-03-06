const setupDropZone = (el: HTMLElement, onPaths: (paths: string[]) => void): void => {
  el.addEventListener('dragover', e => {
    e.preventDefault()
    e.stopPropagation()
    el.classList.add('drag-over')
  })

  el.addEventListener('dragleave', e => {
    e.stopPropagation()
    if (!el.contains(e.relatedTarget as Node)) {
      el.classList.remove('drag-over')
    }
  })

  el.addEventListener('drop', e => {
    e.preventDefault()
    e.stopPropagation()
    el.classList.remove('drag-over')

    const files = Array.from(e.dataTransfer?.files ?? [])
    if (files.length === 0) return

    const paths = files.map(f => window.api.getPathForFile(f))
    onPaths(paths)
  })
}

export default setupDropZone
