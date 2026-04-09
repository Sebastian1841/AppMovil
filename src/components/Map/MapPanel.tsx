import React from 'react';
import { Platform } from 'react-native';

import type { MapPanelProps } from './types';

const MapPanelComponent =
  Platform.OS === 'web'
    ? require('./MapPanel.web').default
    : require('./MapPanel.native').default;

export default function MapPanel(props: MapPanelProps) {
  return <MapPanelComponent {...props} />;
}
