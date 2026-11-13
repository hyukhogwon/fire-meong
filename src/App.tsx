import { useEffect, useRef, useState, type ReactNode } from "react";
import { Stage } from "./scene/stage";
import { FireAudio } from "./audio/fire-audio";
import { safeStore } from "./core/storage";
import { loadOrCreateIdentity, rerollIdentity } from "./core/identity";
import { loadVolume, saveVolume } from "./core/settings";
import { LogBook } from "./core/log-book";
import { WishBook } from "./core/wish-book";
import { remainingMs, formatRemaining } from "./core/cooldown";
import { toastProgress } from "./core/marshmallow";
import { AURORA_COLORS, auroraRemainingMs, togglePick } from "./core/aurora";
const store = safeStore(),
  logs = new LogBook(store),
  wishes = new WishBook(store);
const dateFormat = new Intl.DateTimeFormat("ko-KR", {
  dateStyle: "medium",
  timeStyle: "short",
});
type Modal = "wish" | "history" | "aurora" | null;
function Dialog({
  title,
  close,
  children,
}: {
  title: string;
  close: () => void;
  children: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const el = ref.current!;
    el.showModal();
    return () => el.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="dialog"
      aria-labelledby="dialog-title"
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <h2 id="dialog-title" className="dialog-title">
        {title}
      </h2>
      {children}
    </dialog>
  );
}
export function App() {
  const canvas = useRef<HTMLCanvasElement>(null),
    stage = useRef<Stage | null>(null),
    audio = useRef<FireAudio | null>(null);
  const [identity, setIdentity] = useState(() =>
    loadOrCreateIdentity(
      store,
      Math.random,
      () => crypto.randomUUID?.() ?? `${Date.now()}-${Math.random()}`,
    ),
  );
  const [volume, setVolume] = useState(() => loadVolume(store)),
    [now, setNow] = useState(Date.now),
    [modal, setModal] = useState<Modal>(null),
    [text, setText] = useState(""),
    [picked, setPicked] = useState<string[]>([]);
  const [toastAt, setToastAt] = useState<number | null>(null),
    [auroraAt, setAuroraAt] = useState<number | null>(null);
  const [status, setStatus] = useState<
    "idle" | "loading" | "playing" | "error" | "interrupted"
  >("idle");
  const [notice, setNotice] = useState(""),
    [sceneError, setSceneError] = useState("");
  useEffect(() => {
    try {
      stage.current = new Stage(canvas.current!);
      stage.current.setSelf(identity);
    } catch (e) {
      console.error(e);
      setSceneError(
        "3D 장면을 표시할 수 없어요. 하드웨어 가속을 켠 브라우저에서 다시 열어주세요.",
      );
    }
    audio.current = new FireAudio(() => setStatus("interrupted"), setNotice);
    const timer = window.setInterval(() => setNow(Date.now()), 1000);
    const visible = () => {
      setNow(Date.now());
      if (!document.hidden) stage.current?.updateSky(new Date());
    };
    document.addEventListener("visibilitychange", visible);
    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", visible);
      stage.current?.dispose();
      audio.current?.dispose();
    };
    // The stage is created once and receives subsequent identity changes below.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  useEffect(() => {
    stage.current?.setSelf(identity);
  }, [identity]);
  async function start() {
    setStatus("loading");
    setNotice("");
    try {
      await audio.current!.start(volume);
      setStatus("playing");
    } catch (e) {
      setStatus("error");
      setNotice(
        e instanceof Error
          ? e.message
          : "소리를 시작하지 못했어요. 다시 시도해주세요.",
      );
    }
  }
  const logLeft = remainingMs(logs.lastLogAt(), now),
    wishLeft = wishes.remainingMs(now),
    toasting = toastProgress(toastAt, now) !== null,
    auroraLeft = auroraRemainingMs(auroraAt, now);
  function open(type: Modal) {
    setText("");
    setPicked([]);
    setModal(type);
  }
  function wish() {
    const at = Date.now();
    if (wishes.wish(text, at).ok) {
      stage.current?.startWish(at);
      setNow(at);
      setModal(null);
    }
  }
  return (
    <>
      <canvas
        ref={canvas}
        className="scene"
        aria-label="별이 뜬 숲속의 모닥불, 캠퍼와 잠든 골든 리트리버"
      />
      <header className="brand">
        <span className="brand-symbol">✦</span>
        <div>
          <h1>불멍</h1>
          <p>잠시, 아무것도 하지 않아도 괜찮아요.</p>
        </div>
      </header>
      <label className="volume">
        <span className="volume-icon" aria-hidden="true">
          {volume === 0 ? "🔇" : "🔊"}
        </span>
        <input
          className="volume-range"
          aria-label="볼륨"
          type="range"
          min="0"
          max="1"
          step="0.01"
          value={volume}
          onChange={(e) => {
            const v = Number(e.target.value);
            setVolume(v);
            saveVolume(store, v);
            audio.current?.setVolume(v);
          }}
        />
      </label>
      <div className="actions" aria-label="캠프파이어 활동">
        <button
          className="log"
          disabled={!!logLeft || status !== "playing"}
          onClick={() => {
            const at = Date.now();
            if (logs.addLog(at).ok) {
              audio.current?.boost();
              stage.current?.flare();
              setNow(at);
            }
          }}
        >
          🪵 장작 넣기{logLeft ? ` (${formatRemaining(logLeft)} 후)` : ""}
        </button>
        <button
          className="toast"
          disabled={toasting || status !== "playing"}
          onClick={() => {
            const at = Date.now();
            setToastAt(at);
            stage.current?.startToast(at);
            setNow(at);
          }}
        >
          {toasting ? "🍡 굽는 중…" : "🍡 마시멜로 굽기"}
        </button>
        <button
          className="wish"
          disabled={!!wishLeft || status !== "playing"}
          onClick={() => open("wish")}
        >
          🌠 소원 빌기{wishLeft ? ` (${formatRemaining(wishLeft)} 후)` : ""}
        </button>
        <button
          className="aurora"
          disabled={!!auroraLeft || status !== "playing"}
          onClick={() => open("aurora")}
        >
          {auroraLeft
            ? `🌈 타는 중 (${formatRemaining(auroraLeft)})`
            : "🌈 오로라 가루"}
        </button>
      </div>
      <button
        className="reroll"
        title="이름·모습 다시 뽑기"
        aria-label="이름·모습 다시 뽑기"
        onClick={() =>
          setIdentity(rerollIdentity(store, identity, Math.random))
        }
      >
        🎲
      </button>
      <button
        className="history"
        title="내 소원 보기"
        aria-label="내 소원 보기"
        onClick={() => open("history")}
      >
        📜
      </button>
      {status !== "playing" && (
        <div className="start-overlay">
          <div className="welcome">
            <p className="eyebrow">YOUR LITTLE CAMP, UNDER THE STARS</p>
            <h2>
              오늘의 끝에,
              <br />
              작은 불 하나.
            </h2>
            <p className="welcome-copy">
              타닥타닥 장작 소리와 풀벌레 소리.
              <br />
              별이 뜬 숲에서 잠시 쉬어가세요.
            </p>
            <button
              className="start"
              disabled={status === "loading"}
              onClick={start}
            >
              {status === "loading"
                ? "🔥 불 붙이는 중…"
                : status === "error"
                  ? "🔥 다시 시도"
                  : status === "interrupted"
                    ? "🔥 소리 다시 켜기"
                    : "🔥 불 피우기"}
            </button>
            <p className="start-hint">
              탭을 열어두고 일하세요. 장작 소리가 계속 납니다.
            </p>
          </div>
        </div>
      )}
      {(notice || sceneError) && (
        <p className="notice" role="status">
          {sceneError || notice}
        </p>
      )}
      {status === "playing" && (
        <p className="quiet-note">별 아래, 나만의 작은 쉼터</p>
      )}
      {modal === "wish" && (
        <Dialog title="🌠 소원을 적어주세요" close={() => setModal(null)}>
          <textarea
            autoFocus
            className="wish-text"
            aria-label="소원"
            placeholder="별똥별에게 빌 소원"
            rows={3}
            maxLength={100}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={(e) => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.nativeEvent.isComposing
              ) {
                e.preventDefault();
                wish();
              }
            }}
          />
          <div className="dialog-row">
            <span className="wish-count">{text.length}/100</span>
            <button className="dialog-secondary" onClick={() => setModal(null)}>
              취소
            </button>
            <button
              className="dialog-primary"
              disabled={!text.trim()}
              onClick={wish}
            >
              빌기
            </button>
          </div>
        </Dialog>
      )}
      {modal === "history" && (
        <Dialog title="📜 내 소원" close={() => setModal(null)}>
          <ul className="wish-list">
            {wishes.list().length ? (
              wishes.list().map((w, i) => (
                <li className="wish-item" key={`${w.at}-${i}`}>
                  <time
                    className="wish-date"
                    dateTime={new Date(w.at).toISOString()}
                  >
                    {dateFormat.format(w.at)}
                  </time>
                  <p className="wish-body">{w.text}</p>
                </li>
              ))
            ) : (
              <li className="wish-empty">아직 빈 소원이 없어요.</li>
            )}
          </ul>
          <div className="dialog-row">
            <button className="dialog-secondary" onClick={() => setModal(null)}>
              닫기
            </button>
          </div>
        </Dialog>
      )}
      {modal === "aurora" && (
        <Dialog title="🌈 불꽃 색을 골라주세요" close={() => setModal(null)}>
          <p className="dialog-hint">마음에 드는 색을 두 개까지 골라주세요.</p>
          <div className="aurora-swatches">
            {AURORA_COLORS.map((c) => (
              <button
                key={c.id}
                className="aurora-swatch"
                style={{ "--swatch": c.hex } as React.CSSProperties}
                aria-pressed={picked.includes(c.id)}
                disabled={picked.length === 2 && !picked.includes(c.id)}
                onClick={() => setPicked(togglePick(picked, c.id))}
              >
                <span className="aurora-dot" />
                <span className="aurora-label">{c.label}</span>
              </button>
            ))}
          </div>
          <div className="dialog-row">
            <span className="wish-count">{picked.length}/2</span>
            <button className="dialog-secondary" onClick={() => setModal(null)}>
              취소
            </button>
            <button
              className="dialog-primary"
              disabled={!picked.length}
              onClick={() => {
                const at = Date.now();
                stage.current?.startAurora(
                  at,
                  AURORA_COLORS.filter((c) => picked.includes(c.id)).map(
                    (c) => c.hex,
                  ),
                );
                setAuroraAt(at);
                setNow(at);
                setModal(null);
              }}
            >
              넣기
            </button>
          </div>
        </Dialog>
      )}
    </>
  );
}
