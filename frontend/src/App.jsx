import React from 'react';
import { SocketProvider } from './context/SocketContext';
import ModuleA_IoT from './ModuleA_Minimal';

export default function App() {
  return (
    <SocketProvider>
      <ModuleA_IoT />
    </SocketProvider>
  );
}
