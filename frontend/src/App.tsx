import { useEffect, useRef, useState } from 'react';
import type { ChangeEvent, DragEvent } from 'react';
import './app.css';

const MAX_FILES = 10;
const MAX_BYTES = 50 * 1024 * 1024;
const CODE_RE = /^[A-HJ-NP-Z2-9]{6}$/;
type Item = { file: File; key: string; name: string };
type Rejection = { id: string; name: string; reason: string; size?: number };
type DemoState =
  | 'editing'
  | 'full'
  | 'rejected'
  | 'ready'
  | 'connected'
  | 'expiring'
  | 'expired'
  | 'deleted'
  | 'failed'
  | 'preview';

function formatSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}
function safeName(value: string) {
  return value.normalize('NFC').replace(/[\u202A-\u202E\u2066-\u2069]/g, '␣');
}
function fileKey(file: File) {
  return `${file.name}\0${file.size}\0${file.lastModified}`;
}
function App() {
  const path = window.location.pathname;
  const receiver = path === '/receive' || path.startsWith('/t/');
  const direct = path.startsWith('/t/');
  const [systemPrefersReducedMotion, setSystemPrefersReducedMotion] = useState(
    () =>
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches,
  );
  const [motionOverride, setMotionOverride] = useState<boolean | null>(null);
  const motionEnabled = motionOverride ?? !systemPrefersReducedMotion;

  useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)');
    const updatePreference = (event: MediaQueryListEvent) =>
      setSystemPrefersReducedMotion(event.matches);
    preference.addEventListener('change', updatePreference);
    return () => preference.removeEventListener('change', updatePreference);
  }, []);

  const toggleMotion = () => setMotionOverride(!motionEnabled);

  return receiver ? (
    <Receiver
      directCode={direct ? path.split('/')[2]?.toUpperCase() : undefined}
      motionEnabled={motionEnabled}
      onToggleMotion={toggleMotion}
    />
  ) : (
    <Sender motionEnabled={motionEnabled} onToggleMotion={toggleMotion} />
  );
}

function PrototypeFooter({
  motionEnabled,
  onToggleMotion,
}: {
  motionEnabled: boolean;
  onToggleMotion: () => void;
}) {
  return (
    <footer className="prototype-footer">
      <span>PROTOTYPE · SAMPLE DATA ON THIS SCREEN</span>
      <button
        className="motion-toggle"
        type="button"
        aria-pressed={motionEnabled}
        onClick={onToggleMotion}
      >
        MOTION: {motionEnabled ? 'ON' : 'OFF'}
      </button>
    </footer>
  );
}

function Header({
  dark = false,
  active,
}: {
  dark?: boolean;
  active: 'send' | 'receive';
}) {
  return (
    <header className={`header ${dark ? 'dark' : ''}`}>
      <a className="brand" href="/send" aria-label="DropLink home">
        <span className="brand-mark" aria-hidden="true">
          ↗
        </span>
        <span>droplink</span>
      </a>
      <nav className="mode-nav" aria-label="Transfer mode">
        <a href="/send" aria-current={active === 'send' ? 'page' : undefined}>
          SEND <span>PC → PHONE</span>
        </a>
        <a
          href="/receive"
          aria-current={active === 'receive' ? 'page' : undefined}
        >
          RECEIVE <span>PHONE → PC</span>
        </a>
      </nav>
      <span className="header-note">
        NO ACCOUNT · ACCESS EXPIRES IN 30 MINUTES
      </span>
    </header>
  );
}
function Rail({
  onSelect,
  receiver = false,
}: {
  onSelect: (state: string) => void;
  receiver?: boolean;
}) {
  const states = receiver
    ? ['Entry', 'SAMPLE list', 'Not found', 'Expired']
    : [
        'Empty',
        'Selected',
        'Full',
        'Rejected',
        'Uploading preview',
        'Failed',
        'Ready',
        'Connected',
        'Expiring',
        'Expired',
        'Deleted',
      ];
  return (
    <nav className="prototype-rail" aria-label="Prototype state controls">
      <span>PROTOTYPE · STATE ▸</span>
      {states.map((s) => (
        <button key={s} onClick={() => onSelect(s)}>
          {s}
        </button>
      ))}
    </nav>
  );
}

