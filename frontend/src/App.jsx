import React from 'react';
import { SocketProvider } from './context/SocketContext';
import ModuleA_IoT from './ModuleA_IoT';

export default function App() {
  return (
    <SocketProvider>
      <ModuleA_IoT />
    </SocketProvider>
  );
}
