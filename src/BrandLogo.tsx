// CRBU 로고: 눈물 흘리는 노란 얼굴. 원본 이미지를 100×100 벡터로 옮겼습니다.
export const brandColors = { yellow: '#FFCB05', green: '#0A6936', black: '#1E1E1E' }

const tear = 'M63.4 59.6 C64.2 62.6 63.4 65.4 62.9 68.6 A3.5 3.5 0 1 0 69.3 68.6 C68.8 65.4 68 62.6 68.8 59.6 Z'

export function BrandLogoMark() {
  const { yellow, black } = brandColors
  return (
    <>
      <circle cx="50" cy="50" r="43.4" fill="white" stroke={black} strokeWidth="0.9" />
      <circle cx="50" cy="50" r="39" fill={yellow} stroke={black} strokeWidth="0.9" />
      {/* 흰자와 눈물은 테두리를 먼저 그리고 흰색을 덮어 하나의 모양처럼 이어 붙입니다. */}
      <g stroke={black} strokeWidth="1.3" fill="white">
        <ellipse cx="34" cy="46" rx="11.3" ry="15" />
        <ellipse cx="66" cy="46" rx="11.2" ry="14.6" />
        <path d={tear} />
      </g>
      <g fill="white">
        <ellipse cx="34" cy="46" rx="10.65" ry="14.35" />
        <ellipse cx="66" cy="46" rx="10.55" ry="13.95" />
        <path d={tear} transform="translate(66.1 66) scale(.86) translate(-66.1 -66)" />
        <rect x="63.6" y="57.5" width="5" height="4" />
      </g>
      <ellipse cx="36.6" cy="46" rx="6.6" ry="9.5" fill="#0A0A0A" />
      <ellipse cx="63.4" cy="46" rx="6.6" ry="9.5" fill="#0A0A0A" />
      <circle cx="35.6" cy="41.4" r="1.5" fill="white" />
      <circle cx="62.2" cy="41.4" r="1.5" fill="white" />
    </>
  )
}

export function BrandLogo({ size = 26 }: { size?: number }) {
  return (
    <svg className="brand-logo" width={size} height={size} viewBox="6 6 88 88" role="img" aria-label="CRBU 로고">
      <BrandLogoMark />
    </svg>
  )
}
