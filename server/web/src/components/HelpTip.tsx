import { useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Icon } from "./Icon";

interface HelpTipProps {
  size?: number;
  text: string;
}

// Port 1:1 do HelpTip real (get_component_full("HelpTip")) — ícone "help" com um balão via
// portal pro body, posicionado a partir do retângulo do próprio ícone (hover/focus mostram,
// mouse-leave/blur escondem).
export function HelpTip({ size = 13, text }: HelpTipProps) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  const ref = useRef<HTMLSpanElement>(null);

  function show() {
    const rect = ref.current?.getBoundingClientRect();
    if (rect) setPos({ top: rect.top, left: rect.left + rect.width / 2 });
  }

  return (
    <span className="help-tip" ref={ref} tabIndex={0} onMouseEnter={show} onMouseLeave={() => setPos(null)} onFocus={show} onBlur={() => setPos(null)}>
      <Icon name="help" size={size} />
      {pos &&
        createPortal(
          <span
            className="help-tip-bubble"
            style={{ position: "fixed", top: pos.top - 8, left: pos.left, transform: "translate(-50%, -100%)" }}
          >
            {text}
          </span>,
          document.body
        )}
    </span>
  );
}
