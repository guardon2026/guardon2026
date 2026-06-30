export const WORK_FIELD_LABELS = {
  GENERAL_SECURITY:     "일반경비",
  BODYGUARD_SERVICE:    "신변보호",
  SPECIAL_SECURITY:     "특수경비",
  KRAV_MAGA_INSTRUCTOR: "크라브마가강사",
  EVENT_SECURITY:       "행사경비",
} as const

export type WorkFieldKey = keyof typeof WORK_FIELD_LABELS

// ─────────────────────────────────────────
// 경비원 프로필 편집 상수
// ─────────────────────────────────────────

export const WORKER_PROFILE = {
  PAGE_TITLE:   "프로필 편집",
  PAGE_SUBTITLE: "업무 분야와 경력 정보를 입력해 주세요.",

  FIELDS: {
    WORK_FIELDS_LABEL:       "업무 분야",
    WORK_FIELDS_HINT:        "해당하는 업무 분야를 모두 선택해 주세요.",
    EXPERIENCE_LABEL:        "경력 연수",
    EXPERIENCE_PLACEHOLDER:  "예) 5",
    EXPERIENCE_UNIT:         "년",
    ADDRESS_LABEL:           "주소",
    ADDRESS_PLACEHOLDER:     "도로명 주소를 입력해 주세요.",
    CITY_LABEL:              "시·도",
    CITY_PLACEHOLDER:        "예) 서울특별시",
    DISTRICT_LABEL:          "구·군",
    DISTRICT_PLACEHOLDER:    "예) 강남구",
    LATITUDE_LABEL:          "위도 (선택)",
    LATITUDE_PLACEHOLDER:    "예) 37.4979",
    LONGITUDE_LABEL:         "경도 (선택)",
    LONGITUDE_PLACEHOLDER:   "예) 127.0276",
    HOURLY_RATE_LABEL:       "희망 시급 (선택)",
    HOURLY_RATE_PLACEHOLDER: "예) 12000",
    HOURLY_RATE_UNIT:        "원",
    BIO_LABEL:               "자기소개 (선택)",
    BIO_PLACEHOLDER:         "경력, 특기, 가용 지역 등을 자유롭게 소개해 주세요.",
  },

  SUBMIT_BUTTON: "저장하기",
  SUBMITTING:    "저장 중...",

  SUCCESS: "프로필이 성공적으로 저장되었습니다.",

  ERROR: {
    WORK_FIELDS_REQUIRED:  "업무 분야를 하나 이상 선택해 주세요.",
    ADDRESS_REQUIRED:      "주소를 입력해 주세요.",
    CITY_REQUIRED:         "시·도를 입력해 주세요.",
    DISTRICT_REQUIRED:     "구·군을 입력해 주세요.",
    EXPERIENCE_INVALID:    "경력 연수는 0 이상의 숫자를 입력해 주세요.",
    HOURLY_RATE_INVALID:   "희망 시급은 0 이상의 숫자를 입력해 주세요.",
    SAVE_FAILED:           "저장에 실패했습니다. 잠시 후 다시 시도해 주세요.",
  },
} as const

// ─────────────────────────────────────────
// 공개 프로필 페이지 상수
// ─────────────────────────────────────────

export const WORKER_PUBLIC_PROFILE = {
  PAGE_TITLE:           "내 프로필",
  EDIT_BUTTON:          "프로필 편집",
  NO_PROFILE_HEADING:   "아직 프로필이 등록되지 않았습니다.",
  NO_PROFILE_BODY:      "프로필을 등록하면 업체에서 찾아볼 수 있습니다.",
  NO_PROFILE_BUTTON:    "프로필 등록하기",
  EXPERIENCE_LABEL:     "경력",
  EXPERIENCE_UNIT:      "년",
  WORK_FIELDS_LABEL:    "업무 분야",
  CREDENTIALS_LABEL:    "보유 자격증",
  NO_CREDENTIALS:       "등록된 자격증이 없습니다.",
  HOURLY_RATE_LABEL:    "희망 시급",
  HOURLY_RATE_UNIT:     "원/시간",
  BIO_LABEL:            "자기소개",
  RATING_LABEL:         "평점",
  RATING_UNIT:          "점",
  TOTAL_MATCHES_LABEL:  "매칭 횟수",
  TOTAL_MATCHES_UNIT:   "회",
} as const

