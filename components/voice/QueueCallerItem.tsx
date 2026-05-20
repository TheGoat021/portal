"use client"

import { ArrowRightLeft, PhoneIncoming } from "lucide-react"
import { formatPhone, formatSeconds, formatVoiceCallStatus } from "@/lib/voice/api"
import { VoiceCaller } from "@/lib/voice/types"
import { useVoiceSoftphoneStore } from "@/store/voiceSoftphoneStore"

export default function QueueCallerItem({ caller }: { caller: VoiceCaller }) {
  const startMockCall = useVoiceSoftphoneStore((state) => state.startMockCall)

  const progress = Math.min(100, Math.max(12, Math.round((caller.waitSeconds / 300) * 100)))

  return (
    <div className="rounded-2xl border border-[#E5E7EB] bg-white p-4 shadow-[0_8px_24px_-20px_rgba(15,23,42,0.18)] transition hover:border-slate-300 hover:shadow-[0_16px_30px_-24px_rgba(15,23,42,0.22)]">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-3">
            <div className="rounded-2xl bg-slate-100 p-2 text-slate-600">
              <PhoneIncoming className="h-4 w-4" />
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold text-slate-900">
                {caller.name || "Cliente em identificacao"}
              </p>
              <p className="text-sm text-slate-500">{formatPhone(caller.phone)}</p>
            </div>
          </div>

          <div className="mt-4">
            <div className="mb-2 flex items-center justify-between text-xs text-slate-500">
              <span>{caller.queueName}</span>
              <span>
                {formatVoiceCallStatus(caller.status)} • {formatSeconds(caller.waitSeconds)}
              </span>
            </div>
            <div className="h-2 rounded-full bg-slate-100">
              <div
                className="h-2 rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-500 transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() =>
              startMockCall({
                callId: caller.id,
                clientName: caller.name || "Cliente",
                phone: caller.phone,
                status: "ringing"
              })
            }
            className="inline-flex items-center justify-center rounded-xl bg-slate-950 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
          >
            Atender
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-2 rounded-xl border border-[#E5E7EB] bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
          >
            <ArrowRightLeft className="h-4 w-4" />
            Transferir
          </button>
        </div>
      </div>
    </div>
  )
}
