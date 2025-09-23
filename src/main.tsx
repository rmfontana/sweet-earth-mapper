import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import 'react-spring-bottom-sheet/dist/style.css'
import { FilterProvider } from './contexts/FilterContext'
import { CropThresholdProvider } from './contexts/CropThresholdContext';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <FilterProvider>
      <CropThresholdProvider> 
        <App />
      </CropThresholdProvider>
    </FilterProvider>
  </StrictMode>,
);