export const CREDENTIAL_LABELS = {
  // MVP 자격증
  SECURITY_INSTRUCTOR: "경비지도사",
  BODYGUARD:           "신변보호사",
  SECURITY_TRAINING:   "신임교육이수",
  SPECIAL_SECURITY:    "특수경비원",
  // Growth Phase 2 자격증 (schema CredentialType enum에 이미 정의됨)
  CIVIL_POLICE:        "청원경찰",
  KRAV_MAGA:           "크라브마가",
} as const

export type CredentialTypeKey = keyof typeof CREDENTIAL_LABELS

export const CREDENTIAL_STATE_TOOLTIPS = {
  VERIFIED: "인증 완료",
  PENDING: "관리자 심사 중입니다",
  UNVERIFIED: "인증 대기 중",
} as const

export const AVAILABILITY_LABELS = {
  AVAILABLE: "가용",
  UNAVAILABLE: "미가용",
  BUSY: "배치 중",
} as const

export type AvailabilityStatusKey = keyof typeof AVAILABILITY_LABELS

export const AVAILABILITY_TOGGLE_LABELS = {
  SET_AVAILABLE:   "가용으로 변경하기",
  SET_UNAVAILABLE: "비가용으로 변경하기",
  UPDATING:        "변경 중...",
  UPDATE_SUCCESS:  "가용 상태가 변경되었습니다.",
  UPDATE_FAILED:   "상태 변경 중 오류가 발생했습니다. 다시 시도해 주세요.",
} as const

export const BUTTON_LABELS = {
  SAVE: "저장하기",
  SEARCH: "인력 검색",
  SOS: "SOS 발송",
  CONTACT: "연락하기",
  SAVING: "저장 중...",
  SENDING: "발송 중...",
} as const

export const ERROR_MESSAGES = {
  SERVER: "일시적인 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  UNAUTHORIZED: "접근 권한이 없습니다. 로그인 상태를 확인해 주세요.",
  LICENSE_REQUIRED: "경비업 허가번호를 입력해야 가입할 수 있습니다.",
  REQUIRED_FIELD: (fieldName: string) => `${fieldName}을(를) 입력해 주세요.`,
} as const

export const EMPTY_STATE = {
  HEADING: "아직 등록된 내용이 없습니다",
  BODY: "버튼을 눌러 시작하세요.",
} as const

// ─────────────────────────────────────────
// 인증 관련 상수
// ─────────────────────────────────────────

export const AUTH = {
  loginTitle: "GuardOn",
  loginSubtitle: "경비 인력 매칭 플랫폼",
  kakaoLoginBtn: "카카오로 시작하기",
  kakaoLoginLoading: "로그인 중...",
  onboardingTitle: "어떤 역할로 시작하시나요?",
  roleCompanyOwner: "업체 대표",
  roleCompanyOwnerDesc: "인력을 검색하고 SOS 요청을 보냅니다",
  roleWorker: "경비 인력",
  roleWorkerDesc: "프로필을 등록하고 SOS 요청을 수락합니다",
  consentTitle: "약관 동의",
  consentPersonalInfo: "[필수] 개인정보 수집·이용 동의",
  consentLocation: "[필수] 위치정보 수집·이용 동의",
  consentTerms: "[필수] 이용약관 동의",
  consentSubmitBtn: "동의하고 계속하기",
  consentRequiredAlert: "모든 필수 항목에 동의해 주세요.",
  devLoginTitle: "[개발 전용] 역할 선택",
  devLoginDesc: "이 페이지는 개발 환경에서만 접근할 수 있습니다.",
  devRoleCompanyOwner: "업체 대표로 접속",
  devRoleWorker: "경비 인력으로 접속",
  devRoleAdmin: "관리자로 접속",
  devRoleReset: "로그아웃 (쿠키 삭제)",
} as const

// ─────────────────────────────────────────
// COMPANY ONBOARDING 상수
// ─────────────────────────────────────────

