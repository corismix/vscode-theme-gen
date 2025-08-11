/**
 * Main App component for VS Code Theme Generator
 * Modern React CLI application with TypeScript architecture
 */

import React from 'react';
import { Box } from 'ink';
import { AppContextProvider, useAppContext } from '../context/AppContext';
import { NotificationProvider } from '../context/NotificationContext';
import { NotificationDisplay } from './NotificationDisplay';

// Import step components
import Welcome from './Welcome';
import FileSelector from './FileSelector';
import ThemeConfigurator from './ThemeConfigurator';
import ExtensionOptions from './ExtensionOptions';
import ProgressIndicator from './ProgressIndicator';
import SuccessScreen from './SuccessScreen';

// ============================================================================
// App Content Component (uses context)
// ============================================================================

const AppContent: React.FC = () => {
  const { navigation } = useAppContext();

  const renderCurrentStep = (): React.ReactElement => {
    switch (navigation.currentStep) {
      case 'welcome':
        return <Welcome />;
      case 'file-selection':
        return <FileSelector />;
      case 'theme-config':
        return <ThemeConfigurator />;
      case 'extension-options':
        return <ExtensionOptions />;
      case 'progress':
        return <ProgressIndicator />;
      case 'success':
        return <SuccessScreen />;
      default:
        return <Welcome />;
    }
  };

  return (
    <Box flexDirection="column" width="100%" minHeight={25}>
      <Box flexGrow={1}>
        {renderCurrentStep()}
      </Box>
      
      {/* Global notification display */}
      <NotificationDisplay />
    </Box>
  );
};

// ============================================================================
// Main App Component (provides all contexts)
// ============================================================================

export const App: React.FC = () => {
  return (
    <NotificationProvider>
      <AppContextProvider>
        <AppContent />
      </AppContextProvider>
    </NotificationProvider>
  );
};

export default App;