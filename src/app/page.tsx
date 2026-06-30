"use client"

import Link from "next/link"
import { useEffect, useRef, useState } from "react"
import { ShieldCheck, CheckCircle2 } from "lucide-react"
import { LANDING } from "@/lib/constants"

function Reveal({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            setVisible(true)
            io.unobserve(e.target)
          }
        })
      },
      { threshold: 0.15 }
    )
    io.observe(el)
    return () => io.disconnect()
  }, [])

  return (
    <div
      ref={ref}
      className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"} ${className}`}
    >
      {children}
    </div>
  )
}

const RADAR_BLIPS = [
  { x: 30, y: 35, label: "정현우 · 일반경비" },
  { x: 72, y: 22, label: "이재호 · 신변보호사" },
  { x: 60, y: 68, label: "김도윤 · 특수경비" },
  { x: 18, y: 62, label: "박서연 · 신변보호사" },
]

const LOG_LINES = [
  { t: "T+0:00", text: "SOS 등록 — 강남구 · 2명" },
  { t: "T+0:30", text: "반경 15km 내 7명에게 알림 발송" },
  { t: "T+3:47", text: "이재호 수락 완료", ok: true },
  { t: "T+6:12", text: "박서연 수락 완료", ok: true },
  { t: "T+8:00", text: "매칭 확정 — 인력 2/2 배치 완료", ok: true },
]

function DispatchConsole() {
  const [visibleBlips, setVisibleBlips] = useState(0)
  const [visibleLines, setVisibleLines] = useState(0)

  useEffect(() => {
    setVisibleBlips(0)
    setVisibleLines(0)
    const blipTimers = RADAR_BLIPS.map((_, i) => setTimeout(() => setVisibleBlips((n) => n + 1), i * 420))
    const lineTimers = LOG_LINES.map((_, i) => setTimeout(() => setVisibleLines((n) => n + 1), 500 + i * 650))
    return () => {
      blipTimers.forEach(clearTimeout)
      lineTimers.forEach(clearTimeout)
    }
  }, [])

  return (
    <div className="rounded-2xl border border-gray-200 bg-white shadow-card overflow-hidden">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-gray-100 font-mono text-[11.5px] text-gray-400">
        <span className="flex items-center gap-2 text-brand font-semibold tracking-wide">
          <span className="w-[7px] h-[7px] rounded-full bg-brand animate-pulse" />
          {LANDING.HERO.CONSOLE_TAG}
        </span>
        <span>{LANDING.HERO.CONSOLE_LABEL}</span>
      </div>
      <div className="p-5">
        <div className="flex justify-between items-baseline font-mono text-[12.5px] text-gray-500 mb-4">
          <span className="font-sans font-semibold text-[14px] text-gray-900">{LANDING.HERO.CONSOLE_LOC}</span>
          <span>{LANDING.HERO.CONSOLE_NEED}</span>
        </div>
        <div className="relative h-[200px] mb-4 rounded-xl bg-blue-50/60 overflow-hidden">
          <div
            className="absolute left-1/2 top-1/2 w-px h-1/2 origin-top"
            style={{
              background: "linear-gradient(to bottom, #2563EB88, transparent)",
              animation: "sweep 3.4s linear infinite",
            }}
          />
          <div className="absolute left-1/2 top-1/2 w-2.5 h-2.5 rounded-full bg-gray-900 -translate-x-1/2 -translate-y-1/2 ring-4 ring-white z-10" />
          {RADAR_BLIPS.slice(0, visibleBlips).map((b) => (
            <div
              key={b.label}
              className="absolute w-[9px] h-[9px] rounded-full bg-emerald-500 ring-4 ring-emerald-100 z-[2]"
              style={{ left: `${b.x}%`, top: `${b.y}%` }}
            >
              <span className="absolute left-3.5 -top-1.5 whitespace-nowrap font-mono text-[10.5px] text-gray-500">
                {b.label}
              </span>
            </div>
          ))}
        </div>
        <div className="border-t border-dashed border-gray-200 pt-3.5 flex flex-col gap-2.5 min-h-[140px]">
          {LOG_LINES.slice(0, visibleLines).map((l) => (
            <div
              key={l.t}
              className={`flex items-center gap-2.5 font-mono text-[12px] ${l.ok ? "text-emerald-600" : "text-gray-400"}`}
            >
              <span className="text-gray-400 min-w-[54px]">{l.t}</span>
              <span className={l.ok ? "" : "text-gray-700"}>{l.text}</span>
              {l.ok && <CheckCircle2 className="w-3.5 h-3.5" />}
            </div>
          ))}
        </div>
      </div>
      <style>{`@keyframes sweep { from { transform: translate(-50%,0) rotate(0deg); } to { transform: translate(-50%,0) rotate(360deg); } }`}</style>
    </div>
  )
}

