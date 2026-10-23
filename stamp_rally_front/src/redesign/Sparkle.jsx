export function Glitter() {
  return (
    <span className="rd-sp-glitter" aria-hidden="true">
      <i /><i /><i /><i /><i />
    </span>
  );
}
const SKY = [
  [7, 9, 13, 3.4, 0], [26, 22, 8, 2.6, 1.2], [44, 6, 11, 3.8, 2.1], [63, 17, 9, 2.9, .6], [86, 8, 14, 3.1, 1.7],
  [14, 41, 9, 3.6, 2.6], [78, 36, 12, 2.7, .3], [52, 49, 7, 3.3, 1.5], [31, 63, 10, 2.8, 2.3], [91, 58, 8, 3.5, .9],
  [9, 79, 12, 3.0, 1.9], [69, 74, 10, 3.7, .4], [46, 90, 8, 2.5, 2.8],
];
export function SpecialSky() {
  return (
    <div className="rd-sp-sky" aria-hidden="true">
      {SKY.map(([x, y, s, d, dl]) => (
        <i key={`${x}-${y}`} style={{ left: `${x}%`, top: `${y}%`, '--s': `${s}px`, '--d': `${d}s`, '--dl': `-${dl}s` }} />
      ))}
    </div>
  );
}
