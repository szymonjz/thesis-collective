import { useEffect, useRef, type ReactNode } from 'react';
import { X, Link2, ArrowUpRight } from 'lucide-react';
import { COLOR, type Member } from './types';
import { safeUrl } from './data';
export function Avatar({
  member,
  small = false,
}: {
  member: Member;
  small?: boolean;
}) {
  const style = { '--avatar': COLOR[member] } as React.CSSProperties;
  return (
    <span
      aria-hidden="true"
      className={`avatar ${small ? 'small' : ''}`}
      style={style}
    >
      {member === 'Bolivar' ? 'B' : member.slice(0, 1)}
    </span>
  );
}
export function Modal({
  title,
  children,
  close,
  wide = false,
}: {
  title: string;
  children: ReactNode;
  close: () => void;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const dialog = ref.current!;
    dialog.showModal();
    return () => {
      dialog.close();
    };
  }, []);
  return (
    <dialog
      className={`modal ${wide ? 'wide' : ''}`}
      ref={ref}
      aria-label={title}
      onCancel={close}
      onClick={(e) => {
        if (e.target === ref.current) {
          const rect = ref.current.getBoundingClientRect();
          if (
            e.clientX < rect.left ||
            e.clientX > rect.right ||
            e.clientY < rect.top ||
            e.clientY > rect.bottom
          )
            close();
        }
      }}
    >
      <div className="modal-head">
        <h2>{title}</h2>
        <button
          className="icon-btn"
          aria-label="Dialog schließen"
          onClick={close}
        >
          <X size={20} />
        </button>
      </div>
      {children}
    </dialog>
  );
}
export function ErrorLine({ message }: { message: string }) {
  return message ? (
    <p role="alert" className="form-error">
      {message}
    </p>
  ) : null;
}
export function SourceLink({ url }: { url: string }) {
  let valid = '';
  try {
    valid = safeUrl(url);
  } catch {
    return null;
  }
  return valid ? (
    <a
      className="source-link"
      href={valid}
      target="_blank"
      rel="noopener noreferrer"
    >
      <Link2 size={14} />
      {new URL(valid).hostname}
      <ArrowUpRight size={14} />
    </a>
  ) : null;
}
