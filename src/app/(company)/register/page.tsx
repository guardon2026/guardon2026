"use client"

import { useState, useRef } from "react"
import { useRouter } from "next/navigation"
import { Building2, Phone, ArrowRight, HelpCircle, MapPin, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { COMPANY_ONBOARDING, ERROR_MESSAGES } from "@/lib/constants"

interface FormData {
  name: string
  licenseNumber: string
  address: string
  city: string
  district: string
  phone: string
  description: string
}

interface FormErrors {
  name?: string
  licenseNumber?: string
  address?: string
  city?: string
  district?: string
  phone?: string
}

const LICENSE_REGEX = /^[\d가-힣\-]+$/

const STEPS = ["업체 정보 입력", "검토 대기", "승인 완료"]

export default function RegisterPage() {
  const router = useRouter()
  const topRef = useRef<HTMLDivElement>(null)
  const [formData, setFormData] = useState<FormData>({
    name: "",
    licenseNumber: "",
    address: "",
    city: "",
    district: "",
    phone: "",
    description: "",
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [globalError, setGlobalError] = useState<string | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [showTooltip, setShowTooltip] = useState(false)

  function handleChange(
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) {
    const { name, value } = e.target
    setFormData((prev) => ({ ...prev, [name]: value }))
    if (errors[name as keyof FormErrors]) {
      setErrors((prev) => ({ ...prev, [name]: undefined }))
    }
    setGlobalError(null)
  }

  function validate(): boolean {
    const newErrors: FormErrors = {}

    if (!formData.name.trim()) newErrors.name = COMPANY_ONBOARDING.ERROR.NAME_REQUIRED
    if (!formData.licenseNumber.trim()) {
      newErrors.licenseNumber = COMPANY_ONBOARDING.ERROR.LICENSE_REQUIRED
    } else if (!LICENSE_REGEX.test(formData.licenseNumber) || formData.licenseNumber.length < 5) {
      newErrors.licenseNumber = COMPANY_ONBOARDING.ERROR.LICENSE_FORMAT
    }
    if (!formData.address.trim()) newErrors.address = COMPANY_ONBOARDING.ERROR.ADDRESS_REQUIRED
    if (!formData.city.trim()) newErrors.city = COMPANY_ONBOARDING.ERROR.CITY_REQUIRED
    if (!formData.district.trim()) newErrors.district = COMPANY_ONBOARDING.ERROR.DISTRICT_REQUIRED
    if (!formData.phone.trim()) newErrors.phone = COMPANY_ONBOARDING.ERROR.PHONE_REQUIRED

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!validate()) {
      topRef.current?.scrollIntoView({ behavior: "smooth" })
      return
    }

    setIsSubmitting(true)
    setGlobalError(null)

    try {
      const res = await fetch("/api/company/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          licenseNumber: formData.licenseNumber,
          address: formData.address,
          city: formData.city,
          district: formData.district,
          phone: formData.phone,
          description: formData.description || undefined,
        }),
      })

      if (res.ok) {
        router.push("/pending")
      } else if (res.status === 409) {
        const data = await res.json()
        if (data.code === "ALREADY_REGISTERED") {
          setGlobalError(COMPANY_ONBOARDING.ERROR.ALREADY_REGISTERED)
        } else {
          setErrors({ licenseNumber: COMPANY_ONBOARDING.ERROR.LICENSE_DUPLICATE })
        }
        topRef.current?.scrollIntoView({ behavior: "smooth" })
      } else if (res.status === 400) {
        const data = await res.json()
        if (data.field) {
          setErrors({ [data.field]: data.error })
        } else {
          setGlobalError(data.error ?? ERROR_MESSAGES.SERVER)
        }
        topRef.current?.scrollIntoView({ behavior: "smooth" })
      } else {
        setGlobalError(ERROR_MESSAGES.SERVER)
        topRef.current?.scrollIntoView({ behavior: "smooth" })
      }
    } catch {
      setGlobalError(ERROR_MESSAGES.SERVER)
      topRef.current?.scrollIntoView({ behavior: "smooth" })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-2xl mx-auto space-y-6" ref={topRef}>

        {/* 진행 단계 */}
        <div className="flex items-center gap-0">
          {STEPS.map((step, i) => (
            <div key={step} className="flex items-center">
              <div className="flex flex-col items-center gap-1">
                <div
                  className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold
                    ${i === 0 ? "bg-brand text-white" : "bg-gray-200 text-gray-400"}`}
                >
                  {i + 1}
                </div>
                <span className={`text-xs whitespace-nowrap ${i === 0 ? "text-brand font-semibold" : "text-gray-400"}`}>
                  {step}
                </span>
              </div>
              {i < STEPS.length - 1 && (
                <div className="h-px w-16 mb-4 mx-1 bg-gray-200" />
              )}
            </div>
          ))}
        </div>

        {/* 전역 오류 */}
        {globalError && (
          <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-xl">
            <p className="text-sm text-sos">{globalError}</p>
          </div>
        )}

        {/* 폼 카드 */}
        <div className="bg-white rounded-2xl shadow-card border border-gray-100 p-8">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-brand" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gray-900">{COMPANY_ONBOARDING.PAGE_TITLE}</h1>
              <p className="text-sm text-gray-500">{COMPANY_ONBOARDING.PAGE_SUBTITLE}</p>
            </div>
          </div>

          <form onSubmit={handleSubmit} noValidate className="space-y-8">

            {/* 섹션: 기본 정보 */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide">기본 정보</p>

              {/* 업체명 */}
              <div className="space-y-1.5">
                <Label htmlFor="name">
                  {COMPANY_ONBOARDING.FIELDS.NAME_LABEL}
                  <span className="text-sos ml-0.5">*</span>
                </Label>
                <Input
                  id="name"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={COMPANY_ONBOARDING.FIELDS.NAME_PLACEHOLDER}
                  className={errors.name ? "border-red-300 bg-red-50 focus-visible:ring-red-400" : ""}
                />
                {errors.name && <p className="text-sm text-sos">{errors.name}</p>}
              </div>

              {/* 허가번호 */}
              <div className="space-y-1.5">
                <Label htmlFor="licenseNumber">
                  {COMPANY_ONBOARDING.FIELDS.LICENSE_LABEL}
                  <span className="text-sos ml-0.5">*</span>
                </Label>
                <div className="relative">
                  <Input
                    id="licenseNumber"
                    name="licenseNumber"
                    value={formData.licenseNumber}
                    onChange={handleChange}
                    placeholder={COMPANY_ONBOARDING.FIELDS.LICENSE_PLACEHOLDER}
                    className={`pr-8 ${errors.licenseNumber ? "border-red-300 bg-red-50 focus-visible:ring-red-400" : ""}`}
                  />
                  <button
                    type="button"
                    onMouseEnter={() => setShowTooltip(true)}
                    onMouseLeave={() => setShowTooltip(false)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2"
                    aria-label="허가번호 안내"
                  >
                    <HelpCircle className="w-4 h-4 text-brand" />
                  </button>
                  {showTooltip && (
                    <div className="absolute right-0 top-full mt-1 z-10 bg-gray-900 text-white text-xs rounded-lg px-3 py-2 whitespace-nowrap shadow-lg">
                      경비업법에 따른 허가번호
                    </div>
                  )}
                </div>
                {errors.licenseNumber ? (
                  <p className="text-sm text-sos">{errors.licenseNumber}</p>
                ) : (
                  <p className="text-xs text-gray-400">{COMPANY_ONBOARDING.FIELDS.LICENSE_HINT}</p>
                )}
              </div>
            </div>

            {/* 섹션: 위치 정보 */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5" />
                위치 정보
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="address">
                  {COMPANY_ONBOARDING.FIELDS.ADDRESS_LABEL}
                  <span className="text-sos ml-0.5">*</span>
                </Label>
                <Input
                  id="address"
                  name="address"
                  value={formData.address}
                  onChange={handleChange}
                  placeholder={COMPANY_ONBOARDING.FIELDS.ADDRESS_PLACEHOLDER}
                  className={errors.address ? "border-red-300 bg-red-50 focus-visible:ring-red-400" : ""}
                />
                {errors.address && <p className="text-sm text-sos">{errors.address}</p>}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label htmlFor="city">
                    {COMPANY_ONBOARDING.FIELDS.CITY_LABEL}
                    <span className="text-sos ml-0.5">*</span>
                  </Label>
                  <Input
                    id="city"
                    name="city"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder={COMPANY_ONBOARDING.FIELDS.CITY_PLACEHOLDER}
                    className={errors.city ? "border-red-300 bg-red-50 focus-visible:ring-red-400" : ""}
                  />
                  {errors.city && <p className="text-sm text-sos">{errors.city}</p>}
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="district">
                    {COMPANY_ONBOARDING.FIELDS.DISTRICT_LABEL}
                    <span className="text-sos ml-0.5">*</span>
                  </Label>
                  <Input
                    id="district"
                    name="district"
                    value={formData.district}
                    onChange={handleChange}
                    placeholder={COMPANY_ONBOARDING.FIELDS.DISTRICT_PLACEHOLDER}
                    className={errors.district ? "border-red-300 bg-red-50 focus-visible:ring-red-400" : ""}
                  />
                  {errors.district && <p className="text-sm text-sos">{errors.district}</p>}
                </div>
              </div>
            </div>

            {/* 섹션: 연락처 */}
            <div className="space-y-4">
              <p className="text-xs font-semibold text-gray-400 uppercase tracking-wide flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5" />
                연락처
              </p>

              <div className="space-y-1.5">
                <Label htmlFor="phone">
                  {COMPANY_ONBOARDING.FIELDS.PHONE_LABEL}
                  <span className="text-sos ml-0.5">*</span>
                </Label>
                <div className="relative">
                  <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder={COMPANY_ONBOARDING.FIELDS.PHONE_PLACEHOLDER}
                    className={`pl-9 ${errors.phone ? "border-red-300 bg-red-50 focus-visible:ring-red-400" : ""}`}
                  />
                </div>
                {errors.phone && <p className="text-sm text-sos">{errors.phone}</p>}
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description" className="flex items-center gap-1.5">
                  <FileText className="w-3.5 h-3.5" />
                  {COMPANY_ONBOARDING.FIELDS.DESCRIPTION_LABEL}
                </Label>
                <Textarea
                  id="description"
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  placeholder={COMPANY_ONBOARDING.FIELDS.DESCRIPTION_PLACEHOLDER}
                  rows={3}
                />
              </div>
            </div>

            <Button
              type="submit"
              disabled={isSubmitting}
              className="w-full h-12 bg-brand hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSubmitting ? COMPANY_ONBOARDING.SUBMITTING : (
                <>
                  {COMPANY_ONBOARDING.SUBMIT_BUTTON}
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </Button>
          </form>
        </div>
      </div>
    </div>
  )
}
