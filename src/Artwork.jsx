import React from "react";
export default function Artwork({ type = "world", code, large = false }) {
  const colors = {
    world: ["#132949", "#80cfea"],
    loop: ["#24243f", "#b9a3ff"],
    model: ["#0c4649", "#8fe0c3"],
    wave: ["#f1dbcf", "#ab5147"],
    agent: ["#eadffc", "#7460bf"],
    search: ["#dfece3", "#346d58"],
    nodes: ["#dbe8f5", "#4a729f"],
  };
  const [bg, fg] = colors[type] || colors.world;
  return (
    <div
      className={`artwork ${large ? "large" : ""}`}
      style={{ background: bg, color: fg }}
      aria-hidden="true"
    >
      <svg viewBox="0 0 520 290" preserveAspectRatio="xMidYMid slice">
        <defs>
          <pattern
            id={`grid-${type}-${large}`}
            width="26"
            height="26"
            patternUnits="userSpaceOnUse"
          >
            <path d="M26 0H0V26" fill="none" stroke={fg} strokeOpacity=".12" />
          </pattern>
        </defs>
        <rect width="520" height="290" fill={`url(#grid-${type}-${large})`} />
        {type === "world" ? (
          <g transform="translate(300 144)">
            <circle
              r="81"
              fill={fg}
              fillOpacity=".09"
              stroke={fg}
              strokeOpacity=".6"
            />
            {[0, 30, 60, 90, 120, 150].map((a) => (
              <ellipse
                key={a}
                rx="81"
                ry="29"
                fill="none"
                stroke={fg}
                strokeOpacity=".6"
                transform={`rotate(${a})`}
              />
            ))}
            <ellipse
              rx="164"
              ry="50"
              fill="none"
              stroke={fg}
              transform="rotate(-25)"
            />
            <circle cx="-144" cy="66" r="6" fill="white" />
            <circle cx="121" cy="-82" r="4" fill={fg} />
          </g>
        ) : type === "loop" ? (
          <g
            transform="translate(310 136)"
            fill="none"
            stroke={fg}
            strokeWidth="2"
          >
            {[0, 1, 2, 3, 4, 5, 6].map((i) => (
              <rect
                key={i}
                x={-82 + i * 6}
                y={-75 + i * 5}
                width={136 - i * 4}
                height={136 - i * 4}
                rx="32"
                transform={`rotate(${i * 12})`}
              />
            ))}
            <path d="M-166 65h63m-15-9 15 9-15 9M102-57h59m-15-9 15 9-15 9" />
            <circle cx="0" cy="0" r="8" fill={fg} />
          </g>
        ) : type === "model" ? (
          <g stroke={fg} fill={fg}>
            {[0, 1, 2, 3, 4].map((i) => (
              <g key={i}>
                {[0, 1, 2, 3, 4].map((j) => (
                  <g key={j}>
                    <path
                      d={`M${175 + i * 44} ${57 + j * 38}l44 19 -44 19 -44 -19z`}
                      fillOpacity={0.08 + i * 0.03}
                      strokeOpacity=".6"
                    />
                  </g>
                ))}
              </g>
            ))}
          </g>
        ) : type === "wave" ? (
          <g fill="none" stroke={fg}>
            {Array.from({ length: 18 }, (_, i) => (
              <path
                key={i}
                d={`M120 ${70 + i * 8} C220 ${-45 + i * 9} 290 ${290 - i * 4} 510 ${90 + i * 7}`}
                strokeOpacity={0.25 + i * 0.025}
              />
            ))}
          </g>
        ) : type === "search" ? (
          <g
            transform="translate(300 143)"
            fill="none"
            stroke={fg}
            strokeWidth="2"
          >
            <rect
              x="-95"
              y="-69"
              width="151"
              height="113"
              rx="12"
              fill={fg}
              fillOpacity=".05"
            />
            <path d="M-69-40H20M-69-20H4M-69 0h58" />
            <circle cx="51" cy="36" r="41" fill={bg} />
            <path d="m82 67 31 31M32 40l14 10 26-30" strokeWidth="5" />
          </g>
        ) : (
          <g transform="translate(300 138)" stroke={fg} strokeWidth="2">
            {[
              [0, -76],
              [100, -22],
              [63, 78],
              [-64, 78],
              [-103, -22],
            ].map(([x, y], i) => (
              <g key={i}>
                <path d={`M0 0L${x} ${y}`} strokeDasharray="4 5" />
                <rect
                  x={x - 24}
                  y={y - 24}
                  width="48"
                  height="48"
                  rx="15"
                  fill={bg}
                />
                <circle cx={x - 7} cy={y - 2} r="2" fill={fg} />
                <circle cx={x + 7} cy={y - 2} r="2" fill={fg} />
                <path d={`M${x - 8} ${y + 8}q8 5 16 0`} fill="none" />
              </g>
            ))}
            <rect x="-30" y="-30" width="60" height="60" rx="18" fill={fg} />
            <path d="M-12 0h24M0-12v24" stroke={bg} />
          </g>
        )}
      </svg>
      <span className="art-code">{code}</span>
      <span className="art-caption">
        {
          {
            world: "感知 · 预测 · 决策",
            loop: "构建 · 评估 · 迭代",
            model: "数据 · 训练 · 对齐",
            wave: "理解模型，打开可能",
            agent: "从理解到行动",
            search: "让有价值的内容被发现",
            nodes: "学习 · 实践 · 协作",
          }[type]
        }
      </span>
    </div>
  );
}
