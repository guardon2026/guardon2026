(()=>{var e={};e.id=385,e.ids=[385],e.modules={72934:e=>{"use strict";e.exports=require("next/dist/client/components/action-async-storage.external.js")},54580:e=>{"use strict";e.exports=require("next/dist/client/components/request-async-storage.external.js")},45869:e=>{"use strict";e.exports=require("next/dist/client/components/static-generation-async-storage.external.js")},20399:e=>{"use strict";e.exports=require("next/dist/compiled/next-server/app-page.runtime.prod.js")},55315:e=>{"use strict";e.exports=require("path")},17360:e=>{"use strict";e.exports=require("url")},26475:(e,t,r)=>{"use strict";r.r(t),r.d(t,{GlobalError:()=>i.a,__next_app__:()=>x,originalPathname:()=>u,pages:()=>d,routeModule:()=>m,tree:()=>c}),r(23852),r(32029),r(35866);var s=r(23191),a=r(88716),n=r(37922),i=r.n(n),l=r(95231),o={};for(let e in l)0>["default","tree","pages","GlobalError","originalPathname","__next_app__","routeModule"].indexOf(e)&&(o[e]=()=>l[e]);r.d(t,o);let c=["",{children:["privacy",{children:["__PAGE__",{},{page:[()=>Promise.resolve().then(r.bind(r,23852)),"C:\\guardon\\guardon-main\\src\\app\\privacy\\page.tsx"]}]},{metadata:{icon:[async e=>(await Promise.resolve().then(r.bind(r,73881))).default(e)],apple:[],openGraph:[],twitter:[],manifest:void 0}}]},{layout:[()=>Promise.resolve().then(r.bind(r,32029)),"C:\\guardon\\guardon-main\\src\\app\\layout.tsx"],"not-found":[()=>Promise.resolve().then(r.t.bind(r,35866,23)),"next/dist/client/components/not-found-error"],metadata:{icon:[async e=>(await Promise.resolve().then(r.bind(r,73881))).default(e)],apple:[],openGraph:[],twitter:[],manifest:void 0}}],d=["C:\\guardon\\guardon-main\\src\\app\\privacy\\page.tsx"],u="/privacy/page",x={require:r,loadChunk:()=>Promise.resolve()},m=new s.AppPageRouteModule({definition:{kind:a.x.APP_PAGE,page:"/privacy/page",pathname:"/privacy",bundlePath:"",filename:"",appPaths:[]},userland:{loaderTree:c}})},97949:()=>{},69720:(e,t,r)=>{Promise.resolve().then(r.bind(r,637)),Promise.resolve().then(r.t.bind(r,79404,23))},40130:(e,t,r)=>{Promise.resolve().then(r.t.bind(r,12994,23)),Promise.resolve().then(r.t.bind(r,96114,23)),Promise.resolve().then(r.t.bind(r,9727,23)),Promise.resolve().then(r.t.bind(r,79671,23)),Promise.resolve().then(r.t.bind(r,41868,23)),Promise.resolve().then(r.t.bind(r,84759,23))},15414:(e,t,r)=>{"use strict";r.d(t,{Z:()=>c});var s=r(71159);let a=(...e)=>e.filter((e,t,r)=>!!e&&""!==e.trim()&&r.indexOf(e)===t).join(" ").trim(),n=e=>e.replace(/([a-z0-9])([A-Z])/g,"$1-$2").toLowerCase(),i=e=>e.replace(/^([A-Z])|[\s-_]+(\w)/g,(e,t,r)=>r?r.toUpperCase():t.toLowerCase()),l=e=>{let t=i(e);return t.charAt(0).toUpperCase()+t.slice(1)},o=(0,r(68570).createProxy)(String.raw`C:\guardon\guardon-main\node_modules\lucide-react\dist\esm\Icon.js#default`),c=(e,t)=>{let r=(0,s.forwardRef)(({className:r,...i},c)=>(0,s.createElement)(o,{ref:c,iconNode:t,className:a(`lucide-${n(l(e))}`,`lucide-${e}`,r),...i}));return r.displayName=l(e),r}},83218:(e,t,r)=>{"use strict";r.d(t,{Z:()=>s});let s=(0,r(15414).Z)("shield",[["path",{d:"M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z",key:"oel41y"}]])},57371:(e,t,r)=>{"use strict";r.d(t,{default:()=>a.a});var s=r(670),a=r.n(s)},670:(e,t,r)=>{"use strict";let{createProxy:s}=r(68570);e.exports=s("C:\\guardon\\guardon-main\\node_modules\\next\\dist\\client\\link.js")},38238:(e,t)=>{"use strict";Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"ReflectAdapter",{enumerable:!0,get:function(){return r}});class r{static get(e,t,r){let s=Reflect.get(e,t,r);return"function"==typeof s?s.bind(e):s}static set(e,t,r,s){return Reflect.set(e,t,r,s)}static has(e,t){return Reflect.has(e,t)}static deleteProperty(e,t){return Reflect.deleteProperty(e,t)}}},95014:(e,t)=>{"use strict";function r(e,t){let r;let s=e.split("/");return(t||[]).some(t=>!!s[1]&&s[1].toLowerCase()===t.toLowerCase()&&(r=t,s.splice(1,1),e=s.join("/")||"/",!0)),{pathname:e,detectedLocale:r}}Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"normalizeLocalePath",{enumerable:!0,get:function(){return r}})},37847:(e,t)=>{"use strict";function r(e){return e.replace(/\/$/,"")||"/"}Object.defineProperty(t,"__esModule",{value:!0}),Object.defineProperty(t,"removeTrailingSlash",{enumerable:!0,get:function(){return r}})},32029:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>n,metadata:()=>a});var s=r(19510);r(47537),r(42211),r(5023);let a={title:"GuardOn",description:"경비\xb7보안 인력 긴급 매칭 플랫폼"};function n({children:e}){return s.jsx("html",{lang:"ko",children:s.jsx("body",{className:"font-sans antialiased bg-white text-gray-900",children:e})})}},23852:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>o,metadata:()=>i});var s=r(19510),a=r(57371),n=r(83218);let i={title:"개인정보처리방침 | GuardOn",description:"GuardOn 개인정보처리방침"},l=[{title:"제1조 (개인정보의 처리 목적)",content:`주식회사 지360(이하 "회사")은 다음의 목적을 위하여 개인정보를 처리합니다. 처리하는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경될 경우에는 개인정보 보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행합니다.

① 회원 가입 및 관리
   회원 가입 의사 확인, 회원제 서비스 제공에 따른 본인 식별\xb7인증, 회원자격 유지\xb7관리, 서비스 부정 이용 방지, 만 14세 미만 아동의 가입 제한

② 서비스 제공
   인력 매칭 서비스 제공, SOS 긴급 배치 서비스 운영, 위치 기반 서비스 제공, 자격증 인증 뱃지 발급, 이용 이력 관리

③ 고충 처리
   민원인 신원 확인, 민원사항 확인, 사실 조사를 위한 연락\xb7통지, 처리 결과 통보

④ 마케팅 및 광고 활용 (별도 동의 시)
   이벤트 및 공지사항 안내, 맞춤형 서비스 추천`},{title:"제2조 (처리하는 개인정보 항목)",content:`① 업체 회원
   - 필수: 이름, 이메일 주소, 휴대폰 번호, 사업자등록번호, 경비업 허가번호, 회사명, 대표자명
   - 선택: 회사 주소, 담당자 직책, 프로필 사진

② 인력 회원
   - 필수: 이름, 이메일 주소, 휴대폰 번호, 생년월일, 현 거주지 주소
   - 선택: 자격증 정보, 경력 사항, 프로필 사진, 가용 위치 정보

③ 카카오 소셜 로그인 이용 시
   - 카카오 계정 이메일, 닉네임, 프로필 사진 (제공 동의 항목에 한함)

④ 서비스 이용 과정에서 자동 수집되는 정보
   - IP 주소, 쿠키, 서비스 이용 기록, 접속 로그, 기기 정보`},{title:"제3조 (개인정보의 처리 및 보유 기간)",content:`① 회사는 법령에 따른 개인정보 보유\xb7이용 기간 또는 정보 주체로부터 개인정보를 수집 시에 동의 받은 개인정보 보유\xb7이용 기간 내에서 개인정보를 처리\xb7보유합니다.

② 각 개인정보 처리 및 보유 기간은 다음과 같습니다.
   - 회원 가입 및 관리: 회원 탈퇴 시까지 (단, 관련 법령에 따른 보존 의무가 있는 경우 해당 기간까지)
   - 전자상거래 관련 기록: 5년 (전자상거래법)
   - 소비자 불만\xb7분쟁 처리 기록: 3년 (전자상거래법)
   - 접속 로그 기록: 3개월 (통신비밀보호법)`},{title:"제4조 (개인정보의 제3자 제공)",content:`① 회사는 정보 주체의 개인정보를 제1조(개인정보의 처리 목적)에서 명시한 범위 내에서만 처리하며, 정보 주체의 동의, 법률의 특별한 규정 등 개인정보 보호법 제17조에 해당하는 경우에만 개인정보를 제3자에게 제공합니다.

② 매칭 서비스 특성상 다음의 경우 상대방에게 필요한 정보가 제공됩니다.
   - 업체 회원 → 인력 회원: 매칭 확정 시 업체명, 근무지 주소, 담당자 연락처
   - 인력 회원 → 업체 회원: 매칭 수락 시 이름, 자격증 정보, 연락처

③ 위 정보 제공은 서비스 이용 약관 동의 및 매칭 서비스 이용 동의 시 함께 동의한 것으로 처리됩니다.`},{title:"제5조 (개인정보 처리 위탁)",content:`① 회사는 원활한 서비스 제공을 위해 다음과 같이 개인정보 처리 업무를 위탁하고 있습니다.

   - 수탁업체: 카카오(주) | 위탁 업무: 카카오 소셜 로그인 인증
   - 수탁업체: 솔라피(SOLAPI) | 위탁 업무: SMS\xb7알림톡 발송
   - 수탁업체: Amazon Web Services | 위탁 업무: 클라우드 인프라 운영 및 데이터 보관

② 회사는 위탁 계약 체결 시 개인정보 보호법 제26조에 따라 위탁 업무 수행 목적 외 개인정보 처리 금지, 기술적\xb7관리적 보호조치, 재위탁 제한 등을 규정하며 이를 감독합니다.`},{title:"제6조 (정보 주체의 권리\xb7의무 및 행사 방법)",content:`① 정보 주체는 회사에 대해 언제든지 다음 각 호의 개인정보 보호 관련 권리를 행사할 수 있습니다.
   1. 개인정보 열람 요구
   2. 오류 등이 있을 경우 정정 요구
   3. 삭제 요구
   4. 처리 정지 요구

② 위 권리 행사는 회사에 대해 서면, 이메일, 고객센터를 통해 하실 수 있으며 회사는 이에 대해 지체 없이 조치합니다.

③ 만 14세 미만 아동의 개인정보 처리 시 법정대리인이 권리를 행사할 수 있습니다.`},{title:"제7조 (처리하는 개인정보 항목의 안전성 확보 조치)",content:`회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다.

① 관리적 조치: 내부 관리 계획 수립\xb7시행, 정기적 직원 교육
② 기술적 조치: 개인정보 처리 시스템 접근 권한 관리, 접근 통제 시스템 설치, 개인정보 암호화(AES-256), 보안 프로그램 설치 및 갱신
③ 물리적 조치: 전산실\xb7자료 보관실 접근 통제`},{title:"제8조 (개인정보 자동 수집 장치의 설치\xb7운영 및 거부)",content:`① 회사는 이용자에게 개별적인 맞춤 서비스를 제공하기 위해 이용 정보를 저장하고 수시로 불러오는 쿠키(cookie)를 사용합니다.

② 쿠키는 웹사이트를 운영하는 데 이용되는 서버가 이용자의 컴퓨터 브라우저에게 보내는 소량의 정보이며 이용자의 기기에 저장됩니다.

③ 이용자는 쿠키 설치에 대한 선택권을 가지고 있습니다. 웹 브라우저 옵션을 통해 모든 쿠키를 허용하거나, 쿠키가 저장될 때마다 확인을 거치거나, 모든 쿠키 저장을 거부하도록 설정할 수 있습니다.

④ 쿠키 저장을 거부할 경우 일부 서비스 이용에 어려움이 있을 수 있습니다.`},{title:"제9조 (개인정보 보호책임자)",content:`① 회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 정보 주체의 개인정보 관련 불만 처리 및 피해 구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다.

   - 성명: 개인정보 보호책임자
   - 소속: 주식회사 지360
   - 이메일: privacy@guardon.kr

② 정보 주체는 회사의 서비스를 이용하시면서 발생한 모든 개인정보 보호 관련 문의, 불만 처리, 피해 구제 등에 관한 사항을 개인정보 보호책임자에게 문의할 수 있습니다.`},{title:"제10조 (개인정보 열람 청구)",content:`정보 주체는 개인정보 보호법 제35조에 따른 개인정보의 열람 청구를 아래의 부서에 할 수 있습니다. 회사는 정보 주체의 개인정보 열람 청구가 신속하게 처리되도록 노력하겠습니다.

   - 부서명: 고객지원팀
   - 이메일: support@guardon.kr`},{title:"제11조 (권익 침해 구제 방법)",content:`정보 주체는 아래의 기관에 개인정보 침해에 대한 피해 구제, 상담 등을 문의할 수 있습니다.

   - 개인정보 침해신고센터: (국번없이) 118 | privacy.kisa.or.kr
   - 개인정보 분쟁조정위원회: 1833-6972 | www.kopico.go.kr
   - 대검찰청 사이버수사과: (국번없이) 1301 | www.spo.go.kr
   - 경찰청 사이버수사국: (국번없이) 182 | ecrm.cyber.go.kr`},{title:"부칙",content:`이 개인정보처리방침은 2026년 7월 1일부터 시행됩니다.`}];function o(){return(0,s.jsxs)("div",{className:"min-h-screen bg-white",children:[s.jsx("header",{className:"border-b border-gray-100 bg-white sticky top-0 z-10",children:(0,s.jsxs)("div",{className:"max-w-4xl mx-auto px-6 h-16 flex items-center justify-between",children:[(0,s.jsxs)(a.default,{href:"/",className:"flex items-center gap-2",children:[s.jsx(n.Z,{className:"w-6 h-6 text-blue-600"}),s.jsx("span",{className:"text-lg font-bold text-gray-900",children:"GuardOn"})]}),s.jsx(a.default,{href:"/",className:"text-sm text-gray-500 hover:text-gray-900 transition-colors",children:"홈으로"})]})}),(0,s.jsxs)("main",{className:"max-w-4xl mx-auto px-6 py-12",children:[(0,s.jsxs)("div",{className:"mb-10",children:[s.jsx("h1",{className:"text-3xl font-bold text-gray-900 mb-2",children:"개인정보처리방침"}),s.jsx("p",{className:"text-sm text-gray-500",children:"최종 수정일: 2026년 7월 1일 | 시행일: 2026년 7월 1일"})]}),s.jsx("div",{className:"bg-blue-50 border border-blue-100 rounded-xl p-5 mb-10",children:s.jsx("p",{className:"text-sm text-blue-800 leading-relaxed",children:"주식회사 지360은 개인정보 보호법 등 관련 법령상의 개인정보 보호 규정을 준수하며, 이용자의 개인정보 보호에 최선을 다하고 있습니다. 본 방침을 통해 수집하는 개인정보의 항목, 이용 목적, 보관 기간 및 이용자의 권리를 안내드립니다."})}),s.jsx("div",{className:"space-y-8",children:l.map(e=>(0,s.jsxs)("section",{children:[s.jsx("h2",{className:"text-base font-bold text-gray-900 mb-3",children:e.title}),s.jsx("p",{className:"text-sm text-gray-600 leading-relaxed whitespace-pre-line",children:e.content}),s.jsx("div",{className:"mt-6 border-t border-gray-100"})]},e.title))}),(0,s.jsxs)("div",{className:"mt-12 bg-gray-50 rounded-xl p-6",children:[s.jsx("h3",{className:"text-sm font-semibold text-gray-900 mb-2",children:"개인정보 관련 문의"}),(0,s.jsxs)("p",{className:"text-sm text-gray-500 leading-relaxed",children:["개인정보처리방침에 관한 문의 사항은 아래로 연락해 주세요.",s.jsx("br",{}),"운영사: 주식회사 지360 | 개인정보 보호 이메일: privacy@guardon.kr"]})]}),(0,s.jsxs)("div",{className:"mt-8 flex gap-4 text-sm",children:[s.jsx(a.default,{href:"/terms",className:"text-blue-600 hover:underline",children:"이용약관"}),s.jsx(a.default,{href:"/",className:"text-gray-500 hover:text-gray-900 transition-colors",children:"홈으로 돌아가기"})]})]}),s.jsx("footer",{className:"border-t border-gray-100 mt-12 py-6 px-6",children:(0,s.jsxs)("div",{className:"max-w-4xl mx-auto flex justify-between items-center text-xs text-gray-400",children:[s.jsx("p",{children:"\xa9 2026 GuardOn. All rights reserved."}),(0,s.jsxs)("div",{className:"flex gap-4",children:[s.jsx(a.default,{href:"/privacy",className:"hover:text-gray-700 transition-colors",children:"개인정보처리방침"}),s.jsx(a.default,{href:"/terms",className:"hover:text-gray-700 transition-colors",children:"이용약관"})]})]})})]})}},73881:(e,t,r)=>{"use strict";r.r(t),r.d(t,{default:()=>a});var s=r(66621);let a=e=>[{type:"image/x-icon",sizes:"16x16",url:(0,s.fillMetadataSegment)(".",e.params,"favicon.ico")+""}]},5023:()=>{}};var t=require("../../webpack-runtime.js");t.C(e);var r=e=>t(t.s=e),s=t.X(0,[8948,6947,873,9404],()=>r(26475));module.exports=s})();