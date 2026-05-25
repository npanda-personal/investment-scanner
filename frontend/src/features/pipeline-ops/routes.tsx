import type { RouteObject } from 'react-router-dom';
import PipelineOpsPage from './components/PipelineOpsPage';

export const pipelineOpsRoutes: RouteObject[] = [
  { path: 'pipeline-ops', element: <PipelineOpsPage /> },
];
