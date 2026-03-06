import type { DroppedItem } from '../../types.js'

const renderFileList = (
  el: HTMLElement,
  items: DroppedItem[],
  onRemove: (index: number) => void
): void => {
  el.innerHTML = items.map((item, i) => `
    <li class="file-item">
      <span class="file-item__name">${escapeHtml(item.label)}</span>
      <span class="file-item__count">${item.fileCount} file${item.fileCount !== 1 ? 's' : ''}</span>
      <button
        class="file-item__remove"
        data-index="${i}"
        aria-label="Remove ${escapeHtml(item.label)}"
        type="button"
      >×</button>
    </li>
  `).join('')

  el.querySelectorAll<HTMLButtonElement>('.file-item__remove').forEach(btn => {
    btn.addEventListener('click', () => {
      const index = Number(btn.dataset['index'])
      onRemove(index)
    })
  })
}

const escapeHtml = (str: string): string =>
  str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')

export default renderFileList
