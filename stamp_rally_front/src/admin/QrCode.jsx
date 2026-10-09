import { QR_DARK, qrModules } from './qr.js';

// QR コード(SVG)。マス目の作り方は qr.js
export default function QrCode({ text, label }) {
  const { size, path } = qrModules(text);
  return (
    <svg className="ad-qr" viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label} shapeRendering="crispEdges">
      <rect width={size} height={size} fill="#fff" />
      <path d={path} fill={QR_DARK} />
    </svg>
  );
}