function Eyebrow({ children, center = false }: { children: React.ReactNode; center?: boolean }) {
  return (
    <div className={`flex items-center gap-2 mb-4 font-mono text-[12.5px] tracking-wider uppercase text-brand ${center ? "justify-center" : ""}`}>
      <span className="w-1.5 h-1.5 rounded-full bg-brand ring-4 ring-blue-100" />
      {children}
    </div>
  )
}

export default function HomePage() {
  const [tab, setTab] = useState<"company" | "worker">("company")
  const feats = tab === "company" ? LANDING.USERS.COMPANY_FEATS : LANDING.USERS.WORKER_FEATS

  return (
    <div className="min-h-screen bg-white text-gray-900">
      {/* HEADER */}
      <header className="sticky top-0 z-50 backdrop-blur bg-white/85 border-b border-gray-100">
        <div className="max-w-[1180px] mx-auto px-7 h-[74px] flex items-center justify-between">
          <div className="flex items-center gap-2.5 font-extrabold text-lg tracking-tight">
            <span className="w-2.5 h-2.5 rounded-sm bg-brand rotate-45" />
            GuardOn
          </div>
          <nav className="hidden md:flex items-center gap-8 text-[14.5px] text-gray-500 font-medium">
            <a href="#problem" className="hover:text-gray-900">{LANDING.NAV.PROBLEM}</a>
            <a href="#flow" className="hover:text-gray-900">{LANDING.NAV.FLOW}</a>
            <a href="#trust" className="hover:text-gray-900">{LANDING.NAV.TRUST}</a>
            <a href="#users" className="hover:text-gray-900">{LANDING.NAV.USERS}</a>
            <a href="#pricing" className="hover:text-gray-900">{LANDING.NAV.PRICING}</a>
          </nav>
          <div className="flex items-center gap-3.5">
            <Link href="/login" className="hidden md:inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-semibold text-gray-700 border border-gray-200 hover:border-gray-300 transition-colors">
              {LANDING.NAV.LOGIN}
            </Link>
            <Link href="/login" className="inline-flex items-center px-5 py-2.5 rounded-lg text-sm font-semibold bg-brand text-white hover:bg-brand-dark transition-colors shadow-sm">
              {LANDING.NAV.CTA}
            </Link>
          </div>
        </div>
      </header>

      <main>
        {/* HERO */}
        <section className="max-w-[1180px] mx-auto px-7 pt-20 pb-16 grid md:grid-cols-[1.02fr_0.98fr] gap-12 items-center">
          <div>
            <Eyebrow>{LANDING.HERO.EYEBROW}</Eyebrow>
            <h1 className="text-[34px] md:text-[52px] font-extrabold leading-[1.12] tracking-tight mb-6">
              {LANDING.HERO.TITLE_1}<br />
              {LANDING.HERO.TITLE_2} <span className="text-brand">{LANDING.HERO.TITLE_ACCENT}</span>{LANDING.HERO.TITLE_3}
            </h1>
            <p className="text-[17px] leading-relaxed text-gray-500 max-w-[480px] mb-8">{LANDING.HERO.LEAD}</p>
            <div className="flex flex-wrap gap-3.5 mb-9">
              <Link href="/login" className="inline-flex items-center gap-2 px-6 py-3.5 rounded-lg text-[15.5px] font-semibold bg-brand text-white hover:bg-brand-dark transition-colors shadow-sm">
                {LANDING.HERO.CTA_PRIMARY} <span>→</span>
              </Link>
              <a href="#flow" className="inline-flex items-center px-6 py-3.5 rounded-lg text-[15.5px] font-semibold text-gray-700 border border-gray-200 hover:border-gray-300 transition-colors">
                {LANDING.HERO.CTA_SECONDARY}
              </a>
            </div>
            <div className="flex gap-7 pt-6 border-t border-gray-100 font-mono text-[12.5px] text-gray-400">
              <div><b className="block font-sans text-xl text-gray-900 font-extrabold mb-0.5">{LANDING.HERO.PROOF_1_NUM}</b>{LANDING.HERO.PROOF_1_LABEL}</div>
              <div><b className="block font-sans text-xl text-gray-900 font-extrabold mb-0.5">{LANDING.HERO.PROOF_2_NUM}</b>{LANDING.HERO.PROOF_2_LABEL}</div>
              <div><b className="block font-sans text-xl text-gray-900 font-extrabold mb-0.5">{LANDING.HERO.PROOF_3_NUM}</b>{LANDING.HERO.PROOF_3_LABEL}</div>
            </div>
          </div>
          <DispatchConsole />
        </section>

        {/* PROBLEM */}
        <section id="problem" className="border-t border-gray-100 py-24">
          <div className="max-w-[1180px] mx-auto px-7">
            <Reveal className="max-w-[640px] mb-12">
              <Eyebrow>{LANDING.PROBLEM.EYEBROW}</Eyebrow>
              <h2 className="text-[26px] md:text-[36px] font-extrabold tracking-tight leading-snug">{LANDING.PROBLEM.TITLE}</h2>
              <p className="text-gray-500 text-base leading-relaxed mt-3.5">{LANDING.PROBLEM.LEAD}</p>
            </Reveal>
            <div className="grid md:grid-cols-2 gap-6">
              <Reveal className="rounded-2xl p-7 border border-gray-200 bg-gray-50">
                <span className="font-mono text-[11.5px] tracking-wider uppercase text-gray-400 mb-4 inline-block">{LANDING.PROBLEM.BEFORE_TAG}</span>
                <h3 className="text-xl font-bold mb-4 leading-snug">{LANDING.PROBLEM.BEFORE_TITLE}</h3>
                <ul className="flex flex-col gap-3">
                  {LANDING.PROBLEM.BEFORE_LIST.map((item) => (
                    <li key={item} className="flex gap-2.5 text-sm text-gray-500 leading-relaxed">
                      <span className="text-gray-300 shrink-0">—</span>{item}
                    </li>
                  ))}
                </ul>
              </Reveal>
              <Reveal className="rounded-2xl p-7 border border-blue-100 bg-blue-50/50">
                <span className="font-mono text-[11.5px] tracking-wider uppercase text-brand mb-4 inline-block">{LANDING.PROBLEM.AFTER_TAG}</span>
                <h3 className="text-xl font-bold mb-4 leading-snug">{LANDING.PROBLEM.AFTER_TITLE}</h3>
                <ul className="flex flex-col gap-3">
                  {LANDING.PROBLEM.AFTER_LIST.map((item) => (
                    <li key={item} className="flex gap-2.5 text-sm text-gray-700 leading-relaxed">
                      <span className="text-brand shrink-0">—</span>{item}
                    </li>
                  ))}
                </ul>
              </Reveal>
            </div>
          </div>
        </section>

        {/* FLOW */}
        <section id="flow" className="border-t border-gray-100 py-24">
          <div className="max-w-[1180px] mx-auto px-7">
            <Reveal className="max-w-[640px] mb-12">
              <Eyebrow>{LANDING.FLOW.EYEBROW}</Eyebrow>
              <h2 className="text-[26px] md:text-[36px] font-extrabold tracking-tight leading-snug">{LANDING.FLOW.TITLE}</h2>
              <p className="text-gray-500 text-base leading-relaxed mt-3.5">{LANDING.FLOW.LEAD}</p>
            </Reveal>
            <div>
              {LANDING.FLOW.STEPS.map((step) => (
                <Reveal key={step.time}>
                  <div className="grid grid-cols-[80px_1fr] md:grid-cols-[90px_1fr] gap-7 py-7 border-t border-gray-100">
                    <div className="font-mono text-sm text-brand font-semibold pt-0.5">{step.time}</div>
                    <div>
                      <h4 className="text-lg font-bold mb-2">{step.title}</h4>
                      <p className="text-gray-500 text-[14.5px] leading-relaxed max-w-[560px]">{step.desc}</p>
                      <span className="inline-block font-mono text-[10.5px] tracking-wider text-gray-400 border border-gray-200 rounded px-2 py-1 mt-2.5">
                        {step.who}
                      </span>
                    </div>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* TRUST */}
        <section id="trust" className="border-t border-gray-100 py-24">
          <div className="max-w-[1180px] mx-auto px-7">
            <Reveal className="max-w-[640px] mb-12">
              <Eyebrow>{LANDING.TRUST.EYEBROW}</Eyebrow>
              <h2 className="text-[26px] md:text-[36px] font-extrabold tracking-tight leading-snug">{LANDING.TRUST.TITLE}</h2>
              <p className="text-gray-500 text-base leading-relaxed mt-3.5">{LANDING.TRUST.LEAD}</p>
            </Reveal>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-5">
              {LANDING.TRUST.BADGES.map((b) => (
                <Reveal key={b.title} className="rounded-2xl border border-gray-200 p-6 hover:border-brand hover:-translate-y-1 transition-all bg-white shadow-card">
                  <div className="w-10 h-10 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center mb-4">
                    <ShieldCheck className="w-5 h-5 text-brand" />
                  </div>
                  <h4 className="text-[15.5px] font-bold mb-1.5">{b.title}</h4>
                  <span className="font-mono text-[11.5px] text-gray-400">{b.org}</span>
                  <div className="flex items-center gap-1.5 font-mono text-[10.5px] text-emerald-600 mt-4 pt-3.5 border-t border-dashed border-gray-200">
                    <CheckCircle2 className="w-3.5 h-3.5" /> {LANDING.TRUST.VERIFY}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* TWO SIDED */}
        <section id="users" className="border-t border-gray-100 py-24">
          <div className="max-w-[1180px] mx-auto px-7">
            <Reveal className="max-w-[640px] mb-10">
              <Eyebrow>{LANDING.USERS.EYEBROW}</Eyebrow>
              <h2 className="text-[26px] md:text-[36px] font-extrabold tracking-tight leading-snug">{LANDING.USERS.TITLE}</h2>
            </Reveal>
            <Reveal className="flex gap-2 mb-10">
              <button
                onClick={() => setTab("company")}
                className={`font-mono text-[12.5px] px-4.5 py-2.5 rounded-lg border transition-colors ${tab === "company" ? "bg-gray-900 text-white border-gray-900" : "text-gray-500 border-gray-200 hover:border-gray-300"}`}
              >
                {LANDING.USERS.TAB_COMPANY}
              </button>
              <button
                onClick={() => setTab("worker")}
                className={`font-mono text-[12.5px] px-4.5 py-2.5 rounded-lg border transition-colors ${tab === "worker" ? "bg-gray-900 text-white border-gray-900" : "text-gray-500 border-gray-200 hover:border-gray-300"}`}
              >
                {LANDING.USERS.TAB_WORKER}
              </button>
            </Reveal>
            <div className="grid md:grid-cols-2 gap-10 items-start">
              <div>
                {feats.map((f, i) => (
                  <div key={f.title} className="flex gap-4 py-5 border-t border-gray-100 first:pt-0">
                    <span className="font-mono text-gray-400 text-[13px] pt-0.5">{["①", "②", "③"][i]}</span>
                    <div>
                      <h5 className="text-base font-bold mb-1.5">{f.title}</h5>
                      <p className="text-sm text-gray-500 leading-relaxed">{f.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="rounded-2xl border border-gray-200 bg-gray-50 p-7 min-h-[300px] flex flex-col gap-3.5 justify-center">
                {tab === "company" ? (
                  <>
                    <div className="bg-white border border-gray-200 rounded-xl px-4.5 py-4 flex justify-between items-center">
                      <div><div className="font-bold text-[14.5px]">강남구 · 신변보호 2명</div><div className="font-mono text-[11px] text-gray-400 mt-1">SOS-2026-0414</div></div>
                      <span className="font-mono text-[10.5px] px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-600">확정</span>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl px-4.5 py-4 flex justify-between items-center">
                      <div><div className="font-bold text-[14.5px]">광주 · 행사 경호 1명</div><div className="font-mono text-[11px] text-gray-400 mt-1">반경 50km 확장</div></div>
                      <span className="font-mono text-[10.5px] px-2.5 py-1 rounded-md bg-gray-100 text-gray-500">대기중</span>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl px-4.5 py-4 flex justify-between items-center">
                      <div><div className="font-bold text-[14.5px]">이재호 · 신변보호사</div><div className="font-mono text-[11px] text-gray-400 mt-1">평점 4.9 · 경력 3년</div></div>
                      <span className="font-mono text-[10.5px] px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-600">인증완료</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bg-white border border-gray-200 rounded-xl px-4.5 py-4 flex justify-between items-center">
                      <div><div className="font-bold text-[14.5px]">가용 상태</div><div className="font-mono text-[11px] text-gray-400 mt-1">내일 09:00 일정 비어있음</div></div>
                      <span className="font-mono text-[10.5px] px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-600">ON</span>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl px-4.5 py-4 flex justify-between items-center">
                      <div><div className="font-bold text-[14.5px]">긴급 매칭 — 강남구</div><div className="font-mono text-[11px] text-gray-400 mt-1">신변보호사 이상 · 시급 18,000원</div></div>
                      <span className="font-mono text-[10.5px] px-2.5 py-1 rounded-md bg-gray-100 text-gray-500">수락 대기</span>
                    </div>
                    <div className="bg-white border border-gray-200 rounded-xl px-4.5 py-4 flex justify-between items-center">
                      <div><div className="font-bold text-[14.5px]">누적 평점</div><div className="font-mono text-[11px] text-gray-400 mt-1">완료 매칭 14건</div></div>
                      <span className="font-mono text-[10.5px] px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-600">4.9 ★</span>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>

        {/* STATS */}
        <section className="border-t border-gray-100 py-24">
          <div className="max-w-[1180px] mx-auto px-7">
            <Reveal className="rounded-2xl bg-gradient-to-br from-blue-50 to-white border border-blue-100 p-10 md:p-12 grid grid-cols-2 md:grid-cols-4 gap-8">
              {LANDING.STATS.map((s) => (
                <div key={s.label}>
                  <div className="font-mono text-[28px] md:text-[34px] font-bold text-brand">{s.num}</div>
                  <div className="text-[13.5px] text-gray-500 mt-2 leading-relaxed">{s.label}</div>
                </div>
              ))}
            </Reveal>
          </div>
        </section>

        {/* PRICING */}
        <section id="pricing" className="border-t border-gray-100 py-24">
          <div className="max-w-[1180px] mx-auto px-7">
            <Reveal className="max-w-[640px] mb-12">
              <Eyebrow>{LANDING.PRICING.EYEBROW}</Eyebrow>
              <h2 className="text-[26px] md:text-[36px] font-extrabold tracking-tight leading-snug">{LANDING.PRICING.TITLE}</h2>
              <p className="text-gray-500 text-base leading-relaxed mt-3.5">{LANDING.PRICING.LEAD}</p>
            </Reveal>
            <Reveal className="max-w-[520px] rounded-2xl border border-gray-200 shadow-card p-10">
              <span className="inline-block font-mono text-[11.5px] text-emerald-600 bg-emerald-50 border border-emerald-100 px-3 py-1.5 rounded-md mb-5">
                {LANDING.PRICING.BADGE}
              </span>
              <div className="text-[38px] font-extrabold mb-1.5">{LANDING.PRICING.PRICE}</div>
              <p className="text-gray-500 text-sm mb-7">{LANDING.PRICING.NOTE}</p>
              <ul className="flex flex-col gap-3.5 mb-8">
                {LANDING.PRICING.LIST.map((item) => (
                  <li key={item} className="flex gap-2.5 text-[14.5px] items-start">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />{item}
                  </li>
                ))}
              </ul>
              <Link href="/login" className="w-full flex items-center justify-center px-6 py-3.5 rounded-lg text-[15.5px] font-semibold bg-brand text-white hover:bg-brand-dark transition-colors">
                {LANDING.PRICING.CTA}
              </Link>
            </Reveal>
          </div>
        </section>

        {/* CLOSING CTA */}
        <section className="border-t border-gray-100 py-24 text-center">
          <div className="max-w-[1180px] mx-auto px-7">
            <Eyebrow center>{LANDING.CLOSING.EYEBROW}</Eyebrow>
            <Reveal>
              <h2 className="text-[28px] md:text-[42px] font-extrabold tracking-tight max-w-[680px] mx-auto mb-5">{LANDING.CLOSING.TITLE}</h2>
              <p className="text-gray-500 text-base mb-9">{LANDING.CLOSING.LEAD}</p>
              <div className="flex gap-3.5 justify-center flex-wrap">
                <Link href="/login" className="inline-flex items-center px-6 py-3.5 rounded-lg text-[15.5px] font-semibold bg-brand text-white hover:bg-brand-dark transition-colors shadow-sm">
                  {LANDING.CLOSING.CTA_PRIMARY}
                </Link>
                <Link href="/login" className="inline-flex items-center px-6 py-3.5 rounded-lg text-[15.5px] font-semibold text-gray-700 border border-gray-200 hover:border-gray-300 transition-colors">
                  {LANDING.CLOSING.CTA_SECONDARY}
                </Link>
              </div>
            </Reveal>
          </div>
        </section>
      </main>

      <footer className="border-t border-gray-100 py-12">
        <div className="max-w-[1180px] mx-auto px-7">
          <div className="flex flex-wrap justify-between gap-6 mb-8">
            <div className="flex items-center gap-2.5 font-extrabold text-lg tracking-tight">
              <span className="w-2.5 h-2.5 rounded-sm bg-brand rotate-45" />
              GuardOn
            </div>
            <nav className="flex gap-6 text-[14.5px] text-gray-500">
              <a href="#problem" className="hover:text-gray-900">서비스 소개</a>
              <a href="#flow" className="hover:text-gray-900">SOS 매칭</a>
              <a href="#trust" className="hover:text-gray-900">자격 인증</a>
              <a href="#pricing" className="hover:text-gray-900">요금</a>
            </nav>
          </div>
          <p className="font-mono text-[11.5px] text-gray-400 leading-relaxed border-t border-gray-100 pt-6">
            {LANDING.FOOTER.LEGAL}
          </p>
        </div>
      </footer>
    </div>
  )
}
