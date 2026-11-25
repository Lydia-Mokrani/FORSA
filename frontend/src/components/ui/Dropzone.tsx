import React, { useRef, useState, useId } from 'react';
import { cn } from './cn';
import { Icon } from './Icon';

export interface DropzoneProps {
  accept?: string;
  maxBytes?: number;
  onFile?: (file: File | null) => void;
  error?: string;
  value?: File | null;
  label?: string;
  helperText?: string;
  disabled?: boolean;
  className?: string;
  id?: string;
}

const DEFAULT_ACCEPT = '.pdf,.jpg,.jpeg,.png,application/pdf,image/jpeg,image/png';
const DEFAULT_MAX_BYTES = 5 * 1024 * 1024; // 5 Mo

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} Ko`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} Mo`;
}

function isFileTypeAccepted(file: File, acceptString: string): boolean {
  if (!acceptString || acceptString === '*') return true;
  const tokens = acceptString
    .split(',')
    .map((t) => t.trim().toLowerCase())
    .filter(Boolean);

  const fileType = file.type.toLowerCase();
  const fileName = file.name.toLowerCase();

  return tokens.some((token) => {
    if (token.startsWith('.')) {
      return fileName.endsWith(token);
    }
    if (token.endsWith('/*')) {
      const mainType = token.slice(0, -2);
      return fileType.startsWith(mainType);
    }
    return fileType === token;
  });
}

/**
 * Dropzone composant conforme Figma Lot R0b (Dépôt de documents commerçant).
 * - Zone à tirets (dashed), drag-and-drop + sélection par clic
 * - Pré-vérification côté client du type (PDF/JPG/PNG par défaut) et de la taille (5 Mo max)
 * - États : default, dragover, selected, error
 * - Bouton de suppression du fichier sélectionné
 */
export const Dropzone: React.FC<DropzoneProps> = ({
  accept = DEFAULT_ACCEPT,
  maxBytes = DEFAULT_MAX_BYTES,
  onFile,
  error,
  value,
  label,
  helperText,
  disabled = false,
  className,
  id,
}) => {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const inputRef = useRef<HTMLInputElement>(null);

  const [isDragOver, setIsDragOver] = useState(false);
  const [internalFile, setInternalFile] = useState<File | null>(null);
  const [clientError, setClientError] = useState<string | null>(null);

  const currentFile = value !== undefined ? value : internalFile;
  const effectiveError = error || clientError;

  const validateAndSelectFile = (file: File) => {
    // 1. Vérification du type
    if (!isFileTypeAccepted(file, accept)) {
      const err = 'Format de fichier non accepté. Formats autorisés : PDF, JPG, PNG.';
      setClientError(err);
      if (value === undefined) setInternalFile(null);
      onFile?.(null);
      return;
    }

    // 2. Vérification de la taille (5 Mo max par défaut)
    if (file.size > maxBytes) {
      const maxMb = (maxBytes / (1024 * 1024)).toFixed(0);
      const err = `Taille maximale dépassée. Le fichier ne doit pas dépasser ${maxMb} Mo.`;
      setClientError(err);
      if (value === undefined) setInternalFile(null);
      onFile?.(null);
      return;
    }

    // Fichier valide
    setClientError(null);
    if (value === undefined) setInternalFile(file);
    onFile?.(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (disabled) return;
    setIsDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      validateAndSelectFile(files[0]);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      validateAndSelectFile(files[0]);
    }
    // Réinitialiser la valeur de l'input pour permettre de re-sélectionner le même fichier si besoin
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleRemove = (e: React.MouseEvent) => {
    e.stopPropagation();
    setClientError(null);
    if (value === undefined) setInternalFile(null);
    onFile?.(null);
    if (inputRef.current) {
      inputRef.current.value = '';
    }
  };

  const handleAreaClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      inputRef.current?.click();
    }
  };

  return (
    <div className={cn('w-full font-poppins flex flex-col gap-1.5', className)}>
      {label && (
        <label
          htmlFor={inputId}
          className="text-[14px] font-medium text-ui-ink select-none"
        >
          {label}
        </label>
      )}

      {/* Zone Dropzone */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        aria-label={label ?? 'Zone de téléversement de fichier'}
        aria-invalid={Boolean(effectiveError)}
        aria-disabled={disabled}
        onClick={handleAreaClick}
        onKeyDown={handleKeyDown}
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        className={cn(
          'relative w-full rounded-ui-card transition-all cursor-pointer outline-none',
          'p-[22px] md:p-[26px] flex flex-col items-center justify-center text-center',
          // État disabled
          disabled && 'opacity-50 cursor-not-allowed bg-stone-50 border-stone-200 border-2 border-dashed',
          // État sélectionné
          !disabled && currentFile && 'bg-ui-mint/30 border-2 border-solid border-ui-card-border',
          // État erreur
          !disabled && effectiveError && 'border-2 border-dashed border-ui-error bg-ui-error-bg/30',
          // État dragover
          !disabled && isDragOver && 'border-2 border-dashed border-ui-emerald bg-ui-mint/60 scale-[1.005]',
          // État défaut
          !disabled && !currentFile && !effectiveError && !isDragOver && (
            'border-2 border-dashed border-ui-field-border bg-white hover:border-ui-emerald hover:bg-ui-mint/20'
          )
        )}
      >
        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept={accept}
          disabled={disabled}
          onChange={handleInputChange}
          className="sr-only"
        />

        {currentFile ? (
          // État : Fichier sélectionné
          <div className="flex items-center justify-between w-full max-w-md gap-3 bg-white p-3 rounded-ui-ctl border border-ui-card-border shadow-xs">
            <div className="flex items-center gap-3 min-w-0">
              <div className="size-10 rounded-full bg-ui-mint flex items-center justify-center shrink-0 text-ui-emerald">
                <Icon name="file" size={20} />
              </div>
              <div className="flex flex-col text-left min-w-0">
                <span className="text-[14px] font-medium text-ui-ink truncate">
                  {currentFile.name}
                </span>
                <span className="text-[12px] text-ui-text-70">
                  {formatFileSize(currentFile.size)}
                </span>
              </div>
            </div>

            <button
              type="button"
              onClick={handleRemove}
              aria-label="Supprimer le fichier"
              className="size-8 rounded-full flex items-center justify-center text-ui-ink/50 hover:text-ui-error hover:bg-ui-error-bg transition-colors shrink-0"
            >
              <svg
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M12 4L4 12M4 4L12 12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </button>
          </div>
        ) : (
          // État : En attente de fichier
          <div className="flex flex-col items-center gap-2">
            <div className="size-12 rounded-full bg-ui-mint border border-ui-card-border flex items-center justify-center text-ui-emerald mb-1">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
                aria-hidden="true"
              >
                <path
                  d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            <p className="text-[14px] font-medium text-ui-ink">
              Glissez-déposez votre document ici, ou{' '}
              <span className="text-ui-emerald underline decoration-ui-emerald/40 underline-offset-2">
                parcourez
              </span>
            </p>

            <p className="text-[12px] text-ui-text-70">
              Formats acceptés : PDF, JPG, PNG (max. 5 Mo)
            </p>
          </div>
        )}
      </div>

      {/* Message d'erreur ou helper text */}
      {effectiveError ? (
        <div
          role="alert"
          className="flex items-center gap-1.5 text-[13px] text-ui-error mt-0.5"
        >
          <Icon name="alertc" size={15} className="shrink-0" />
          <span>{effectiveError}</span>
        </div>
      ) : helperText ? (
        <p className="text-[12px] text-ui-text-70 mt-0.5">{helperText}</p>
      ) : null}
    </div>
  );
};
