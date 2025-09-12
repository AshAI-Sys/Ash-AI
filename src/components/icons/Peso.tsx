// @ts-nocheck
import React from 'react'

interface PesoIconProps {
  className?: string
  size?: number
}

export const Peso: React.FC<PesoIconProps> = ({ className = "", size = 24 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      {/* Peso symbol ₱ */}
      <path d="M6 3v18" />
      <path d="M6 8h8a3 3 0 0 0 0-6H6" />
      <path d="M6 12h8a3 3 0 0 0 0-6" />
      <path d="M2 8h8" />
      <path d="M2 12h8" />
    </svg>
  )
}

export default Peso