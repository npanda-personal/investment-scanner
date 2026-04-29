import type { RouteObject } from 'react-router-dom';
import SignalCalibrationEnginePage from './components/SignalCalibrationEnginePage';

export const signalCalibrationEngineRoutes: RouteObject[] = [
  { path: 'signals/calibration', element: <SignalCalibrationEnginePage /> },
];