export const COMPANY_ONBOARDING = {
  PAGE_TITLE: "업체 등록",
  PAGE_SUBTITLE: "경비업 허가번호와 업체 정보를 입력해 주세요.",

  FIELDS: {
    NAME_LABEL:           "업체명",
    NAME_PLACEHOLDER:     "예) 한국경비주식회사",
    LICENSE_LABEL:        "경비업 허가번호",
    LICENSE_PLACEHOLDER:  "예) 2024-서울-0001",
    LICENSE_HINT:         "경비업법에 따른 허가번호를 입력해 주세요. (숫자, 하이픈 허용)",
    ADDRESS_LABEL:        "주소",
    ADDRESS_PLACEHOLDER:  "도로명 주소를 입력해 주세요.",
    CITY_LABEL:           "시·도",
    CITY_PLACEHOLDER:     "예) 서울특별시",
    DISTRICT_LABEL:       "구·군",
    DISTRICT_PLACEHOLDER: "예) 강남구",
    PHONE_LABEL:          "대표 연락처",
    PHONE_PLACEHOLDER:    "예) 02-1234-5678",
    DESCRIPTION_LABEL:    "업체 소개 (선택)",
    DESCRIPTION_PLACEHOLDER: "업체를 간략히 소개해 주세요.",
  },

  SUBMIT_BUTTON: "업체 등록 신청",
  SUBMITTING:    "등록 신청 중...",

  ERROR: {
    NAME_REQUIRED:      "업체명을 입력해 주세요.",
    LICENSE_REQUIRED:   "경비업 허가번호를 입력해 주세요.",
    LICENSE_FORMAT:     "허가번호 형식이 올바르지 않습니다. (예: 2024-서울-0001, 숫자와 하이픈만 허용)",
    ADDRESS_REQUIRED:   "주소를 입력해 주세요.",
    CITY_REQUIRED:      "시·도를 입력해 주세요.",
    DISTRICT_REQUIRED:  "구·군을 입력해 주세요.",
    PHONE_REQUIRED:     "대표 연락처를 입력해 주세요.",
    LICENSE_DUPLICATE:  "이미 등록된 허가번호입니다. 확인 후 다시 시도해 주세요.",
    ALREADY_REGISTERED: "이미 업체가 등록되어 있습니다.",
  },
} as const

export const COMPANY_PENDING = {
  PAGE_TITLE:   "심사 대기 중",
  HEADING:      "업체 등록 신청이 완료되었습니다.",
  BODY:         "관리자 심사 후 서비스를 이용하실 수 있습니다. 심사는 영업일 기준 1~2일 내 완료됩니다.",
  STATUS_LABEL: "현재 상태",
  STATUS_BADGE: {
    PENDING:  "심사 중",
    APPROVED: "승인 완료",
    REJECTED: "반려",
  },
  REJECTED_NOTICE: "업체 등록이 반려되었습니다. 관리자에게 문의해 주세요.",
} as const

export const COMPANY_STATUS_LABELS: Record<string, string> = {
  PENDING:  "심사 중",
  APPROVED: "승인 완료",
  REJECTED: "반려",
}

// ─────────────────────────────────────────
// 자격증 관리 페이지 상수
// ─────────────────────────────────────────

// ─────────────────────────────────────────
// 인력 검색 페이지 상수
// ─────────────────────────────────────────

export const SEARCH_LABELS = {
  PAGE_TITLE:   "인력 검색",
  PAGE_SUBTITLE: "조건에 맞는 경비 인력을 찾아보세요.",

  FILTER: {
    LAT_LABEL:          "위도",
    LAT_PLACEHOLDER:    "예) 37.4979",
    LNG_LABEL:          "경도",
    LNG_PLACEHOLDER:    "예) 127.0276",
    RADIUS_LABEL:       "검색 반경 (km)",
    RADIUS_PLACEHOLDER: "예) 20",
    WORK_FIELD_LABEL:   "업무 분야",
    WORK_FIELD_ALL:     "전체",
    CREDENTIAL_LABEL:   "자격증 종류",
    CREDENTIAL_ALL:     "전체",
    EXPERIENCE_LABEL:   "최소 경력 (년)",
    EXPERIENCE_PLACEHOLDER: "예) 0",
    SEARCH_BUTTON:      "검색하기",
    SEARCHING:          "검색 중...",
  },

  RESULT: {
    HEADING:          "검색 결과",
    EMPTY:            "조건에 맞는 인력이 없습니다.",
    EMPTY_HINT:       "검색 반경을 넓히거나 조건을 변경해 보세요.",
    COUNT:            (n: number) => `총 ${n}명`,
    EXPERIENCE_UNIT:  "년 경력",
    RATING_LABEL:     "평점",
    DISTANCE_M:       (m: number) =>
      m >= 1000 ? `${(m / 1000).toFixed(1)}km` : `${m}m`,
    PROFILE_LINK:     "프로필 보기",
  },

  ERROR: {
    LAT_REQUIRED: "위도를 입력해 주세요.",
    LNG_REQUIRED: "경도를 입력해 주세요.",
    SEARCH_FAILED: "검색 중 오류가 발생했습니다. 잠시 후 다시 시도해 주세요.",
  },
} as const

