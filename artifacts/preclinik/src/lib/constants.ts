import { HeartPulse, Brain, Dna, Activity } from 'lucide-react';
import React from 'react';

export const ICON_MAP: Record<string, React.ElementType> = {
  heart: HeartPulse,
  brain: Brain,
  dna: Dna,
  lungs: Activity,
};
