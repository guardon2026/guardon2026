import Link from "next/link"
import { Shield } from "lucide-react"

export const metadata = {
  title: "이용약관 | GuardOn",
  description: "GuardOn 서비스 이용약관",
}

const SECTIONS = [
  {
    title: "제1조 (목적)",
    content: `이 약관은 주식회사 지360(이하 "회사")이 운영하는 GuardOn 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리·의무 및 책임 사항, 서비스 이용 조건 및 절차 등 기본적인 사항을 규정함을 목적으로 합니다.`,
  },
  {
    title: "제2조 (정의)",
    content: `① "서비스"란 회사가 제공하는 경비·보안 인력 매칭 플랫폼 및 이와 관련된 모든 부가 서비스를 말합니다.
② "이용자"란 이 약관에 동의하고 서비스를 이용하는 업체 담당자 및 경비·보안 인력을 말합니다.
③ "업체 회원"이란 경비·보안 관련 업무를 수행하는 법인 또는 개인사업자로서 인력 매칭을 요청하는 이용자를 말합니다.
④ "인력 회원"이란 경비·보안 관련 자격증 또는 경력을 보유하고 매칭 제안을 수락하는 이용자를 말합니다.
⑤ "SOS 매칭"이란 업체 회원이 당일 결원 발생 시 가용 인력 회원에게 긴급 배치를 요청하는 기능을 말합니다.`,
  },
  {
    title: "제3조 (약관의 효력 및 변경)",
    content: `① 이 약관은 서비스 화면에 게시하거나 기타 방법으로 이용자에게 공지함으로써 효력을 발생합니다.
② 회사는 필요한 경우 관련 법령을 위반하지 않는 범위 내에서 이 약관을 변경할 수 있습니다.
③ 약관이 변경되는 경우 회사는 변경 사항을 시행일 7일 전부터 서비스 내 공지사항을 통해 공지합니다. 다만 이용자에게 불리한 변경의 경우 30일 전에 공지합니다.
④ 이용자가 변경된 약관의 효력 발생일 이후에도 서비스를 계속 이용하면 변경된 약관에 동의한 것으로 봅니다.`,
  },
  {
    title: "제4조 (서비스 이용 신청 및 승낙)",
    content: `① 이용자는 회사가 정한 방법에 따라 필요한 사항을 기재하여 이용 신청을 합니다.
② 회사는 다음 각 호의 경우 이용 신청을 승낙하지 않거나 사후에 이용 계약을 해지할 수 있습니다.
   1. 타인의 정보를 도용하여 신청한 경우
   2. 허위 정보를 기재하거나 회사가 요구하는 자료를 제출하지 않은 경우
   3. 서비스 운영을 고의로 방해하거나 방해할 우려가 있는 경우
   4. 관련 법령에 위반되는 목적으로 신청한 경우
③ 업체 회원은 사업자등록번호, 경비업 허가번호 등 관련 서류를 제출하여야 하며, 회사는 이를 확인 후 승낙합니다.`,
  },
  {
    title: "제5조 (서비스의 제공 및 변경)",
    content: `① 회사는 다음과 같은 서비스를 제공합니다.
   1. 경비·보안 인력 매칭 서비스
   2. SOS 긴급 인력 배치 서비스
   3. 자격증 인증 뱃지 발급 서비스
   4. 위치 기반 인력 탐색 서비스
   5. 이용 이력 관리 및 정산 서비스
② 회사는 서비스의 내용·품질 향상을 위해 서비스의 전부 또는 일부를 변경할 수 있으며, 이 경우 변경 내용과 적용 일자를 사전에 공지합니다.`,
  },
  {
    title: "제6조 (서비스 이용 요금)",
    content: `① 서비스 기본 이용은 무료입니다. 단, 일부 프리미엄 기능은 유료로 제공될 수 있으며, 이 경우 별도 공지합니다.
② 매칭 성사 시 회사는 서비스 수수료를 부과할 수 있으며, 수수료율은 서비스 화면에 별도 표시합니다.
③ 이용 요금에 관한 사항이 변경될 경우 적용일 30일 전에 사전 공지합니다.`,
  },
  {
    title: "제7조 (이용자의 의무)",
    content: `① 이용자는 다음 각 호의 행위를 하여서는 안 됩니다.
   1. 신청 또는 변경 시 허위 사항을 기재하는 행위
   2. 타인의 정보를 도용하는 행위
   3. 회사가 게시한 정보를 무단으로 변경하는 행위
   4. 회사 또는 제3자의 지식재산권을 침해하는 행위
   5. 서비스를 이용하여 얻은 정보를 무단으로 제3자에게 제공하는 행위
   6. 기타 불법적이거나 부당한 행위
② 인력 회원은 자격증 및 경력 정보를 사실에 기반하여 등록하여야 하며, 허위 정보 등록 시 즉시 이용이 제한됩니다.
③ 업체 회원은 매칭된 인력에 대하여 관련 노동법령 및 근로기준법을 준수하여야 합니다.`,
  },
  {
    title: "제8조 (회사의 의무)",
    content: `① 회사는 관련 법령과 이 약관이 금지하거나 공서양속에 반하는 행위를 하지 않으며, 지속적이고 안정적인 서비스를 제공하기 위해 최선을 다합니다.
② 회사는 이용자의 개인정보를 안전하게 처리하기 위한 보안 시스템을 구축하고 유지합니다.
③ 회사는 이용자로부터 제기된 의견이나 불만이 정당하다고 인정될 경우 이를 처리하며, 처리 결과를 이용자에게 안내합니다.`,
  },
  {
    title: "제9조 (개인정보 보호)",
    content: `① 회사는 이용자의 개인정보를 관련 법령 및 개인정보처리방침에 따라 보호합니다.
② 회사는 이용자의 사전 동의 없이 개인정보를 제3자에게 제공하지 않습니다. 다만, 관련 법령에 따른 수사기관의 요청 등 법령상 의무 이행을 위한 경우는 예외로 합니다.
③ 개인정보처리방침의 자세한 내용은 별도의 개인정보처리방침 페이지를 통해 확인하실 수 있습니다.`,
  },
  {
    title: "제10조 (서비스 중단)",
    content: `① 회사는 다음 각 호의 경우 서비스 제공을 일시 중단할 수 있습니다.
   1. 서버, 네트워크 등 정보통신설비의 보수점검·교체 및 고장
   2. 천재지변 또는 이에 준하는 불가항력적 사유 발생
   3. 기타 회사의 합리적인 판단에 따른 불가피한 사유
② 회사는 서비스 중단 시 사전에 공지하며, 사전 통지가 불가능한 경우 사후에 즉시 공지합니다.`,
  },
  {
    title: "제11조 (책임 제한)",
    content: `① 회사는 천재지변 또는 이에 준하는 불가항력으로 인하여 서비스를 제공할 수 없는 경우에는 서비스 제공에 관한 책임을 지지 않습니다.
② 회사는 이용자의 귀책 사유로 인한 서비스 이용 장애에 대하여 책임을 지지 않습니다.
③ 회사는 업체 회원과 인력 회원 간에 발생한 분쟁에 대하여 중개 플랫폼으로서의 책임만을 부담하며, 실질적인 근로 계약 또는 용역 계약에서 발생하는 법적 책임은 당사자 간에 귀속됩니다.`,
  },
  {
    title: "제12조 (분쟁 해결)",
    content: `① 서비스 이용과 관련하여 회사와 이용자 간에 분쟁이 발생한 경우, 회사는 이용자의 불만 사항을 신속하게 처리하기 위해 최선을 다합니다.
② 이 약관과 관련된 분쟁에 대해서는 대한민국 법을 적용하며, 소송이 제기될 경우 회사의 소재지를 관할하는 법원을 전속 관할 법원으로 합니다.`,
  },
  {
    title: "부칙",
    content: `이 약관은 2026년 7월 1일부터 시행합니다.`,
  },
]

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* 헤더 */}
      <header className="border-b border-gray-100 bg-white sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-6 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <Shield className="w-6 h-6 text-blue-600" />
            <span className="text-lg font-bold text-gray-900">GuardOn</span>
          </Link>
          <Link href="/" className="text-sm text-gray-500 hover:text-gray-900 transition-colors">
            홈으로
          </Link>
        </div>
      </header>

      {/* 본문 */}
      <main className="max-w-4xl mx-auto px-6 py-12">
        <div className="mb-10">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">이용약관</h1>
          <p className="text-sm text-gray-500">최종 수정일: 2026년 7월 1일 | 시행일: 2026년 7월 1일</p>
        </div>

        {/* 요약 박스 */}
        <div className="bg-blue-50 border border-blue-100 rounded-xl p-5 mb-10">
          <p className="text-sm text-blue-800 leading-relaxed">
            GuardOn 서비스를 이용해 주셔서 감사합니다. 아래 약관은 GuardOn 플랫폼 이용에 관한 회사와 이용자 간의 권리·의무를 규정합니다.
            서비스에 가입하거나 이용함으로써 본 약관에 동의하는 것으로 간주됩니다.
          </p>
        </div>

        {/* 약관 조항 */}
        <div className="space-y-8">
          {SECTIONS.map((section) => (
            <section key={section.title}>
              <h2 className="text-base font-bold text-gray-900 mb-3">{section.title}</h2>
              <p className="text-sm text-gray-600 leading-relaxed whitespace-pre-line">{section.content}</p>
              <div className="mt-6 border-t border-gray-100" />
            </section>
          ))}
        </div>

        {/* 문의 */}
        <div className="mt-12 bg-gray-50 rounded-xl p-6">
          <h3 className="text-sm font-semibold text-gray-900 mb-2">약관 관련 문의</h3>
          <p className="text-sm text-gray-500 leading-relaxed">
            이용약관에 관한 문의 사항은 고객센터를 통해 접수해 주세요.<br />
            운영사: 주식회사 지360 | 이메일: support@guardon.kr
          </p>
        </div>

        {/* 하단 링크 */}
        <div className="mt-8 flex gap-4 text-sm">
          <Link href="/privacy" className="text-blue-600 hover:underline">개인정보처리방침</Link>
          <Link href="/" className="text-gray-500 hover:text-gray-900 transition-colors">홈으로 돌아가기</Link>
        </div>
      </main>

      {/* 푸터 */}
      <footer className="border-t border-gray-100 mt-12 py-6 px-6">
        <div className="max-w-4xl mx-auto flex justify-between items-center text-xs text-gray-400">
          <p>© 2026 GuardOn. All rights reserved.</p>
          <div className="flex gap-4">
            <Link href="/privacy" className="hover:text-gray-700 transition-colors">개인정보처리방침</Link>
            <Link href="/terms" className="hover:text-gray-700 transition-colors">이용약관</Link>
          </div>
        </div>
      </footer>
    </div>
  )
}
