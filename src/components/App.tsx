/**
 * Simplified App component for VS Code Theme Generator
 * Uses direct component rendering without complex Context API
 */

import React from 'react';
import ThemeGenerator from './ThemeGenerator';
import { FormData } from '../types';

interface AppProps {
  initialData?: Partial<FormData> | undefined;
}

export const App: React.FC<AppProps> = ({ initialData }) => {
  return <ThemeGenerator initialData={initialData ?? undefined} />;
};

export default App;
