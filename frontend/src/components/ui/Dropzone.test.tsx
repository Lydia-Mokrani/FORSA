import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { Dropzone } from './Dropzone';

describe('Dropzone component', () => {
  afterEach(() => {
    cleanup();
  });

  it('refuses file with invalid type (not in accept list)', () => {
    const handleFile = vi.fn();
    const { container } = render(
      <Dropzone
        accept=".pdf,.jpg,.png"
        maxBytes={5 * 1024 * 1024}
        onFile={handleFile}
      />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;
    expect(input).not.toBeNull();

    const invalidFile = new File(['fake binary content'], 'virus.exe', {
      type: 'application/x-msdownload',
    });

    fireEvent.change(input, { target: { files: [invalidFile] } });

    expect(handleFile).toHaveBeenCalledWith(null);
    expect(
      screen.getByText(/Format de fichier non accepté/i)
    ).not.toBeNull();
  });

  it('refuses file exceeding maxBytes limit (5 MB client pre-check)', () => {
    const handleFile = vi.fn();
    const { container } = render(
      <Dropzone
        accept=".pdf,.jpg,.png"
        maxBytes={5 * 1024 * 1024}
        onFile={handleFile}
      />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    // Fichier de 6 Mo (> 5 Mo)
    const largeFile = new File(['x'.repeat(6 * 1024 * 1024)], 'document-lourd.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(input, { target: { files: [largeFile] } });

    expect(handleFile).toHaveBeenCalledWith(null);
    expect(
      screen.getByText(/Taille maximale dépassée/i)
    ).not.toBeNull();
  });

  it('accepts valid file matching allowed type and size', () => {
    const handleFile = vi.fn();
    const { container } = render(
      <Dropzone
        accept=".pdf,.jpg,.png"
        maxBytes={5 * 1024 * 1024}
        onFile={handleFile}
      />
    );

    const input = container.querySelector('input[type="file"]') as HTMLInputElement;

    const validFile = new File(['valid document'], 'registre.pdf', {
      type: 'application/pdf',
    });

    fireEvent.change(input, { target: { files: [validFile] } });

    expect(handleFile).toHaveBeenCalledWith(validFile);
    expect(screen.getByText('registre.pdf')).not.toBeNull();
    expect(screen.queryByText(/Format de fichier non accepté/i)).toBeNull();
    expect(screen.queryByText(/Taille maximale dépassée/i)).toBeNull();
  });
});
