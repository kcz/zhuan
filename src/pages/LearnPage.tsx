import { useCallback, useEffect, useMemo, useState } from 'react'
import type { LearnProgress, ZhuanEntry } from '../types'
import { readJson, removeKey, writeJson } from '../lib/storage'
import { pickRandom, pickWeightedRandom, uniqueBy } from '../lib/random'
import { EntryGlyph } from '../components/EntryGlyph'

const STORAGE_KEY = 'zhuan-learn.learnProgress.v1'

type Mode = 'flashcard' | 'quiz'

type QuizState = {
  correctId: string
  optionIds: string[]
  pickedId?: string
}

const safeReadProgress = (): LearnProgress => {
  const raw = readJson<unknown>(STORAGE_KEY)
  if (!raw || typeof raw !== 'object') return {}
  return raw as LearnProgress
}

const clampNonNegative = (n: number) => (Number.isFinite(n) ? Math.max(0, n) : 0)

export const LearnPage = ({ entries }: { entries: ZhuanEntry[] }) => {
  const [mode, setMode] = useState<Mode>('flashcard')
  const [progress, setProgress] = useState<LearnProgress>(() => safeReadProgress())
  const [currentId, setCurrentId] = useState<string | null>(() => {
    const first = entries.find((e) => Boolean(e.glyph))
    return first?.id ?? null
  })
  const [revealed, setRevealed] = useState(false)
  const [quiz, setQuiz] = useState<QuizState | null>(null)

  const eligible = useMemo(() => entries.filter((e) => Boolean(e.glyph)), [entries])

  useEffect(() => {
    writeJson(STORAGE_KEY, progress)
  }, [progress])

  const currentEntry = useMemo(() => {
    if (!currentId) return null
    return eligible.find((e) => e.id === currentId) ?? null
  }, [currentId, eligible])

  const statsOf = useCallback(
    (id: string) => {
      const s = progress[id]
      if (!s) return { known: 0, unknown: 0, lastSeenAt: undefined as number | undefined }
      return {
        known: clampNonNegative(s.known),
        unknown: clampNonNegative(s.unknown),
        lastSeenAt: typeof s.lastSeenAt === 'number' ? s.lastSeenAt : undefined,
      }
    },
    [progress],
  )

  const weightOf = useCallback(
    (entry: ZhuanEntry) => {
      const stats = statsOf(entry.id)
      const base = 1
      const difficulty = 1 + stats.unknown * 3 + Math.max(0, 2 - Math.min(2, stats.known))
      const age =
        typeof stats.lastSeenAt === 'number' ? Date.now() - stats.lastSeenAt : 1000 * 3600 * 72
      const recencyFactor = Math.min(1.6, Math.max(0.2, age / (1000 * 3600 * 24)))
      return base * difficulty * recencyFactor
    },
    [statsOf],
  )

  const pickNext = useCallback(() => {
    const next = pickWeightedRandom(eligible, weightOf)
    setCurrentId(next?.id ?? null)
    setRevealed(false)
    setQuiz(null)
  }, [eligible, weightOf])

  const mark = useCallback((id: string, deltaKnown: number, deltaUnknown: number) => {
    setProgress((prev) => {
      const cur = prev[id] ?? { known: 0, unknown: 0 }
      const next = {
        ...prev,
        [id]: {
          known: clampNonNegative((cur.known ?? 0) + deltaKnown),
          unknown: clampNonNegative((cur.unknown ?? 0) + deltaUnknown),
          lastSeenAt: Date.now(),
        },
      }
      return next
    })
  }, [])

  const startQuiz = useCallback(() => {
    if (!eligible.length) return
    const correct = pickWeightedRandom(eligible, weightOf) ?? pickRandom(eligible)
    if (!correct) return
    const distractors = uniqueBy(
      eligible.filter((e) => e.id !== correct.id),
      (e) => e.hanzi,
    )
    const options: ZhuanEntry[] = [correct]
    while (options.length < 4 && distractors.length) {
      const pick = pickRandom(distractors)
      if (!pick) break
      const idx = distractors.findIndex((e) => e.id === pick.id)
      if (idx >= 0) distractors.splice(idx, 1)
      options.push(pick)
    }
    options.sort(() => Math.random() - 0.5)
    setQuiz({ correctId: correct.id, optionIds: options.map((x) => x.id) })
    setCurrentId(correct.id)
    setRevealed(true)
  }, [eligible, weightOf])

  const reset = () => {
    setProgress({})
    removeKey(STORAGE_KEY)
  }

  if (eligible.length === 0) {
    return (
      <section className="panel">
        <div className="panelHeader">
          <div className="panelHeaderTitle">学习</div>
        </div>
        <div className="empty">
          当前字库里没有带字形的条目。请先到「字库」页给条目上传 SVG/PNG 字形。
        </div>
      </section>
    )
  }

  return (
    <section className="panel">
      <div className="panelHeader">
        <div className="panelHeaderTitle">学习</div>
        <div className="panelHeaderActions">
          <button
            type="button"
            className={mode === 'flashcard' ? 'btnPrimary' : 'btn'}
            onClick={() => {
              setMode('flashcard')
              setQuiz(null)
              setRevealed(false)
            }}
          >
            闪卡
          </button>
          <button
            type="button"
            className={mode === 'quiz' ? 'btnPrimary' : 'btn'}
            onClick={() => {
              setMode('quiz')
              setRevealed(true)
              startQuiz()
            }}
          >
            测验
          </button>
          <button type="button" className="btn" onClick={reset}>
            重置进度
          </button>
        </div>
      </div>

      <div className="learnWrap">
        <div className="learnCard">
          {!currentEntry ? (
            <div className="empty">
              <div>尚未开始。</div>
              <div className="learnActions">
                <button type="button" className="btnPrimary" onClick={pickNext}>
                  开始学习
                </button>
              </div>
            </div>
          ) : null}
          <div className="learnGlyph">
            <EntryGlyph entry={currentEntry} size={220} label="题目字形" />
          </div>

          {mode === 'flashcard' ? (
            <div className="learnInfo">
              <div className="learnTitle">
                {revealed ? (
                  <>
                    <span className="detailHanzi">{currentEntry?.hanzi}</span>
                    {currentEntry?.pinyin ? <span className="detailPinyin">{currentEntry.pinyin}</span> : null}
                  </>
                ) : (
                  <span className="learnHidden">点击“显示答案”</span>
                )}
              </div>
              {revealed && currentEntry?.meaning ? (
                <div className="detailMeaning">{currentEntry.meaning}</div>
              ) : null}
              {revealed && currentEntry?.keywords.length ? (
                <div className="detailKeywords">{currentEntry.keywords.join(' · ')}</div>
              ) : null}
            </div>
          ) : null}

          {mode === 'flashcard' ? (
            <div className="learnActions">
              <button type="button" className="btn" onClick={() => setRevealed(true)} disabled={revealed}>
                显示答案
              </button>
              <button
                type="button"
                className="btnDanger"
                onClick={() => {
                  if (!currentEntry) return
                  mark(currentEntry.id, 0, 1)
                  pickNext()
                }}
              >
                不认识
              </button>
              <button
                type="button"
                className="btnPrimary"
                onClick={() => {
                  if (!currentEntry) return
                  mark(currentEntry.id, 1, 0)
                  pickNext()
                }}
              >
                认识
              </button>
              <button type="button" className="btn" onClick={pickNext}>
                下一个
              </button>
            </div>
          ) : null}

          {mode === 'quiz' && quiz ? (
            <div className="quiz">
              <div className="quizTitle">选出对应的汉字</div>
              <div className="quizOptions">
                {quiz.optionIds.map((id) => {
                  const entry = eligible.find((e) => e.id === id)
                  if (!entry) return null
                  const picked = quiz.pickedId === id
                  const correct = quiz.correctId === id
                  const showResult = Boolean(quiz.pickedId)
                  const cls = showResult
                    ? correct
                      ? 'quizBtn correct'
                      : picked
                        ? 'quizBtn wrong'
                        : 'quizBtn'
                    : 'quizBtn'
                  return (
                    <button
                      key={id}
                      className={cls}
                      type="button"
                      onClick={() => {
                        if (quiz.pickedId) return
                        setQuiz((q) => (q ? { ...q, pickedId: id } : q))
                        if (id === quiz.correctId) mark(quiz.correctId, 1, 0)
                        else mark(quiz.correctId, 0, 1)
                      }}
                    >
                      {entry.hanzi}
                    </button>
                  )
                })}
              </div>
              <div className="learnActions">
                <button
                  type="button"
                  className="btnPrimary"
                  onClick={() => {
                    startQuiz()
                  }}
                >
                  下一题
                </button>
              </div>
            </div>
          ) : null}
        </div>

        {currentEntry ? (
          <div className="learnSide">
            <div className="sideTitle">当前条目</div>
            <div className="sideBody">
              <div className="sideRow">
                <span className="sideLabel">汉字</span>
                <span className="sideValue">{currentEntry.hanzi}</span>
              </div>
              {currentEntry.pinyin ? (
                <div className="sideRow">
                  <span className="sideLabel">拼音</span>
                  <span className="sideValue">{currentEntry.pinyin}</span>
                </div>
              ) : null}
              {currentEntry.meaning ? (
                <div className="sideRow">
                  <span className="sideLabel">释义</span>
                  <span className="sideValue">{currentEntry.meaning}</span>
                </div>
              ) : null}
              <div className="sideRow">
                <span className="sideLabel">认识</span>
                <span className="sideValue">{statsOf(currentEntry.id).known}</span>
              </div>
              <div className="sideRow">
                <span className="sideLabel">不认识</span>
                <span className="sideValue">{statsOf(currentEntry.id).unknown}</span>
              </div>
              {mode === 'flashcard' ? (
                <button type="button" className="btn" onClick={() => setRevealed((v) => !v)}>
                  {revealed ? '隐藏答案' : '显示答案'}
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </div>
    </section>
  )
}