// ─────────────────────────────────────────
// SOS 요청 등록 폼 상수
// ─────────────────────────────────────────

export const SOS_FORM = {
  PAGE_TITLE:    "SOS 긴급 요청",
  PAGE_SUBTITLE: "긴급 배치가 필요한 경우 아래 정보를 입력해 주세요.",

  FIELDS: {
    TITLE_LABEL:          "요청 제목",
    TITLE_PLACEHOLDER:    "예) 강남구 행사 경비 긴급 충원",
    LOCATION_LABEL:       "집결지 주소",
    LOCATION_PLACEHOLDER: "집결지 도로명 주소를 입력해 주세요.",
    ADDRESS_LABEL:        "집결지 주소",
    ADDRESS_PLACEHOLDER:  "집결지 도로명 주소를 입력해 주세요.",
    LATITUDE_LABEL:       "위도 (선택)",
    LATITUDE_PLACEHOLDER: "예) 37.4979",
    LONGITUDE_LABEL:      "경도 (선택)",
    LONGITUDE_PLACEHOLDER:"예) 127.0276",
    SCHEDULED_AT_LABEL:   "배치 날짜·시간",
    SCHEDULED_DATE_LABEL: "배치 날짜",
    SCHEDULED_TIME_LABEL: "배치 시간",
    REQUIRED_COUNT_LABEL: "필요 인원",
    REQUIRED_COUNT_PLACEHOLDER: "예) 3",
    REQUIRED_COUNT_UNIT:  "명",
    REQUIRED_FIELDS_LABEL:"필요 업무 분야",
    REQUIRED_FIELDS_HINT: "해당 분야를 모두 선택해 주세요.",
    CREDENTIALS_LABEL:          "필요 자격증 (선택)",
    CREDENTIALS_HINT:           "필요한 자격증을 선택해 주세요.",
    REQUIRED_CREDENTIALS_LABEL: "필요 자격증 (선택)",
    REQUIRED_CREDENTIALS_HINT:  "필요한 자격증을 선택해 주세요.",
    HOURLY_RATE_LABEL:    "시급",
    HOURLY_RATE_PLACEHOLDER: "예) 12000",
    HOURLY_RATE_UNIT:     "원",
    DESCRIPTION_LABEL:    "추가 설명 (선택)",
    DESCRIPTION_PLACEHOLDER: "업무 내용, 복장, 준비물 등을 입력해 주세요.",
  },

  SUBMIT_BUTTON: "SOS 발송",
  SUBMITTING:    "발송 중...",

  SUCCESS: "SOS 요청이 발송되었습니다. 인근 인력에게 알림을 전송 중입니다.",

  ERROR: {
    TITLE_REQUIRED:          "요청 제목을 입력해 주세요.",
    LOCATION_REQUIRED:       "집결지 주소를 입력해 주세요.",
    ADDRESS_REQUIRED:        "집결지 주소를 입력해 주세요.",
    SCHEDULED_AT_REQUIRED:   "배치 날짜·시간을 입력해 주세요.",
    REQUIRED_COUNT_INVALID:  "필요 인원은 1명 이상이어야 합니다.",
    REQUIRED_FIELDS_REQUIRED:"필요 업무 분야를 하나 이상 선택해 주세요.",
    HOURLY_RATE_INVALID:     "시급은 0원 이상이어야 합니다.",
    SUBMIT_FAILED:           "SOS 발송에 실패했습니다. 잠시 후 다시 시도해 주세요.",
  },
} as const

// ─────────────────────────────────────────
// SOS 상태 레이블
// ─────────────────────────────────────────

export const SOS_STATUS_LABELS: Record<string, string> = {
  DISPATCHING: "알림 발송 중",
  PENDING:     "수락 대기",
  CONFIRMED:   "확정",
  UNRESOLVED:  "미해결",
  CANCELLED:   "취소",
  COMPLETED:   "완료",
}

export const SOS_MATCH_STATUS_LABELS: Record<string, string> = {
  NOTIFIED:  "알림 발송",
  ACCEPTED:  "수락",
  REJECTED:  "거절",
  CONFIRMED: "확정",
}

// ─────────────────────────────────────────
// SOS 상세 페이지 상수
// ─────────────────────────────────────────

