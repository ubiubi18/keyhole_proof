import { useCallback, useEffect, useMemo, useState } from 'react'
import './App.css'
import { PolycubeViewer } from './components/PolycubeViewer'
import { SilhouetteOption } from './components/SilhouetteOption'
import { normalizeCells, serializeCells, serializeCubes } from './lib/geometry'
import { generatePuzzle, type Difficulty, type Puzzle } from './lib/puzzle'
import { createLargeUiSeed } from './lib/seed'
import { isSha256Hex, normalizeSha256Seed } from './lib/sha256'

function buildInitialPuzzle(): Puzzle {
  return generatePuzzle(createLargeUiSeed(), 'medium')
}

function formatCells(cells: ReturnType<typeof normalizeCells>): string {
  return normalizeCells(cells)
    .map((cell) => `(${cell.x}, ${cell.y})`)
    .join(' ')
}

function App() {
  const [difficulty, setDifficulty] = useState<Difficulty>('medium')
  const [puzzle, setPuzzle] = useState<Puzzle>(() => buildInitialPuzzle())
  const [seedInput, setSeedInput] = useState(() => puzzle.seed)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null)
  const [copyStatus, setCopyStatus] = useState('')

  const selectedChoice = selectedIndex === null ? null : puzzle.choices[selectedIndex]
  const hasAnswered = selectedIndex !== null
  const seedIsHash = useMemo(() => isSha256Hex(seedInput), [seedInput])

  const loadPuzzle = useCallback((seed: string, nextDifficulty: Difficulty) => {
    const nextPuzzle = generatePuzzle(seed, nextDifficulty)
    setPuzzle(nextPuzzle)
    setSeedInput(nextPuzzle.seed)
    setSelectedIndex(null)
    setCopyStatus('')
  }, [])

  const randomSeed = useCallback(() => {
    loadPuzzle(createLargeUiSeed(), difficulty)
  }, [difficulty, loadPuzzle])

  const regenerateFromSeed = useCallback(() => {
    loadPuzzle(seedInput, difficulty)
  }, [difficulty, loadPuzzle, seedInput])

  const newPuzzle = useCallback(() => {
    randomSeed()
  }, [randomSeed])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      const isEditing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'SELECT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable

      if (!isEditing && /^[1-6]$/.test(event.key)) {
        const choiceIndex = Number(event.key) - 1
        if (choiceIndex < puzzle.choices.length) {
          setSelectedIndex(choiceIndex)
        }
      }

      if (!isEditing && event.key.toLowerCase() === 'r') {
        event.preventDefault()
        randomSeed()
      }

      if (event.key === 'Enter') {
        event.preventDefault()
        regenerateFromSeed()
      }
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [puzzle.choices.length, randomSeed, regenerateFromSeed])

  const handleDifficultyChange = (nextDifficulty: Difficulty) => {
    setDifficulty(nextDifficulty)
    loadPuzzle(seedInput, nextDifficulty)
  }

  const copySeed = async () => {
    try {
      await navigator.clipboard.writeText(puzzle.seed)
      setCopyStatus('Copied')
    } catch {
      setCopyStatus('Copy failed')
    }
  }

  const canonicalPreview = seedIsHash ? seedInput.toLowerCase() : normalizeSha256Seed(seedInput)

  return (
    <main className="app-shell">
      <header className="top-bar">
        <div className="title-group">
          <p className="eyebrow">Human-work spatial benchmark</p>
          <h1>3D Keyhole Snap Judgment</h1>
        </div>

        <div className="controls" aria-label="Puzzle controls">
          <label className="seed-field">
            <span>Seed</span>
            <input
              value={seedInput}
              onChange={(event) => setSeedInput(event.target.value)}
              spellCheck={false}
              autoComplete="off"
              aria-describedby="seed-help"
            />
          </label>

          <label className="difficulty-field">
            <span>Difficulty</span>
            <select
              value={difficulty}
              onChange={(event) => handleDifficultyChange(event.target.value as Difficulty)}
            >
              <option value="easy">Easy: 7 cubes, 4 choices</option>
              <option value="medium">Medium: 10 cubes, 5 choices</option>
              <option value="hard">Hard: 13 cubes, 6 choices</option>
            </select>
          </label>

          <button type="button" onClick={randomSeed}>
            Random seed
          </button>
          <button type="button" className="primary-button" onClick={regenerateFromSeed}>
            Regenerate from seed
          </button>
          <button type="button" onClick={copySeed}>
            Copy seed
          </button>
        </div>
      </header>

      <p className="intro">
        One answer is a valid orthographic projection of the 3D cube object under rotation. The
        others are near-miss distractors.
      </p>
      <p id="seed-help" className="seed-note">
        Active seeds are 64-character SHA-256 hex digests. Non-hash text is canonicalized to{' '}
        <code>{canonicalPreview}</code>.
      </p>
      {copyStatus && <p className="copy-status">{copyStatus}</p>}

      <section className="play-surface">
        <article className="viewer-card" aria-label="3D object">
          <div className="card-heading">
            <div>
              <h2>Object</h2>
              <p>
                {puzzle.cubeCount} cubes, display rotation {puzzle.displayRotationIndex + 1}/24
              </p>
            </div>
            <button type="button" onClick={newPuzzle}>
              New puzzle
            </button>
          </div>
          <PolycubeViewer cubes={puzzle.cubes} displayRotationIndex={puzzle.displayRotationIndex} />
        </article>

        <section className="answer-section" aria-label="Answer choices">
          <div className="answer-heading">
            <h2>Keyholes</h2>
            <p>Use number keys 1-{puzzle.choices.length}, R for a random seed, Enter to regenerate.</p>
          </div>

          <div className="answer-grid">
            {puzzle.choices.map((choice, index) => (
              <SilhouetteOption
                key={`${choice.label}-${serializeCells(choice.silhouette)}`}
                label={choice.label}
                silhouette={choice.silhouette}
                selected={selectedIndex === index}
                reveal={hasAnswered}
                isCorrect={choice.isCorrect}
                onSelect={() => setSelectedIndex(index)}
              />
            ))}
          </div>
        </section>
      </section>

      {hasAnswered && selectedChoice && (
        <section className={`result-panel ${selectedChoice.isCorrect ? 'success' : 'error'}`}>
          <div>
            <p className="result-kicker">Result</p>
            <h2>{selectedChoice.isCorrect ? 'Correct' : 'Incorrect'}</h2>
            <p>
              Correct answer: <strong>{puzzle.choices[puzzle.correctIndex].label}</strong>
            </p>
          </div>
          <dl>
            <div>
              <dt>Seed</dt>
              <dd>{puzzle.seed}</dd>
            </div>
            <div>
              <dt>Cube count</dt>
              <dd>{puzzle.cubeCount}</dd>
            </div>
            <div>
              <dt>Canonical cube coordinates</dt>
              <dd>{serializeCubes(puzzle.cubes)}</dd>
            </div>
            <div>
              <dt>Valid projection chosen as answer</dt>
              <dd>{formatCells(puzzle.correctProjection)}</dd>
            </div>
          </dl>
        </section>
      )}

      <details className="debug-details">
        <summary>Debug details</summary>
        <pre>{JSON.stringify(puzzle, null, 2)}</pre>
      </details>
    </main>
  )
}

export default App
