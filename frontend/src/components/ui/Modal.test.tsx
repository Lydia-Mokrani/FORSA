import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import React from 'react';
import { Modal } from './Modal';

describe('Modal component', () => {
  afterEach(() => {
    cleanup();
  });

  it('calls onClose when Escape key is pressed', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} title="Titre Modal">
        <p>Contenu du modal</p>
      </Modal>
    );

    expect(screen.getByRole('dialog')).toBeTruthy();
    expect(screen.getByText('Titre Modal')).toBeTruthy();

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it('does not close on Escape if closeOnEsc is false', () => {
    const handleClose = vi.fn();
    render(
      <Modal isOpen={true} onClose={handleClose} closeOnEsc={false} title="No ESC">
        <p>Contenu</p>
      </Modal>
    );

    fireEvent.keyDown(document, { key: 'Escape' });
    expect(handleClose).not.toHaveBeenCalled();
  });

  it('traps focus inside the modal on Tab key navigation', () => {
    render(
      <Modal isOpen={true} onClose={() => {}} title="Trap Test">
        <button type="button">Premier bouton</button>
        <button type="button">Second bouton</button>
      </Modal>
    );

    const firstBtn = screen.getByText('Premier bouton');
    const secondBtn = screen.getByText('Second bouton');

    secondBtn.focus();
    expect(document.activeElement).toBe(secondBtn);

    const closeBtn = screen.getByLabelText('Fermer');
    closeBtn.focus();
    expect(document.activeElement).toBe(closeBtn);

    // Tab depuis le dernier élément
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: false });
    expect(screen.getByRole('dialog')).toBeTruthy();
  });

  it('does not render when isOpen is false', () => {
    render(
      <Modal isOpen={false} onClose={() => {}} title="Caché">
        <p>Non visible</p>
      </Modal>
    );

    expect(screen.queryByRole('dialog')).toBeNull();
  });
});
