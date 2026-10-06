import { useEffect, useRef, useState } from 'react';
import { Paperclip, FileText, Image as ImageIcon, File as FileIcon, X, Download, Eye } from 'lucide-react';
import Modal from '../ui/Modal';
import Button from '../ui/Button';
import { ACCEPT, MAX_FILES, fileKind, fmtSize, getFileBlob, validateFile } from '../../lib/files';

const KindIcon = ({ name, size = 16 }) => {
  const k = fileKind(name);
  return k === 'image' ? <ImageIcon size={size} /> : k === 'pdf' ? <FileText size={size} /> : <FileIcon size={size} />;
};

// Picker for pending files. `value` is File[]; validation errors are reported through `onError`.
export function FileAttach({ value, onChange, onError, compact }) {
  const ref = useRef(null);
  const [drag, setDrag] = useState(false);
  const add = (list) => {
    const next = [...value];
    for (const f of [...list]) {
      const err = validateFile(f);
      if (err) { onError?.(err); continue; }
      if (next.length >= MAX_FILES) { onError?.(`You can attach up to ${MAX_FILES} files.`); break; }
      if (next.some((x) => x.name === f.name && x.size === f.size)) continue;
      next.push(f);
    }
    onChange(next);
  };
  return (
    <div className="attach">
      {compact ? (
        <button type="button" className="icon-btn" aria-label="Attach files" title="Attach files (JPG, PNG, PDF, DOC · max 5 MB)" onClick={() => ref.current.click()}><Paperclip size={18} /></button>
      ) : (
        <div className={`attach-drop ${drag ? 'drag' : ''}`} role="button" tabIndex={0} onClick={() => ref.current.click()} onKeyDown={(e) => e.key === 'Enter' && ref.current.click()}
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }} onDragLeave={() => setDrag(false)} onDrop={(e) => { e.preventDefault(); setDrag(false); add(e.dataTransfer.files); }}>
          <Paperclip size={18} />
          <span><b>Attach files</b> or drag them here<em>JPG, PNG, PDF, DOC · max 5 MB each · up to {MAX_FILES} files</em></span>
        </div>
      )}
      <input ref={ref} type="file" hidden multiple accept={ACCEPT} onChange={(e) => { add(e.target.files); e.target.value = ''; }} />
      {value.length > 0 && (
        <ul className="attach-list">
          {value.map((f, i) => (
            <li key={`${f.name}${i}`}><KindIcon name={f.name} /><span>{f.name}</span><em>{fmtSize(f.size)}</em>
              <button type="button" className="icon-btn sm" aria-label={`Remove ${f.name}`} onClick={() => onChange(value.filter((_, k) => k !== i))}><X size={14} /></button></li>
          ))}
        </ul>
      )}
    </div>
  );
}

const saveBlob = (blob, name) => {
  const url = URL.createObjectURL(blob);
  Object.assign(document.createElement('a'), { href: url, download: name }).click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
};

// Saved attachment. Click the name = preview in the app (images, PDFs); the arrow always downloads.
export function AttachmentChip({ file }) {
  const kind = fileKind(file.name);
  const [preview, setPreview] = useState(null); // object URL while previewing
  const [missing, setMissing] = useState(false);
  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);

  const load = async () => { const blob = await getFileBlob(file.id); if (!blob) setMissing(true); return blob; };
  const open = async () => {
    const blob = await load(); if (!blob) return;
    if (kind === 'doc') return saveBlob(blob, file.name);        // Word files cannot be previewed in a browser
    setPreview(URL.createObjectURL(blob));
  };
  const download = async (e) => { e.stopPropagation(); const blob = await load(); if (blob) saveBlob(blob, file.name); };

  return (
    <>
      <span className={`att-chip ${missing ? 'missing' : ''}`}>
        <button type="button" className="att-main" onClick={open} disabled={missing} title={missing ? 'File no longer available' : kind === 'doc' ? 'Download' : 'Preview'}>
          <KindIcon name={file.name} /><span>{file.name}</span><em>{fmtSize(file.size)}</em>{kind !== 'doc' && <Eye size={13} />}
        </button>
        <button type="button" className="att-dl" onClick={download} disabled={missing} aria-label={`Download ${file.name}`} title="Download"><Download size={14} /></button>
      </span>
      <Modal open={!!preview} onClose={() => setPreview(null)} size="lg" title={file.name} subtitle={fmtSize(file.size)}
        footer={<><Button variant="ghost" onClick={() => setPreview(null)}>Close</Button><Button icon={Download} onClick={async () => { const blob = await getFileBlob(file.id); if (blob) saveBlob(blob, file.name); }}>Download</Button></>}>
        {preview && (kind === 'image' ? <img className="zoom-img" src={preview} alt={file.name} /> : <iframe className="pdf-frame" src={preview} title={file.name} />)}
      </Modal>
    </>
  );
}
