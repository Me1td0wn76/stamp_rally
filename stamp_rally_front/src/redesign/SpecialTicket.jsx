const pad4 = (n) => String(n).padStart(4, '0');
export const PUMPKIN = 'M8 30 L22 10 L36 10 L38 0 L46 2 L42 10 L58 10 L72 30 L70 58 L52 68 L28 68 L10 58 Z';
export default function SpecialTicket({ no = 1, date = '', stampImage = '', punched = false, punching = false, gold = false, className = '' }) {
  const cls = ['rd-sp-tk', gold && 'is-gold', punching && 'is-punching', className].filter(Boolean).join(' ');
  return (
    <div className={cls} role="group" aria-label={`特別室の入室証${gold ? '（金のチケット）' : ''}`}>
      <div className="rd-sp-tk-main">
        <p className="rd-sp-tk-top">{gold ? '✦ GOLDEN TICKET ✦' : '✦ CODEFLOW · ROOM 402 ✦'}</p>
        <p className="rd-sp-tk-admit">ADMIT ONE</p>
        <p className="rd-sp-tk-name">特別室<span>THE SPECIAL ROOM</span></p>
        <dl className="rd-sp-tk-dl">
          <dt>DATE</dt><dd>{date}</dd>
          <dt>KEY</dt><dd>CodeFlow のスタンプ</dd>
        </dl>
        <p className="rd-sp-tk-no"><small>No.</small>{pad4(no)}</p>
        {stampImage && <img className="rd-sp-tk-stamp" src={`/stamps/${stampImage}`} alt="" />}
      </div>
      <div className="rd-sp-tk-stub" aria-hidden="true">
        <span className="rd-sp-tk-stub-admit">ADMIT ONE</span>
        {/* パンチを入れる場所（穴がないときも場所はあけておく） */}
        <span className="rd-sp-tk-punch">
          {(punched || punching) && <svg className="rd-sp-tk-hole" viewBox="0 0 80 70"><path d={PUMPKIN} /></svg>}
          {/* パンチで抜けた紙くず（パンチを入れたときだけ、落ちていく） */}
          {punching && <svg className="rd-sp-tk-chad" viewBox="0 0 80 70"><path d={PUMPKIN} /></svg>}
        </span>
        <span className="rd-sp-tk-stub-no">{pad4(no)}</span>
      </div>
    </div>
  );
}
