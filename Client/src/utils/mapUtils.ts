import L from 'leaflet';
import { IssueSeverity } from '@/types';
import { getSeverityColorHex } from './formatters';

export function createSeverityIcon(severity: IssueSeverity, isSelected: boolean = false): L.DivIcon {
  const color = getSeverityColorHex(severity);
  const size = isSelected ? 32 : 24;
  const border = isSelected ? '3px solid #ffffff' : '2px solid #ffffff';
  const shadow = isSelected ? '0 0 0 3px rgba(0,0,0,0.3), 0 4px 10px rgba(0,0,0,0.4)' : '0 2px 6px rgba(0,0,0,0.35)';

  const html = `
    <div style="
      background-color: ${color};
      width: ${size}px;
      height: ${size}px;
      border-radius: 50%;
      border: ${border};
      box-shadow: ${shadow};
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease-in-out;
      transform: translate(-50%, -50%);
    ">
      <div style="width: ${isSelected ? 8 : 6}px; height: ${isSelected ? 8 : 6}px; background: white; border-radius: 50%;"></div>
    </div>
  `;

  return L.divIcon({
    html,
    className: 'custom-leaflet-marker',
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    popupAnchor: [0, -size / 2],
  });
}