export const SOS_DETAIL = {
  PAGE_TITLE:            "SOS 요청 상세",
  LOCATION_LABEL:        "집결지",
  SCHEDULED_AT_LABEL:    "배치 일시",
  REQUIRED_COUNT_LABEL:  "필요 인원",
  REQUIRED_COUNT_UNIT:   "명",
  HOURLY_RATE_LABEL:     "시급",
  HOURLY_RATE_UNIT:      "원/시간",
  WORK_FIELDS_LABEL:     "업무 분야",
  CREDENTIALS_LABEL:     "필요 자격증",
  DESCRIPTION_LABEL:     "설명",
  MATCH_SECTION_TITLE:   "매칭 현황",
  NO_MATCHES:            "아직 매칭된 인력이 없습니다.",
  CONFIRM_BUTTON:        "최종 확정",
  CONFIRMING:            "확정 중...",
  CONFIRM_SUCCESS:       "인력이 최종 확정되었습니다.",
  CONFIRM_FAILED:        "확정 처리 중 오류가 발생했습니다. 다시 시도해 주세요.",
  BACK_BUTTON:           "목록으로",
  NEW_SOS_BUTTON:        "새 SOS 요청",
} as const

// ─────────────────────────────────────────
// SOS 알림 페이지 상수
// ─────────────────────────────────────────

export const SOS_NOTIFICATION_LABELS = {
  PAGE_TITLE:    "SOS 알림",
  PAGE_SUBTITLE: "접수된 긴급 배치 요청을 확인하고 수락하세요.",
  ACCEPT_BUTTON: "수락",
  REJECT_BUTTON: "거절",
  ACCEPTING:     "수락 중...",
  REJECTING:     "거절 중...",
  ACCEPT_SUCCESS:"요청을 수락했습니다. 업체의 최종 확정을 기다려 주세요.",
  REJECT_SUCCESS:"요청을 거절했습니다.",
  ACTION_FAILED: "처리 중 오류가 발생했습니다. 다시 시도해 주세요.",

  SECTION: {
    NEW:      "새 요청",
    ACCEPTED: "수락한 요청",
    REJECTED: "거절한 요청",
  },

  CARD: {
    SCHEDULED_AT_LABEL:   "배치 일시",
    LOCATION_LABEL:       "집결지",
    HOURLY_RATE_LABEL:    "시급",
    HOURLY_RATE_UNIT:     "원/시간",
    CREDENTIALS_LABEL:    "필요 자격증",
  },

  EMPTY: "접수된 SOS 알림이 없습니다.",
} as const

// ─────────────────────────────────────────
// 이력 페이지 상수
// ─────────────────────────────────────────

export const HISTORY_LABELS = {
  COMPANY: {
    PAGE_TITLE:    "SOS 요청 이력",
    PAGE_SUBTITLE: "지금까지 발송한 SOS 요청 내역입니다.",
    EMPTY:         "아직 SOS 요청 이력이 없습니다.",
    MATCH_COUNT:   (n: number) => `확정 인력 ${n}명`,
  },
  WORKER: {
    PAGE_TITLE:    "배치 이력",
    PAGE_SUBTITLE: "확정된 배치 요청 내역입니다.",
    EMPTY:         "아직 배치 이력이 없습니다.",
    COMPANY_LABEL: "업체",
    HOURLY_RATE_LABEL: "시급",
    HOURLY_RATE_UNIT:  "원/시간",
    SCHEDULED_AT_LABEL:"배치 일시",
  },
} as const

// ─────────────────────────────────────────
// 관리자 대시보드 상수
// ─────────────────────────────────────────

