import { useEffect, useId, useRef, useState } from 'react';
import type { ApiClient } from '../contract';
import { checkFile, type FileCheck } from './checkFile';
import { brandingMessages as text } from './messages';
import { useTenantImage, type ImagePlace } from './useTenantImage';

interface SlotProps {
  apiClient: ApiClient;
  place: ImagePlace;
  // What the person sees as the name of the place and in the alternative text of its picture ("Logo", "Imagen 1").
  label: string;
  // The saved file as the container passes it (a relative path), or null when there is none. An untouched place follows it; after a
  // save or a removal the place shows what was sent.
  savedUrl: string | null;
  // Called after the service took a save or a removal, so the screen may tell the container. An answer that comes after the place went
  // away is not reported: the request is aborted with the place.
  onChange?: () => void;
}

const LOCAL_TEXT: Record<Exclude<FileCheck, 'ok'>, string> = {
  kind: text.wrongKind,
  size: text.tooBigHere,
  empty: text.emptyFile,
};

// One place of the screen: the logo or one of the five images (portal spec 019, D-05 and D-06). It chooses a file, shows its preview and sends nothing
// until "Guardar"; removing asks once. A refused file never replaces the saved one, and the other places are never touched.
export function ImageSlot({ apiClient, place, label, savedUrl: initial, onChange }: SlotProps) {
  const id = useId();
  const isLogo = place.slot === 'logo';
  const [saved, setSaved] = useState<string | null>(initial);
  const [chosen, setChosen] = useState<{ file: File; url: string } | null>(null);
  const [localError, setLocalError] = useState<Exclude<FileCheck, 'ok'> | null>(null);
  const [confirming, setConfirming] = useState(false);
  const { sending, failure, saved: done, save, remove, reset } = useTenantImage(apiClient, place);
  const lastAction = useRef<'save' | 'remove'>('save');
  // Once the person saved or removed here, the place shows what was sent and no longer follows the container's address.
  const touched = useRef(false);
  const titleId = `${id}-title`;
  const messages = useRef<HTMLDivElement>(null);
  const question = useRef<HTMLDivElement>(null);
  const fileInput = useRef<HTMLInputElement>(null);
  // The container may pass the saved file after the place appears (it reads the profile first): an untouched place follows it.
  useEffect(() => {
    if (!touched.current) setSaved(initial);
  }, [initial]);
  // Every local address made for a preview, released when the file changes or the place goes away.
  const urls = useRef<Set<string>>(new Set());
  const forget = (url: string) => {
    if (urls.current.delete(url)) URL.revokeObjectURL(url);
  };
  useEffect(
    () => () => {
      urls.current.forEach((url) => URL.revokeObjectURL(url));
      urls.current.clear();
    },
    [],
  );

  function choose(file: File | undefined) {
    reset();
    setConfirming(false);
    if (chosen) forget(chosen.url);
    setChosen(null);
    setLocalError(null);
    if (!file) return;
    const check = checkFile(file, place.slot);
    if (check !== 'ok') {
      setLocalError(check);
      return;
    }
    const url = URL.createObjectURL(file);
    urls.current.add(url);
    setChosen({ file, url });
  }

  async function saveChosen() {
    if (!chosen) return;
    lastAction.current = 'save';
    if (await save(chosen.file)) {
      // the file that was saved is the one the person sees: its local address stays until it is replaced
      if (saved && saved !== chosen.url) forget(saved);
      touched.current = true;
      setSaved(chosen.url);
      setChosen(null);
      // the same file may be chosen again
      if (fileInput.current) fileInput.current.value = '';
      onChange?.();
    }
  }

  async function removeSaved() {
    lastAction.current = 'remove';
    setConfirming(false);
    messages.current?.focus();
    if (await remove()) {
      touched.current = true;
      if (saved) forget(saved);
      setSaved(null);
      onChange?.();
    }
  }

  const retry = () => void (lastAction.current === 'remove' ? removeSaved() : saveChosen());
  const names = isLogo
    ? { choose: text.chooseLogo, save: text.saveLogo, remove: text.removeLogo, none: text.noLogo }
    : { choose: text.chooseImage, save: text.saveImage, remove: text.removeImage, none: text.noImage };
  const messageId = `${id}-message`;

  return (
    <div className="branding-slot operator-panel" role="group" aria-labelledby={titleId}>
      <h2 id={titleId} className="branding-slot-title">{label}</h2>
      {saved ? <img className="branding-picture" src={saved} alt={label} /> : <p className="branding-none">{names.none}</p>}
      <div className="auth-field">
        <label htmlFor={`${id}-file`}>{names.choose}</label>
        <input
          id={`${id}-file`}
          ref={fileInput}
          type="file"
          accept="image/png,image/jpeg,image/webp"
          disabled={sending}
          aria-invalid={localError ? true : undefined}
          aria-describedby={localError || failure || done ? messageId : undefined}
          onChange={(e) => choose(e.target.files?.[0])}
        />
      </div>
      {chosen && <img className="branding-picture branding-preview" src={chosen.url} alt={`Vista previa de ${label}`} />}
      <div id={messageId} aria-live="polite" tabIndex={-1} ref={messages} className="branding-messages">
        {sending && <p>{text.sending}</p>}
        {localError && <p className="auth-field-error">{LOCAL_TEXT[localError]}</p>}
        {failure && <p className="auth-field-error">{failure.line}</p>}
        {done && !sending && <p>{text.saved}</p>}
      </div>
      {confirming ? (
        <div className="branding-actions" role="group" aria-label={names.remove} aria-describedby={`${id}-question`} tabIndex={-1} ref={question}>
          <p id={`${id}-question`} className="branding-note">{text.confirmRemove}</p>
          <button
            type="button"
            className="operator-outline"
            onClick={() => {
              setConfirming(false);
              messages.current?.focus();
            }}
          >
            {text.cancel}
          </button>
          <button type="button" className="operator-primary" onClick={() => void removeSaved()}>
            {text.remove}
          </button>
        </div>
      ) : (
        <div className="branding-actions">
          {failure?.retryable && (
            <button type="button" className="operator-outline" onClick={retry} disabled={sending}>
              {text.retry}
            </button>
          )}
          {saved && (
            <button
              type="button"
              className="operator-outline"
              onClick={() => {
                setConfirming(true);
                // the question replaces the button that had the focus
                setTimeout(() => question.current?.focus(), 0);
              }}
              disabled={sending}
            >
              {names.remove}
            </button>
          )}
          <button type="button" className="operator-primary" onClick={() => void saveChosen()} disabled={sending || !chosen}>
            {names.save}
          </button>
        </div>
      )}
    </div>
  );
}
