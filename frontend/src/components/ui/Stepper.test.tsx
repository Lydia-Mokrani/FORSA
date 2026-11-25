import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import React from 'react';
import { Stepper } from './Stepper';

describe('Stepper component', () => {
  afterEach(() => {
    cleanup();
  });

  const sampleSteps = [
    { title: 'Compte', description: 'Informations gérant' },
    { title: 'Commerce', description: 'Informations boutique' },
    { title: 'Documents', description: 'Justificatifs légaux' },
  ];

  it('marks current step with aria-current="step"', () => {
    render(<Stepper steps={sampleSteps} current={1} />);

    const stepElements = screen.getAllByRole('listitem');
    expect(stepElements).toHaveLength(3);

    // Étape 0 (done) -> pas d'aria-current
    expect(stepElements[0].getAttribute('aria-current')).toBeNull();

    // Étape 1 (current) -> aria-current="step"
    expect(stepElements[1].getAttribute('aria-current')).toBe('step');

    // Étape 2 (upcoming) -> pas d'aria-current
    expect(stepElements[2].getAttribute('aria-current')).toBeNull();
  });

  it('renders all step titles and descriptions', () => {
    render(<Stepper steps={sampleSteps} current={0} />);

    expect(screen.getByText('Compte')).not.toBeNull();
    expect(screen.getByText('Commerce')).not.toBeNull();
    expect(screen.getByText('Documents')).not.toBeNull();
  });
});