export const ADMIN_LABELS = {
  PAGE_TITLE: "관리자 대시보드",
  COMPANY_MANAGEMENT: "업체 관리",
  CREDENTIAL_REVIEW: "자격증 심사",
  SOS_MONITOR: "SOS 모니터",
  STATS: "통계",
  TAB_ALL: "전체",
  TAB_PENDING: "심사 대기",
  TAB_APPROVED: "승인",
  TAB_REJECTED: "반려",
  APPROVE: "승인",
  REJECT: "반려",
  REJECT_CONFIRM: "반려 확정",
  REJECTION_REASON_PLACEHOLDER: "반려 사유를 입력해 주세요.",
  REJECTION_REASON_REQUIRED: "반려 사유를 입력해야 합니다.",
  DOCUMENT_VIEW: "서류 확인",
  PENDING_COUNT: (n: number) => `${n}건 대기`,
  EMPTY_PENDING: "심사 대기 자격증이 없습니다.",
  APPROVE_SUCCESS: "자격증이 승인되었습니다.",
  REJECT_SUCCESS: "자격증이 반려되었습니다.",
  PENDING_COMPANIES_EMPTY: "심사 대기 업체가 없습니다.",

  // 통계 대시보드
  STATS_PAGE_TITLE: "운영 통계",
  STATS_COMPANY_CARD_TITLE: "업체 현황",
  STATS_WORKER_CARD_TITLE: "인력 현황",
  STATS_SOS_CARD_TITLE: "SOS 현황",
  STATS_QUICK_ACTIONS_TITLE: "빠른 액션",
  STATS_TOTAL_COMPANIES: "전체 등록 업체",
  STATS_PENDING_COMPANIES: "심사 대기",
  STATS_APPROVED_COMPANIES: "승인 업체",
  STATS_REJECTED_COMPANIES: "반려 업체",
  STATS_TOTAL_WORKERS: "전체 등록 인력",
  STATS_CERTIFIED_WORKERS: "자격증 인증 인력",
  STATS_TOTAL_SOS: "전체 SOS 요청",
  STATS_COMPLETED_SOS: "완료 건수",
  STATS_UNRESOLVED_SOS: "미해결 건수",
  STATS_ACTIVE_SOS: "진행 중",
  STATS_RESOLUTION_RATE: "해결률",
  STATS_UNIT_COMPANIES: "개",
  STATS_UNIT_WORKERS: "명",
  STATS_UNIT_SOS: "건",
  STATS_UNIT_PERCENT: "%",
  STATS_GOTO_PENDING_COMPANIES: "심사 대기 업체 확인",
  STATS_GOTO_CREDENTIALS: "자격증 심사 대기",

  // SOS 모니터
  SOS_MONITOR_PAGE_TITLE: "SOS 모니터 (최근 7일)",
  SOS_MONITOR_COL_COMPANY: "업체명",
  SOS_MONITOR_COL_TITLE: "제목",
  SOS_MONITOR_COL_STATUS: "상태",
  SOS_MONITOR_COL_MATCH_COUNT: "매칭 인원",
  SOS_MONITOR_COL_SCHEDULED_AT: "배치 날짜",
  SOS_MONITOR_COL_CREATED_AT: "등록일",
  SOS_MONITOR_EMPTY: "최근 7일 SOS 요청이 없습니다.",
} as const

export const CREDENTIAL_TYPE_LABELS: Record<string, string> = {
  SECURITY_SUPERVISOR:   "경비지도사",
  PERSONAL_PROTECTION:   "신변보호사",
  NEW_SECURITY_TRAINING: "신임경비교육이수",
  SPECIAL_SECURITY:      "특수경비원",
  // schema CredentialType enum 대응
  SECURITY_INSTRUCTOR:   "경비지도사",
  BODYGUARD:             "신변보호사",
  SECURITY_TRAINING:     "신임경비교육이수",
  CIVIL_POLICE:          "청원경찰",
  KRAV_MAGA:             "크라브마가",
}

