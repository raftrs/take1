'use client'
import { useRouter } from 'next/navigation'
export default function BackButton() {
  const router = useRouter()
  return <button className="back-btn" onClick={() => router.back()}>&larr; Back</button>
}
