import type { Silhouette } from '../lib/geometry'
import { getBounds2D, normalizeCells } from '../lib/geometry'

type SilhouetteOptionProps = {
  label: string
  silhouette: Silhouette
  selected: boolean
  reveal: boolean
  isCorrect: boolean
  onSelect: () => void
}

export function SilhouetteOption({
  label,
  silhouette,
  selected,
  reveal,
  isCorrect,
  onSelect,
}: SilhouetteOptionProps) {
  const normalized = normalizeCells(silhouette)
  const bounds = getBounds2D(normalized)
  const cellSize = 18
  const gap = 2
  const width = Math.max(1, bounds.width) * (cellSize + gap) + gap
  const height = Math.max(1, bounds.height) * (cellSize + gap) + gap
  const stateClass = reveal && isCorrect ? 'is-correct' : reveal && selected ? 'is-wrong' : ''

  return (
    <button
      type="button"
      className={`silhouette-option ${selected ? 'is-selected' : ''} ${stateClass}`}
      onClick={onSelect}
      aria-pressed={selected}
      aria-label={`Answer ${label}`}
    >
      <span className="option-label">{label}</span>
      <svg
        className="silhouette-svg"
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`Keyhole silhouette ${label}`}
      >
        <rect className="silhouette-backdrop" x="0" y="0" width={width} height={height} rx="4" />
        {normalized.map((cell) => (
          <rect
            key={`${cell.x},${cell.y}`}
            x={gap + cell.x * (cellSize + gap)}
            y={gap + cell.y * (cellSize + gap)}
            width={cellSize}
            height={cellSize}
            rx="1.5"
          />
        ))}
      </svg>
    </button>
  )
}