export const LANDING = {
  NAV: {
    PROBLEM: "왜 GuardOn인가",
    FLOW:    "SOS 매칭",
    TRUST:   "자격 인증",
    USERS:   "업체 · 인력",
    PRICING: "요금",
    LOGIN:   "로그인",
    CTA:     "시작하기",
  },
  HERO: {
    EYEBROW: "대한민국 경비·보안 인력 업계 최초 B2B 매칭 레이어",
    TITLE_1: "결원이 생기면,",
    TITLE_2: "전화 대신",
    TITLE_ACCENT: "SOS",
    TITLE_3: "를 누르세요.",
    LEAD: "수주는 받았는데 인력이 없다 — 경비업계 6,005개 업체가 매번 카카오톡 단체방과 인맥으로 버텨온 문제입니다. GuardOn은 반경 내 검증된 가용 인력에게 즉시 알림을 보내, 평균 8분 안에 결원을 채웁니다.",
    CTA_PRIMARY: "지금 시작하기",
    CTA_SECONDARY: "SOS 매칭 살펴보기",
    PROOF_1_NUM: "5~6조",
    PROOF_1_LABEL: "경비·보안 인력 시장 규모",
    PROOF_2_NUM: "21.8만",
    PROOF_2_LABEL: "업계 종사 인력",
    PROOF_3_NUM: "25,000명",
    PROOF_3_LABEL: "초기 연동 인력 네트워크",
    CONSOLE_TAG: "SOS LIVE",
    CONSOLE_LABEL: "GUARDON DISPATCH",
    CONSOLE_LOC: "강남구 · VIP 행사 경호",
    CONSOLE_NEED: "필요 인원 2 · 반경 15km",
  },
  PROBLEM: {
    EYEBROW: "현재의 방식",
    TITLE: "\"누구 아는 사람 없어?\" — 이게 업계의 인력 수급 시스템입니다.",
    LEAD: "알바몬·사람인은 업체와 구직자를 연결할 뿐, 업체가 갑자기 인력이 빌 때 쓸 수 있는 긴급 채널이 없습니다. 크몽·숨고는 경비업 허가 검증도, 긴급 매칭 구조도 없습니다. 그 사이의 빈틈을 GuardOn이 메웁니다.",
    BEFORE_TAG: "BEFORE — 전화와 인맥",
    BEFORE_TITLE: "결원이 생기면 일이 멈춥니다",
    BEFORE_LIST: [
      "단체 카카오톡방에 올리고 응답을 기다린다",
      "지원자의 자격증·경력을 확인할 방법이 없다",
      "전화 돌리는 동안 행사·수주는 그대로 위태롭다",
      "같은 인력풀이 바닥나면 손쓸 방법이 없다",
    ],
    AFTER_TAG: "AFTER — GuardOn SOS",
    AFTER_TITLE: "등록 30초, 매칭 8분",
    AFTER_LIST: [
      "장소·날짜·필요 인원·자격증 조건만 입력하면 끝",
      "반경 내 가용·인증 인력에게 자동 알림 발송",
      "자격증 뱃지·경력·평점을 보고 바로 확정",
      "15분 내 미수락 시 반경 자동 확장으로 끝까지 대응",
    ],
  },
  FLOW: {
    EYEBROW: "SOS 긴급 매칭",
    TITLE: "실제 매칭 한 건이 진행되는 8분",
    LEAD: "서울 S경호 박성민 대표의 금요일 오후 — VIP 행사 수주 후 인력 2명이 비었습니다. 전화는 한 통도 걸지 않았습니다.",
    STEPS: [
      { time: "T+0:00", title: "SOS 등록", desc: "장소(강남구)·날짜·필요 인원(2명)·자격증 조건·시급을 입력하고 SOS 버튼을 누릅니다.", who: "업체 · S경호" },
      { time: "T+0:30", title: "반경 알림 자동 발송", desc: "반경 15km 내 가용 상태 ON, 조건에 맞는 인력 7명에게 카카오 알림톡이 즉시 전송됩니다.", who: "시스템 · 자동" },
      { time: "T+3:47", title: "인력, 알림 확인 후 수락", desc: "이재호 씨는 업체 프로필과 평점을 확인하고 수락 버튼을 누릅니다. 집결지 정보가 즉시 공유됩니다.", who: "인력 · 신변보호사" },
      { time: "T+8:00", title: "매칭 확정", desc: "자격증 뱃지·경력·평점을 확인한 박 대표가 최종 확정합니다. 전화 한 통 없이 인력 2명이 채워졌습니다.", who: "업체 · 확정 완료" },
      { time: "T+15:00", title: "미해결 시 — 반경 자동 확장", desc: "15분 내 수락이 없으면 반경을 50km로 자동 확장해 재알림을 보내고, 미해결 건은 관리자 대시보드에 표시됩니다.", who: "시스템 · 안전망" },
    ],
  },
  TRUST: {
    EYEBROW: "신뢰는 데이터로",
    TITLE: "\"아는 사람\"이 아니라, 검증된 자격증으로 판단하세요",
    LEAD: "인력은 자격증 서류를 업로드하고, 관리자가 24시간 이내 검토해 인증 뱃지를 발급합니다. 업체는 검색 단계에서부터 인증 여부를 필터로 사용할 수 있습니다.",
    BADGES: [
      { title: "경비지도사", org: "발급 — 경찰청" },
      { title: "신변보호사", org: "발급 — 대한경비협회" },
      { title: "신임경비교육 이수증", org: "발급 — 경비교육기관" },
      { title: "특수경비원", org: "발급 — 경찰청" },
    ],
    VERIFY: "서류 검증 완료",
  },
  USERS: {
    EYEBROW: "두 사용자, 하나의 매칭",
    TITLE: "업체에게는 안전망을, 인력에게는 꾸준한 일감을",
    TAB_COMPANY: "업체 대표용",
    TAB_WORKER: "경비원 · 인력용",
    COMPANY_FEATS: [
      { title: "SOS 긴급 매칭", desc: "장소·시간·자격증 조건만 입력하면 반경 내 가용 인력에게 자동 알림이 갑니다." },
      { title: "사전 인력 검색", desc: "지역·분야·자격증·경력으로 미리 인력 풀을 탐색하고 가용여부를 확인할 수 있습니다." },
      { title: "매칭 이력 관리", desc: "완료·미해결·취소 건을 모두 조회하고, 매칭 후 평점을 남겨 신뢰 데이터를 쌓습니다." },
    ],
    WORKER_FEATS: [
      { title: "가용 상태 ON / OFF", desc: "일할 수 있는 날엔 켜두기만 하면, 조건에 맞는 SOS 알림이 카카오톡으로 옵니다." },
      { title: "자격증 인증 뱃지", desc: "보유 자격증을 등록하면 업체 검색 결과에서 더 신뢰받는 프로필로 노출됩니다." },
      { title: "수락 한 번, 일정 확정", desc: "수락 버튼을 누르면 업체 연락처와 집결지 정보가 즉시 전달됩니다." },
    ],
  },
  STATS: [
    { num: "80%+", label: "SOS 요청 중 당일 인력 배치 목표 확정률" },
    { num: "5분",  label: "SOS 등록 후 가용 인력 목록 노출까지" },
    { num: "24h",  label: "자격증 서류 제출 후 인증 뱃지 발급 목표" },
    { num: "G360·KKM", label: "파트너 네트워크 기반 초기 인력 풀 확보" },
  ],
  PRICING: {
    EYEBROW: "요금",
    TITLE: "먼저 경험하고, 그다음 결정하세요",
    LEAD: "결원 한 건의 손실이 구독료보다 큽니다 — 그 가설을 직접 확인할 수 있도록 6개월 무료로 시작합니다.",
    BADGE: "베타 파트너 한정",
    PRICE: "6개월 무료",
    NOTE: "이후 월 99,000원 / 업체 (인력 계정은 계속 무료입니다)",
    LIST: [
      "SOS 긴급 매칭 무제한 등록",
      "인력 검색 · 필터 · 프로필 조회",
      "카카오 알림톡 실시간 알림 + SMS 폴백",
      "매칭 이력 · 평점 관리",
      "경비업 허가번호 기반 신뢰 인증 업체만 매칭",
    ],
    CTA: "베타 파트너 신청하기",
  },
  CLOSING: {
    EYEBROW: "G360 · KKM 파트너 우선 모집",
    TITLE: "다음 결원, 전화 대신 SOS로 해결하세요",
    LEAD: "베타 온보딩 10개사 한정 모집 중입니다. 가입 승인 후 바로 인력 검색과 SOS 매칭을 시작할 수 있습니다.",
    CTA_PRIMARY: "업체로 시작하기",
    CTA_SECONDARY: "인력으로 시작하기",
  },
  FOOTER: {
    LEGAL: "GuardOn은 직업정보 제공 서비스입니다. 「직업안정법」 제2조에 따라 업체와 인력 간 정보 연결을 제공하며, 고용의 주체는 각 경비업체입니다. 가입 시 경비업 허가번호 확인 및 관리자 승인 절차를 거칩니다. © 2026 GuardOn. All rights reserved.",
  },
} as const

export const CREDENTIAL_PAGE_LABELS = {
  PAGE_TITLE:     "자격증 관리",
  SECTION_LIST:   "보유 자격증",
  SECTION_UPLOAD: "자격증 업로드",
  SELECT_TYPE:    "자격증 종류를 선택해 주세요",
  SELECT_FILE:    "파일 선택 (JPG, PNG, WEBP, PDF, 최대 10MB)",
  ISSUED_DATE:    "발급일 (선택)",
  UPLOAD_BTN:     "업로드",
  UPLOADING:      "업로드 중...",
  UPLOAD_SUCCESS: "자격증이 제출되었습니다. 관리자 심사 후 인증됩니다.",
  UPLOAD_FAILED:  "업로드 중 오류가 발생했습니다. 다시 시도해 주세요.",
  NO_CREDENTIALS: "등록된 자격증이 없습니다.",
  STATUS_BADGE: {
    APPROVED: "인증 완료",
    PENDING:  "심사 중",
    REJECTED: "반려",
  },
} as const

