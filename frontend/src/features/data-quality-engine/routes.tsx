import type { RouteObject } from 'react-router-dom';
import DataQualityEnginePage from './components/DataQualityEnginePage';

export const dataQualityEngineRoutes: RouteObject[] = [
  { path: 'data-quality', element: <DataQualityEnginePage /> },
];