function Sender({
  motionEnabled,
  onToggleMotion,
}: {
  motionEnabled: boolean;
  onToggleMotion: () => void;
}) {
  const [files, setFiles] = useState<Item[]>([]);
  const [rejects, setRejects] = useState<Rejection[]>([]);
  const [state, setState] = useState<DemoState>('editing');
  const [drag, setDrag] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [notice, setNotice] = useState('');
  const input = useRef<HTMLInputElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const used = files.reduce((n, item) => n + item.file.size, 0);
  const remaining = Math.max(0, MAX_BYTES - used);
  const locked = files.length >= MAX_FILES || used >= MAX_BYTES;
  const ready = [
    'ready',
    'connected',
    'expiring',
    'expired',
    'deleted',
  ].includes(state);

  useEffect(() => {
    document.title = '[Prototype] DropLink — Send';
  }, []);
  useEffect(() => {
    const deleted = () => setState('deleted');
    window.addEventListener('prototype-deleted', deleted);
    return () => window.removeEventListener('prototype-deleted', deleted);
  }, []);
  useEffect(() => {
    const deleted = () => setState('deleted');
    window.addEventListener('prototype-deleted', deleted);
    return () => window.removeEventListener('prototype-deleted', deleted);
  }, []);
  useEffect(() => {
    const over = (event: globalThis.DragEvent) => {
      if (event.dataTransfer?.types.includes('Files')) {
        event.preventDefault();
        setDrag(true);
      }
    };
    const leave = (event: globalThis.DragEvent) => {
      if (event.relatedTarget === null) setDrag(false);
    };
    const drop = () => setDrag(false);
    window.addEventListener('dragover', over);
    window.addEventListener('dragleave', leave);
    window.addEventListener('drop', drop);
    return () => {
      window.removeEventListener('dragover', over);
      window.removeEventListener('dragleave', leave);
      window.removeEventListener('drop', drop);
    };
  }, []);

  function addFiles(incoming: File[], folders: boolean[] = []) {
    const next = [...files];
    const batch: Rejection[] = [];
    let added = 0;
    incoming.forEach((file, index) => {
      let reason = '';
      if (
        folders[index] ||
        (
          file as File & { webkitRelativePath?: string }
        ).webkitRelativePath?.includes('/')
      )
        reason = "Folders aren't supported. Add the files inside.";
      else if (file.size === 0) reason = 'Empty file. Not added.';
      else if (next.some((item) => item.key === fileKey(file)))
        reason = 'Already in this transfer.';
      else if (next.length >= MAX_FILES)
        reason = 'Link is full. 10 of 10 files.';
      else if (file.size > MAX_BYTES) reason = 'Larger than 50 MB. Not added.';
      else if (
        next.reduce((n, item) => n + item.file.size, 0) + file.size >
        MAX_BYTES
      )
        reason = `Would exceed 50 MB total. ${formatSize(Math.max(0, MAX_BYTES - next.reduce((n, item) => n + item.file.size, 0)))} left.`;
      if (reason)
        batch.push({
          id: crypto.randomUUID(),
          name: safeName(file.name),
          reason,
          size: reason.includes('50 MB') ? file.size : undefined,
        });
      else {
        next.push({ file, key: fileKey(file), name: safeName(file.name) });
        added++;
      }
    });
    setFiles(next);
    setRejects(batch);
    setExpanded(false);
    setState('editing');
    if (incoming.length)
      setNotice(
        `${added} file${added === 1 ? '' : 's'} added. ${batch.length} not added${batch.length ? `: ${batch.map((r) => r.reason).join(' ')}` : ''}`,
      );
  }
  function pickerChange(event: ChangeEvent<HTMLInputElement>) {
    addFiles(Array.from(event.target.files || []));
    event.target.value = '';
  }
  function stageDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault();
    setDrag(false);
    const entries = Array.from(event.dataTransfer.items || []).map((item) =>
      item.webkitGetAsEntry?.(),
    );
    const folderFlags = entries.map((entry) => !!entry?.isDirectory);
    addFiles(Array.from(event.dataTransfer.files), folderFlags);
  }
  function remove(index: number) {
    setFiles((prev) => prev.filter((_, i) => i !== index));
    setState('editing');
  }
  function setRailState(value: string) {
    setNotice('');
    if (value === 'Selected') {
      setFiles(
        Array.from({ length: 3 }, (_, i) => {
          const file = new File(
            [new Uint8Array((i + 1) * 1024 * 1024)],
            `document-${i + 1}.pdf`,
            { lastModified: 1 },
          );
          return { file, key: fileKey(file), name: file.name };
        }),
      );
      setRejects([]);
      setState('editing');
    } else if (value === 'Full') {
      setFiles(
        Array.from({ length: 10 }, (_, i) => {
          const file = new File(
            [new Uint8Array(1024)],
            `sample-${String(i + 1).padStart(2, '0')}.pdf`,
            { lastModified: 2 },
          );
          return { file, key: fileKey(file), name: file.name };
        }),
      );
      setRejects([]);
      setState('editing');
    } else if (value === 'Rejected') {
      const file = new File([new Uint8Array(1024)], 'sample.pdf');
      setFiles([{ file, key: fileKey(file), name: file.name }]);
      setRejects([
        {
          id: crypto.randomUUID(),
          name: 'large-video.mov',
          reason: 'Larger than 50 MB. Not added.',
          size: 51 * 1024 * 1024,
        },
      ]);
      setState('editing');
    } else if (value === 'Empty') {
      setFiles([]);
      setRejects([]);
      setState('editing');
    } else
      setState(
        (
          {
            'Uploading preview': 'preview',
            Failed: 'failed',
            Ready: 'ready',
            Connected: 'connected',
            Expiring: 'expiring',
            Expired: 'expired',
            Deleted: 'deleted',
          } as Record<string, DemoState>
        )[value] || 'editing',
      );
  }

  return (
    <div className={`sender-shell ${motionEnabled ? '' : 'motion-disabled'}`}>
      <div className="product-frame">
        <Header active="send" />
        <main className={`send-layout ${ready ? 'is-ready' : ''}`}>
          {!ready ? (
            <>
              <aside className="send-aside">
                <p className="eyebrow">PRIVATE BY DESIGN</p>
                {files.length ? (
                  <h1 className="compact-title">
                    COMPUTER <span>→</span> PHONE
                  </h1>
                ) : (
                  <h1 className="landing-headline">
                    Your files. Either way.
                    <br />
                    <span className="direction-line">
                      Phone <b>↔</b> Computer.
                    </span>
                    <br />
                    <em>No account. Access expires in 30 minutes.</em>
                  </h1>
                )}
                {!files.length && (
                  <div className="spec-legend">
                    <span>10 FILES MAX</span>
                    <span>50 MB TOTAL</span>
                    <span>30 MIN LIFE</span>
                  </div>
                )}
                {files.length > 0 && (
                  <Manifest
                    files={files}
                    remove={remove}
                    locked={false}
                    used={used}
                    remaining={remaining}
                    clear={() => {
                      setFiles([]);
                      setRejects([]);
                      setState('editing');
                    }}
                    create={() => setState('ready')}
                  />
                )}
              </aside>
              <section className="stage-column">
                <div
                  className={`stage ${drag ? 'dragging' : ''} ${locked ? 'locked' : ''}`}
                  ref={stage}
                  onDragOver={(e) => {
                    e.preventDefault();
                    if (!locked) setDrag(true);
                  }}
                  onDragLeave={() => setDrag(false)}
                  onDrop={stageDrop}
                >
                  <div className="dimension top-dimension" aria-hidden="true">
                    <span>
                      {locked
                        ? '10 / 10 · FULL'
                        : `${files.length} / 10 · FILES MAX`}
                    </span>
                    <div>
                      {Array.from({ length: 10 }, (_, i) => (
                        <i
                          key={i}
                          className={i < files.length ? 'filled' : ''}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="dimension side-dimension" aria-hidden="true">
                    <span>50 MB TOTAL</span>
                    <div className="side-track">
                      <i
                        style={{
                          height: `${Math.min(100, (used / MAX_BYTES) * 100)}%`,
                        }}
                      />
                      <b
                        style={{
                          bottom: `${Math.min(100, (used / MAX_BYTES) * 100)}%`,
                        }}
                      />
                    </div>
                    {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((t) => (
                      <small key={t} style={{ bottom: `${t * 10}%` }}>
                        {t * 5}
                      </small>
                    ))}
                  </div>
                  <div className="stage-drawing">
                    <i className="corner tl" />
                    <i className="corner tr" />
                    <i className="corner bl" />
                    <i className="corner br" />
                    <span className="crosshair" aria-hidden="true">
                      +
                    </span>
                    <div className="drop-copy">
                      <strong>
                        {locked
                          ? 'LINK IS FULL'
                          : drag
                            ? 'RELEASE'
                            : files.length
                              ? `ADD MORE · ${formatSize(remaining)} LEFT · ${MAX_FILES - files.length} SLOTS`
                              : 'DROP FILES'}
                      </strong>
                      <button
                        className="text-button choose"
                        aria-describedby="choose-note"
                        aria-disabled={locked}
                        onClick={() =>
                          locked
                            ? setNotice(
                                'Link is full. Remove a file to add another.',
                              )
                            : input.current?.click()
                        }
                      >
                        {files.length
                          ? 'or choose more files'
                          : 'or choose files'}
                      </button>
                      <span id="choose-note" className="sr-only">
                        Choose up to 10 files and 50 MB total.
                      </span>
                    </div>
                    <p className="local-note">
                      Files stay on this computer. Nothing is uploaded in this
                      prototype.
                    </p>
                    {state === 'preview' && (
                      <p className="state-preview" role="status">
                        UPLOAD PREVIEW · No files are uploaded and no progress
                        is simulated.
                      </p>
                    )}
                    {state === 'failed' && (
                      <p className="state-preview" role="status">
                        SAMPLE ERROR · Couldn't create the link. Try again. Your
                        files are still selected.
                      </p>
                    )}
                    {rejects.length > 0 && (
                      <div className="rejection-tray">
                        <span className="overshoot-label">
                          +
                          {formatSize(
                            rejects
                              .filter((item) => item.size)
                              .reduce((sum, item) => sum + (item.size || 0), 0),
                          )}{' '}
                          REJECTED BY SIZE
                        </span>
                        <div className="tray-head">
                          <strong>NOT ADDED · {rejects.length}</strong>
                          <button onClick={() => setRejects([])}>
                            DISMISS ALL
                          </button>
                        </div>
                        {rejects
                          .slice(0, expanded ? undefined : 5)
                          .map((item) => (
                            <div className="rejection-row" key={item.id}>
                              <span className="hatch" />
                              <span className="reject-name">{item.name}</span>
                              <span>{item.reason}</span>
                              <button
                                aria-label={`Dismiss ${item.name}`}
                                onClick={() =>
                                  setRejects((r) =>
                                    r.filter((x) => x.id !== item.id),
                                  )
                                }
                              >
                                ×
                              </button>
                            </div>
                          ))}
                        {rejects.length > 5 && (
                          <button
                            className="text-button"
                            onClick={() => setExpanded(!expanded)}
                          >
                            {expanded
                              ? 'SHOW LESS'
                              : `+${rejects.length - 5} MORE`}
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                  <input
                    ref={input}
                    type="file"
                    multiple
                    hidden
                    onChange={pickerChange}
                  />
                  {notice && (
                    <p className="inline-notice" role="status">
                      {notice}
                    </p>
                  )}
                </div>
              </section>
            </>
          ) : (
            <ReadyView
              state={state}
              files={files}
              used={used}
              reset={() => {
                setFiles([]);
                setRejects([]);
                setState('editing');
              }}
            />
          )}
        </main>
        <PrototypeFooter
          motionEnabled={motionEnabled}
          onToggleMotion={onToggleMotion}
        />
      </div>
      <Rail onSelect={setRailState} />
    </div>
  );
}

function Manifest({
  files,
  remove,
  locked,
  used,
  remaining,
  clear,
  create,
  compact = false,
}: {
  files: Item[];
  remove: (i: number) => void;
  locked: boolean;
  used: number;
  remaining: number;
  clear?: () => void;
  create?: () => void;
  compact?: boolean;
}) {
  return (
    <section
      className={`manifest ${compact ? 'compact' : ''}`}
      aria-label="Selected file manifest"
    >
      <div className="manifest-heading">
        <strong>MANIFEST</strong>
        <span>{String(files.length).padStart(2, '0')} / 10</span>
      </div>
      <ol className="manifest-slots">
        {files.map((item, index) => {
          const ext = item.name.includes('.')
            ? item.name.split('.').pop()!.toUpperCase()
            : '—';
          return (
            <li key={item.key}>
              <span className="row-index">
                {String(index + 1).padStart(2, '0')}
              </span>
              <span className="file-name" title={item.name}>
                {item.name}
              </span>
              <span className="extension">{ext}</span>
              <span className="file-size">{formatSize(item.file.size)}</span>
              {!locked && (
                <button
                  className="remove-file"
                  aria-label={`Remove ${item.name}`}
                  onClick={() => remove(index)}
                >
                  ×
                </button>
              )}
            </li>
          );
        })}
        {Array.from({ length: Math.max(0, 10 - files.length) }, (_, i) => (
          <li className="empty-slot" key={`empty-${i}`} aria-hidden="true" />
        ))}
      </ol>
      <div className="gauge">
        <div className="gauge-track">
          <i style={{ width: `${Math.min(100, (used / MAX_BYTES) * 100)}%` }} />
          <b style={{ left: `${Math.min(100, (used / MAX_BYTES) * 100)}%` }} />
        </div>
        <span>
          {formatSize(used)} / 50 MB · {formatSize(remaining)} LEFT
        </span>
      </div>
      {!compact && (
        <div className="manifest-actions">
          <button
            className="primary-button"
            disabled={!files.length}
            onClick={create}
          >
            CREATE SAMPLE LINK
          </button>
          {files.length >= 2 && (
            <button className="text-button" onClick={clear}>
              CLEAR
            </button>
          )}
        </div>
      )}
    </section>
  );
}

function ReadyView({
  state,
  files,
  used,
  reset,
}: {
  state: DemoState;
  files: Item[];
  used: number;
  reset: () => void;
}) {
  const [dialog, setDialog] = useState(false);
  const [copied, setCopied] = useState('');
  const expired = state === 'expired' || state === 'deleted';
  const [seconds, setSeconds] = useState(
    state === 'expiring' ? 240 : 29 * 60 + 41,
  );
  useEffect(() => {
    if (state !== 'ready' && state !== 'connected' && state !== 'expiring')
      return;
    const timer = window.setInterval(
      () => setSeconds((n) => Math.max(0, n - 1)),
      1000,
    );
    return () => window.clearInterval(timer);
  }, [state]);
  const copy = async (what: string) => {
    try {
      await navigator.clipboard.writeText(
        what === 'code' ? 'SAMPLE' : `${location.origin}/t/SAMPLE`,
      );
      setCopied(`${what.toUpperCase()} COPIED`);
    } catch {
      setCopied('Clipboard unavailable in this browser.');
    }
  };
  return (
    <section className="ready-screen">
      <div className="ready-top">
        <div>
          <p className="eyebrow">SAMPLE · NOT LIVE</p>
          <h1>Send this link to your phone.</h1>
        </div>
        <button className="outline-button" onClick={() => setDialog(true)}>
          DELETE NOW
        </button>
      </div>
      {expired ? (
        <div className="terminal-state">
          <div className="empty-qr">
            <i />
            <i />
            <i />
            <i />
          </div>
          <p className="eyebrow">
            {state === 'deleted' ? 'TRANSFER DELETED' : 'LINK EXPIRED'}
          </p>
          <h2>
            {state === 'deleted'
              ? 'Transfer deleted.'
              : 'This link has closed.'}
          </h2>
          <p>
            {state === 'deleted'
              ? 'The link no longer works.'
              : 'Access closed after 30 minutes.'}
          </p>
          <button className="primary-button" onClick={reset}>
            NEW TRANSFER
          </button>
        </div>
      ) : (
        <div className="handoff">
          <div className="ready-manifest">
            <Manifest
              files={files}
              remove={() => undefined}
              locked
              used={used}
              remaining={MAX_BYTES - used}
              compact
            />
          </div>
          <div className="handoff-main">
            <div className="sample-tab">SAMPLE · NOT LIVE</div>
            <div className="handoff-center">
              <div className="code-panel">
                <span className="status-chip">
                  {state === 'connected'
                    ? 'DEVICE CONNECTED'
                    : state === 'expiring'
                      ? 'LAST 5 MIN'
                      : 'WAITING FOR A DEVICE'}
                </span>
                <div className="code-cells">
                  {'SAMPLE'.split('').map((char, i) => (
                    <span key={i}>
                      <small>0{i + 1} · ──</small>
                      {char}
                    </span>
                  ))}
                </div>
                <div className="copy-actions">
                  <button onClick={() => void copy('code')}>COPY CODE</button>
                  <button onClick={() => void copy('link')}>COPY LINK</button>
                </div>
                {copied && <p role="status">{copied}</p>}
              </div>
              <div
                className={`signal-line ${state === 'connected' ? 'solid' : ''}`}
                aria-hidden="true"
              >
                <i />
              </div>
              <div
                className="qr-frame"
                aria-label="Non-decodable sample QR placeholder"
              >
                <div className="qr-placeholder">
                  <b>QR</b>
                  <small>PLACEHOLDER</small>
                </div>
                <i className="qr-corner q1" />
                <i className="qr-corner q2" />
                <i className="qr-corner q3" />
                <i className="qr-corner q4" />
              </div>
            </div>
            <p className="qr-caption">
              Scan with your phone, or enter the code at{' '}
              <strong>droplink.local</strong>.
            </p>
            <p className="sample-note">
              Sample code and QR do not create a transfer.
            </p>
          </div>
          <div className="expiry-ruler">
            <div className="ruler-bar">
              {Array.from({ length: 31 }, (_, i) => (
                <i
                  key={i}
                  className={
                    i <= Math.ceil(seconds / 60)
                      ? seconds < 300
                        ? 'signal'
                        : 'remaining'
                      : ''
                  }
                />
              ))}
            </div>
            <div className="ruler-labels">
              <span>0</span>
              <span>10</span>
              <span>20</span>
              <span>30 MIN</span>
            </div>
            <div className="ruler-time">
              <strong>
                {String(Math.floor(seconds / 60)).padStart(2, '0')}:
                {String(seconds % 60).padStart(2, '0')}
              </strong>
              <span>CLOSES AT 14:32</span>
            </div>
          </div>
        </div>
      )}
      {dialog && (
        <div className="modal-backdrop">
          <section
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="delete-title"
            className="delete-dialog"
          >
            <i className="corner tl" />
            <i className="corner tr" />
            <i className="corner bl" />
            <i className="corner br" />
            <p className="eyebrow">SAMPLE · NOT LIVE</p>
            <h2 id="delete-title">Delete this transfer?</h2>
            <p>
              This sample link will stop working in the preview. No files are
              removed by this prototype.
            </p>
            <div>
              <button
                className="outline-button"
                autoFocus
                onClick={() => setDialog(false)}
              >
                KEEP
              </button>
              <button
                className="danger-button"
                onClick={() => {
                  setDialog(false);
                  location.hash = 'deleted';
                  window.dispatchEvent(new Event('prototype-deleted'));
                }}
              >
                DELETE FILES
              </button>
            </div>
            <small>Deletion is a sample state in this prototype.</small>
          </section>
        </div>
      )}
    </section>
  );
}

const sampleFiles = [
  'sample-01.pdf',
  'sample-02.jpg',
  'sample-03.zip',
  'sample-04.txt',
].map((name, i) => ({ name, size: (i + 1) * 352 * 1024 }));
function Receiver({
  directCode,
  motionEnabled,
  onToggleMotion,
}: {
  directCode?: string;
  motionEnabled: boolean;
  onToggleMotion: () => void;
}) {
  const [code, setCode] = useState(directCode || '');
  const [screen, setScreen] = useState(
    directCode === 'SAMPLE'
      ? 'list'
      : directCode && CODE_RE.test(directCode)
        ? 'not-found'
        : 'entry',
  );
  const [message, setMessage] = useState(
    directCode && directCode !== 'SAMPLE'
      ? 'No active transfer for this code.'
      : '',
  );
  const [inputFocused, setInputFocused] = useState(true);
  const input = useRef<HTMLInputElement>(null);
  useEffect(() => {
    document.title = '[Prototype] DropLink — Receive';
  }, []);
  const valid = CODE_RE.test(code);
  function submit(value = code) {
    const normalized = value.toUpperCase();
    setCode(normalized);
    if (!CODE_RE.test(normalized)) {
      setMessage('Enter a valid six-character code.');
      return;
    }
    if (normalized === 'SAMPLE') {
      setScreen('list');
      setMessage('SAMPLE · NOT LIVE');
    } else {
      setScreen('not-found');
      setMessage('No active transfer for this code.');
    }
  }
  function rail(value: string) {
    setMessage('');
    if (value === 'Entry') {
      setCode('');
      setScreen('entry');
    } else if (value === 'SAMPLE list') {
      setCode('SAMPLE');
      setScreen('list');
      setMessage('SAMPLE · NOT LIVE');
    } else if (value === 'Expired') setScreen('expired');
    else {
      setCode('ABCDEF');
      setScreen('not-found');
      setMessage('No active transfer for this code.');
    }
  }
  const doSampleAction = () => setMessage('Not connected in this prototype.');
  return (
    <div className={`receiver-shell ${motionEnabled ? '' : 'motion-disabled'}`}>
      <div className="receiver-frame">
        <Header dark active="receive" />
        {screen === 'entry' ? (
          <main className="receive-entry">
            <p className="eyebrow">RECEIVE · PHONE → PC</p>
            <h1>Receive files.</h1>
            <p className="receive-copy">
              Enter the six-character code shown on the device that sent the
              files. This prototype checks the code locally only.
            </p>
            <label className="code-label" htmlFor="transfer-code">
              SIX-CHARACTER TRANSFER CODE
            </label>
            <div className="entry-cells" onClick={() => input.current?.focus()}>
              {Array.from({ length: 6 }, (_, i) => (
                <span
                  key={i}
                  className={
                    inputFocused && i === Math.min(code.length, 5)
                      ? 'focused'
                      : ''
                  }
                >
                  {code[i] || ''}
                </span>
              ))}
              <input
                ref={input}
                id="transfer-code"
                value={code}
                maxLength={6}
                autoFocus
                autoComplete="one-time-code"
                aria-label="Six-character transfer code"
                onFocus={() => setInputFocused(true)}
                onBlur={() => setInputFocused(false)}
                onChange={(e) => {
                  const raw = e.target.value
                    .toUpperCase()
                    .replace(/[^A-Z0-9]/g, '');
                  const lookalike = raw.match(/[OI01]/);
                  const value = raw.replace(/[OI01]/g, '').slice(0, 6);
                  setCode(value);
                  setMessage(
                    lookalike ? `${lookalike[0]} isn't used in codes.` : '',
                  );
                  if (value.length === 6) submit(value);
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') submit();
                }}
              />
            </div>
            <button
              className="primary-button check-button"
              disabled={!valid}
              onClick={() => submit()}
            >
              CHECK CODE
            </button>
            <p className="receive-message" role="status">
              {message ||
                'Codes use letters and numbers, except O, 0, I and 1.'}
            </p>
            <p className="prototype-tag">PROTOTYPE · NO LOOKUP REQUESTS</p>
          </main>
        ) : screen === 'list' ? (
          <main className="receive-list">
            <div className="receive-sticky">
              <div>
                <strong>SAMPLE</strong>
                <time>29:41</time>
              </div>
              <div className="receive-ruler">
                {Array.from({ length: 30 }, (_, i) => (
                  <i key={i} />
                ))}
              </div>
            </div>
            <div className="list-legend">
              {sampleFiles.length} FILES ·{' '}
              {formatSize(sampleFiles.reduce((n, f) => n + f.size, 0))}{' '}
              <span className="sample-tab">SAMPLE · NOT LIVE</span>
            </div>
            <ul>
              {sampleFiles.map((file, i) => (
                <li key={file.name}>
                  <span className="row-index">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="receive-file">
                    <strong>{file.name}</strong>
                    <small>{formatSize(file.size)}</small>
                  </span>
                  <button
                    className="download-button"
                    aria-label={`Download ${file.name}`}
                    onClick={doSampleAction}
                  >
                    ↓
                  </button>
                </li>
              ))}
            </ul>
            <p className="multi-download">
              SAMPLE PREVIEW · Downloads are not connected in this prototype.
            </p>
            {message && (
              <p className="receive-message" role="status">
                {message}
              </p>
            )}
            <div className="save-bar">
              <button onClick={doSampleAction}>
                {sampleFiles.length === 1 ? 'SAVE FILE' : 'SAVE ALL'}
              </button>
            </div>
          </main>
        ) : (
          <main className="receive-terminal">
            <p className="eyebrow">PROTOTYPE · SAMPLE DATA</p>
            <h1>
              {screen === 'expired'
                ? 'This link has closed.'
                : 'No transfer found.'}
            </h1>
            <p role="status">
              {screen === 'expired'
                ? 'Access expires 30 minutes after a transfer becomes ready.'
                : `No active transfer for ${code || 'this code'}. This is a simulated result; no lookup request was sent.`}
            </p>
            <p className="prototype-tag">
              {screen === 'expired'
                ? 'PROTOTYPE · SAMPLE STATE'
                : 'PROTOTYPE · SIMULATED NOT FOUND'}
            </p>
            <button
              className="outline-button"
              onClick={() => {
                setScreen('entry');
                setCode('');
              }}
            >
              ENTER ANOTHER CODE
            </button>
          </main>
        )}
        <PrototypeFooter
          motionEnabled={motionEnabled}
          onToggleMotion={onToggleMotion}
        />
      </div>
      <Rail receiver onSelect={rail} />
    </div>
  );
}

export default App;
