
import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';
import { DebugErrorBoundary } from './src/components/DebugErrorBoundary';

console.log("App Initialization Started");

const rootElement = document.getElementById('root');
if (!rootElement) {
  throw new Error("Could not find root element to mount to");
}

try {
  const root = ReactDOM.createRoot(rootElement);
  root.render(
    <React.StrictMode>
      <DebugErrorBoundary>
        <App />
      </DebugErrorBoundary>
    </React.StrictMode>
  );
  console.log("App Render Triggered");
} catch (error) {
  console.error("Critical Render Error:", error);
  rootElement.innerHTML = `<div style="color:red; padding:20px;">Failed to start app: ${String(error)}</div>`;
}
