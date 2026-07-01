import Link from "next/link"
import {
  Shield,
  Zap,
  BadgeCheck,
  Users,
  Clock,
  MapPin,
  Bell,
  Star,
  ChevronRight,
  Phone,
} from "lucide-react"

export default function HomePage() {
  return (
    <div className="min-h-screen flex flex-col bg-white text-gray-900">
      {/* 헤더 */}
      <header className="sticky top-0 z-50 border-b border-gray-100 bg-white/90 backdrop-blur-sm">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="w-7 h-7 text-blue-600" />
            <span className="text-xl font-bold text-gray-900">GuardOn</span>
          </Link>
          <nav className="hidden md:flex items-center gap-8 text-sm font-medium text-gray-600">
            <Link href="#features" className="hover:text-gray-900 transition-colors">기능 소개</Link>
            <Link href="#how" className="hover:text-gray-900 transition-colors">이용 방법</Link>
            <Link href="#reviews" className="hover:text-gray-900 transition-colors">이용 후기</Link>
          </nav>
          <div className="flex items-center gap-3">
            <Link href="/login" className="text-sm font-medium text-gray-600 hover:text-gray-900 transition-colors">
              로그인
            </Link>
            <Link
              href="/login"
              className="text-sm font-semibold bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
            >
              무료로 시작하기
            </Link>
          </div>
        </div>
      </header>

      {/* 히어로 섹션 */}
      <section className="bg-gradient-to-b from-blue-50 to-white pt-20 pb-24 px-6">
        <div className="max-w-4xl mx-auto text-center">
          <div className="inline-flex items-center gap-2 bg-red-50 text-red-600 text-xs font-semibold px-3 py-1.5 rounded-full mb-6 border border-red-100">
            <Zap className="w-3.5 h-3.5" />
            SOS 긴급 매칭 — 평균 8분 내 인력 확보
          </div>
          <h1 className="text-4xl md:text-5xl font-bold leading-tight tracking-tight text-gray-900 mb-6">
            당일 결원,{" "}
            <span className="text-blue-600">전화 없이</span>
            <br />8분 안에 해결하세요
          </h1>
          <p className="text-lg text-gray-500 mb-10 max-w-2xl mx-auto leading-relaxed">
            대한민국 6,005개 경비·보안 업체를 잇는 B2B 인력 공유 플랫폼.
            수주 후 결원이 생겨도 검증된 인력을 즉시 연결합니다.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-red-600 text-white font-semibold px-6 py-3.5 rounded-lg hover:bg-red-700 transition-colors text-sm"
            >
              <Zap className="w-4 h-4" />
              SOS 긴급 매칭 시작
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-white border border-gray-200 text-gray-700 font-semibold px-6 py-3.5 rounded-lg hover:border-gray-300 hover:bg-gray-50 transition-colors text-sm"
            >
              인력으로 가입하기
              <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
          <p className="mt-6 text-xs text-gray-400">
            베타 무료 · 가입 후 30분 내 첫 검색 완료
          </p>
        </div>
      </section>

      {/* 신뢰 지표 */}
      <section className="border-y border-gray-100 py-10 px-6 bg-white">
        <div className="max-w-4xl mx-auto grid grid-cols-3 gap-6 text-center">
          <div>
            <p className="text-3xl font-bold text-blue-600">6,005개</p>
            <p className="text-sm text-gray-500 mt-1">국내 경비·보안 업체</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-blue-600">21.8만 명</p>
            <p className="text-sm text-gray-500 mt-1">인력 풀</p>
          </div>
          <div>
            <p className="text-3xl font-bold text-red-600">8분</p>
            <p className="text-sm text-gray-500 mt-1">평균 인력 매칭 시간</p>
          </div>
        </div>
      </section>

      {/* 핵심 가치 2가지 */}
      <section id="features" className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto grid md:grid-cols-2 gap-8">
          {/* 업체용 */}
          <div className="rounded-2xl border border-gray-100 bg-blue-50 p-8">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center mb-5">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">업체 담당자라면</h2>
            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              수주 후 당일 인력 결원이 생겨도 전화 한 통 없이 반경 내 가용 인력을 즉시 찾아드립니다.
              자격증 인증 뱃지로 검증된 인력만 연결됩니다.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              업체로 시작하기 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>

          {/* 인력용 */}
          <div className="rounded-2xl border border-gray-100 bg-gray-50 p-8">
            <div className="w-10 h-10 bg-gray-800 rounded-xl flex items-center justify-center mb-5">
              <BadgeCheck className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-xl font-bold text-gray-900 mb-3">경비·보안 인력이라면</h2>
            <p className="text-gray-600 text-sm leading-relaxed mb-6">
              자격증을 등록하고 인증 뱃지를 발급받으세요. 가용 상태를 켜두면
              근처 업체의 매칭 요청이 자동으로 도착합니다. 가입 후 7일 내 첫 제안.
            </p>
            <Link
              href="/login"
              className="inline-flex items-center gap-1.5 text-sm font-semibold text-gray-700 hover:text-gray-900 transition-colors"
            >
              인력으로 시작하기 <ChevronRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* 이용 방법 */}
      <section id="how" className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">이렇게 작동합니다</h2>
            <p className="text-gray-500 text-sm">전화 돌리던 시간을 없애드립니다</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                step: "01",
                icon: <Bell className="w-5 h-5 text-red-600" />,
                title: "SOS 요청 등록",
                desc: "결원 발생 즉시 앱에서 포지션·위치·시간을 입력합니다. 30초면 충분합니다.",
              },
              {
                step: "02",
                icon: <MapPin className="w-5 h-5 text-blue-600" />,
                title: "반경 내 인력 자동 알림",
                desc: "검증된 가용 인력에게 즉시 푸시 알림이 발송됩니다. 수락 버튼 하나로 응답합니다.",
              },
              {
                step: "03",
                icon: <Clock className="w-5 h-5 text-green-600" />,
                title: "8분 내 배치 확정",
                desc: "수락된 인력 정보가 즉시 전달되고 배치가 확정됩니다. 정산까지 자동화됩니다.",
              },
            ].map((item) => (
              <div key={item.step} className="bg-white rounded-2xl border border-gray-100 p-7">
                <div className="flex items-center gap-3 mb-4">
                  <span className="text-xs font-bold text-gray-300">{item.step}</span>
                  <div className="w-8 h-8 rounded-lg bg-gray-50 flex items-center justify-center border border-gray-100">
                    {item.icon}
                  </div>
                </div>
                <h3 className="font-semibold text-gray-900 mb-2">{item.title}</h3>
                <p className="text-sm text-gray-500 leading-relaxed">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 기능 그리드 */}
      <section className="py-20 px-6 bg-white">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold text-gray-900 mb-3">플랫폼 핵심 기능</h2>
            <p className="text-gray-500 text-sm">경비·보안 시장에 꼭 필요한 기능만 담았습니다</p>
          </div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-5">
            {[
              { icon: <Zap className="w-5 h-5 text-red-500" />, title: "SOS 긴급 매칭", desc: "당일 결원 즉시 해결" },
              { icon: <BadgeCheck className="w-5 h-5 text-blue-500" />, title: "자격증 인증 뱃지", desc: "경비지도사·신변보호사 등" },
              { icon: <Users className="w-5 h-5 text-purple-500" />, title: "업체 간 인력 공유", desc: "유휴 인력 즉시 파견" },
              { icon: <MapPin className="w-5 h-5 text-green-500" />, title: "위치 기반 매칭", desc: "반경 N km 내 인력 탐색" },
              { icon: <Bell className="w-5 h-5 text-orange-500" />, title: "실시간 알림", desc: "카카오 알림톡·SMS 병행" },
              { icon: <Clock className="w-5 h-5 text-teal-500" />, title: "24시간 자격 인증", desc: "서류 제출 후 하루 내 완료" },
              { icon: <Shield className="w-5 h-5 text-blue-600" />, title: "법적 구조 준수", desc: "직업안정법 기반 설계" },
              { icon: <Star className="w-5 h-5 text-yellow-500" />, title: "신뢰 평점 시스템", desc: "업체·인력 양방향 평가" },
            ].map((f) => (
              <div key={f.title} className="rounded-xl border border-gray-100 p-5 hover:border-blue-100 hover:bg-blue-50/30 transition-colors">
                <div className="mb-3">{f.icon}</div>
                <h3 className="text-sm font-semibold text-gray-900 mb-1">{f.title}</h3>
                <p className="text-xs text-gray-500 leading-relaxed">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* 이용 후기 */}
      <section id="reviews" className="py-20 px-6 bg-gray-50">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <div className="flex justify-center gap-0.5 mb-3">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-4 h-4 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
            <h2 className="text-3xl font-bold text-gray-900 mb-2">업체들의 실제 후기</h2>
            <p className="text-gray-500 text-sm">G360·KKM 네트워크 베타 참여 업체</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {[
              {
                name: "박** 소장",
                company: "서울 경비업체 A사",
                text: "행사 당일 오전에 인력 2명이 펑크났는데, GuardOn으로 30분 만에 자격증 있는 분들을 채웠습니다. 이전엔 불가능한 일이었어요.",
              },
              {
                name: "이** 대표",
                company: "경기 보안업체 B사",
                text: "우리 회사 유휴 인력을 타 업체에 파견하고 수수료도 받으니 일석이조입니다. 전화 영업 없이 플랫폼으로 다 해결돼요.",
              },
              {
                name: "김** 경비원",
                company: "신변보호사 자격 보유",
                text: "자격증 등록하고 뱃지 달았더니 일주일도 안 돼서 매칭 요청이 왔습니다. 가용 표시만 켜두면 알아서 연결돼요.",
              },
            ].map((r) => (
              <div key={r.name} className="bg-white rounded-2xl border border-gray-100 p-6">
                <div className="flex gap-0.5 mb-4">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                  ))}
                </div>
                <p className="text-sm text-gray-600 leading-relaxed mb-5">"{r.text}"</p>
                <div>
                  <p className="text-sm font-semibold text-gray-900">{r.name}</p>
                  <p className="text-xs text-gray-400">{r.company}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA 배너 */}
      <section className="py-20 px-6 bg-blue-600">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-3xl font-bold text-white mb-4">
            지금 바로 시작하세요
          </h2>
          <p className="text-blue-100 text-sm mb-8 leading-relaxed">
            베타 기간 무료 이용 · G360·KKM 네트워크 25,000명 인력 DB 즉시 접근
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 bg-white text-blue-600 font-semibold px-6 py-3.5 rounded-lg hover:bg-blue-50 transition-colors text-sm"
            >
              <Zap className="w-4 h-4" />
              업체로 무료 가입
            </Link>
            <Link
              href="/login"
              className="inline-flex items-center justify-center gap-2 border border-blue-400 text-white font-semibold px-6 py-3.5 rounded-lg hover:bg-blue-700 transition-colors text-sm"
            >
              인력으로 가입하기
            </Link>
          </div>
        </div>
      </section>

      {/* 푸터 */}
      <footer className="bg-gray-900 text-gray-400 py-12 px-6">
        <div className="max-w-5xl mx-auto grid md:grid-cols-4 gap-8 mb-10">
          <div>
            <div className="flex items-center gap-2 mb-4">
              <Shield className="w-5 h-5 text-blue-400" />
              <span className="text-white font-bold text-sm">GuardOn</span>
            </div>
            <p className="text-xs leading-relaxed">
              대한민국 경비·보안 인력 B2B 매칭 플랫폼
            </p>
          </div>
          <div>
            <h4 className="text-white text-xs font-semibold mb-3 uppercase tracking-wider">서비스</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/login" className="hover:text-white transition-colors">업체 가입</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">인력 가입</Link></li>
              <li><Link href="#features" className="hover:text-white transition-colors">기능 소개</Link></li>
            </ul>
          </div>
          <div>
            <h4 className="text-white text-xs font-semibold mb-3 uppercase tracking-wider">지원</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/login" className="hover:text-white transition-colors">이용 가이드</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">자주 묻는 질문</Link></li>
              <li>
                <a href="tel:010-0000-0000" className="hover:text-white transition-colors flex items-center gap-1">
                  <Phone className="w-3 h-3" /> 고객 문의
                </a>
              </li>
            </ul>
          </div>
          <div>
            <h4 className="text-white text-xs font-semibold mb-3 uppercase tracking-wider">회사</h4>
            <ul className="space-y-2 text-xs">
              <li><Link href="/login" className="hover:text-white transition-colors">회사 소개</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">채용</Link></li>
              <li><Link href="/login" className="hover:text-white transition-colors">파트너십</Link></li>
            </ul>
          </div>
        </div>
        <div className="border-t border-gray-800 pt-6 flex flex-col md:flex-row justify-between items-center gap-3 text-xs">
          <p>© 2026 GuardOn. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/login" className="hover:text-white transition-colors">개인정보처리방침</Link>
            <Link href="/login" className="hover:text-white transition-colors">이용약관</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
