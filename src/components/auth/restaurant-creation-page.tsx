'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import {
  ArrowLeft,
  ArrowRight,
  MoreHorizontal,
  CheckCircle2,
  ChefHat,
  Sparkles,
  UploadCloud,
  FileText,
  ImageIcon,
  X,
  AlertTriangle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group'
import { useI18n } from '@/components/i18n/I18nProvider'
import { restaurantAvatars as logoIcons } from '@/lib/restaurant-avatars'
import { supabase } from '@/lib/supabase'
import { savePendingRestaurant, savePendingMenuFile } from '@/lib/pending-restaurant'
import { importMenuFromFile } from '@/lib/menu-import'
import { LanguageSwitcher } from '@/components/landing/LanguageSwitcher'

/* Restaurant theme (same as login page) */
const ORANGE = '#FF6B00'
const ORANGE_DEEP = '#FF3D00'
const GREEN = '#4CAF50' // success only
const CREAM = '#F5F1E8'

const establishmentTypes = [
  { id: 'pizzeria', image: 'https://sfile.chatglm.cn/images-ppt/d06f30008a10.jpg' },
  { id: 'ristorante', image: 'https://sfile.chatglm.cn/images-ppt/9b363ea07a4f.jpeg' },
  { id: 'bar', image: 'https://sfile.chatglm.cn/images-ppt/91ceb160ef7e.jpg' },
  { id: 'trattoria', image: 'https://sfile.chatglm.cn/images-ppt/de0096f42704.jpg' },
  { id: 'osteria', image: 'https://sfile.chatglm.cn/images-ppt/e365196369cb.jpg' },
  { id: 'gelateria', image: 'https://sfile.chatglm.cn/images-ppt/bcc68b7693eb.jpg' },
  { id: 'hamburgeria', image: 'https://sfile.chatglm.cn/images-ppt/6700555d82fd.jpg' },
  { id: 'pasticceria', image: 'https://sfile.chatglm.cn/images-ppt/49df139d820c.jpg' },
  { id: 'pesce', image: 'https://sfile.chatglm.cn/images-ppt/965887a7c09f.jpg' },
  { id: 'enoteca', image: 'https://sfile.chatglm.cn/images-ppt/8b3f5e229bc2.jpg' },
  { id: 'cocktail-bar', image: 'https://sfile.chatglm.cn/images-ppt/dd9d0e6b61e6.jpg' },
  { id: 'sushi', image: 'https://sfile.chatglm.cn/images-ppt/ded37fb18fc6.png' },
  { id: 'altro', image: '' },
]

const totalSteps = 3

export function RestaurantCreationPage() {
  const { tr } = useI18n()
  const [currentStep, setCurrentStep] = useState(1)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [exitingStep, setExitingStep] = useState<number | null>(null)
  const [selectedType, setSelectedType] = useState('')
  const [formData, setFormData] = useState({
    nomeLocale: '',
    citta: '',
    logoIcon: logoIcons[0].id,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({})
  const [customType, setCustomType] = useState('')
  // File del menu (PDF/immagine) caricato allo step 2, opzionale.
  // Viene analizzato e importato solo dopo la creazione effettiva del ristorante (step 3).
  const [menuFile, setMenuFile] = useState<File | null>(null)

  // Trigger a step change with exit animation: keep the old step mounted (exiting)
  // while the new step enters, then clear the exiting step after the animation.
  const changeStep = (next: number, dir: 'forward' | 'back') => {
    if (next === currentStep) return
    setDirection(dir)
    setExitingStep(currentStep)
    setCurrentStep(next)
    // clear the exiting step after the exit animation finishes
    window.setTimeout(() => setExitingStep(null), 340)
  }

  const handleContinue = () => {
    if (currentStep < totalSteps) changeStep(currentStep + 1, 'forward')
  }
  const handleBack = () => {
    if (currentStep > 1) changeStep(currentStep - 1, 'back')
  }
  const handleSubmit = async () => {
    setIsSubmitting(true)
    await new Promise((resolve) => setTimeout(resolve, 1500))
    changeStep(3, 'forward')
    setIsSubmitting(false)
  }

  const isStep1Valid = selectedType !== '' && (selectedType !== 'altro' || customType.trim() !== '')
  const isStep2Valid = formData.nomeLocale && formData.citta

  // Render helper: returns the step content for a given step number
  const renderStep = (step: number) => {
    if (step === 1)
      return (
        <StepOne
          selectedType={selectedType}
          setSelectedType={setSelectedType}
          imageErrors={imageErrors}
          setImageErrors={setImageErrors}
          customType={customType}
          setCustomType={setCustomType}
        />
      )
    if (step === 2)
      return (
        <StepTwo
          formData={formData}
          setFormData={setFormData}
          selectedType={selectedType}
          imageErrors={imageErrors}
          customType={customType}
          menuFile={menuFile}
          setMenuFile={setMenuFile}
        />
      )
    if (step === 3)
      return (
        <StepSuccess
          selectedType={selectedType}
          imageErrors={imageErrors}
          customType={customType}
          formData={formData}
          menuFile={menuFile}
        />
      )
    return null
  }

  return (
    <div
      className="min-h-screen flex flex-col"
      style={{
        background: `radial-gradient(1200px 600px at 15% 10%, #FFF7EE 0%, transparent 60%), radial-gradient(1000px 500px at 85% 90%, #FFE3D1 0%, transparent 55%), ${CREAM}`,
      }}
    >
      <main className="flex-1 flex flex-col items-center px-4 py-6 sm:py-10 lg:py-12">
        <div className="w-full max-w-[480px]">
          {/* Brand bar — outside the card */}
          <div className="flex items-center justify-between mb-4 sm:mb-6">
            <Link
              href="/"
              className="flex items-center gap-2 active:scale-95 transition-transform"
            >
              <div
                className="size-8 sm:size-9 rounded-xl flex items-center justify-center shadow-sm"
                style={{ background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_DEEP})` }}
              >
                <ChefHat className="size-4 sm:size-5 text-white" />
              </div>
              <span className="text-[22px] sm:text-[24px] font-bold text-gray-900 tracking-tight">
                Tavola<span style={{ color: ORANGE }}>.</span>
              </span>
            </Link>
            <div className="glass flex items-center rounded-2xl border border-ink/5 px-1.5 py-1 shadow-lg">
              <LanguageSwitcher />
            </div>
          </div>

          {/* White content card — improves legibility on cream background */}
          <div
            className="rounded-2xl sm:rounded-3xl bg-white p-5 sm:p-8 shadow-xl shadow-black/5 ring-1 ring-black/5"
          >
            {/* Heading */}
            <div className="mb-6 sm:mb-8">
              <h1 className="text-[24px] sm:text-[28px] font-bold text-gray-900 leading-tight mb-2">
                {tr.auth.create.heroTitle}
              </h1>
              <p className="text-[14px] sm:text-[15px] text-gray-500 leading-relaxed">
                {tr.auth.create.heroSubtitle}
              </p>
            </div>

            {/* Progress Bar */}
            <div className="mb-6 sm:mb-8">
              <div className="flex items-center gap-1.5 mb-2">
                {Array.from({ length: totalSteps }).map((_, i) => (
                  <div
                    key={i}
                    className="progress-segment h-[5px] flex-1 rounded-full"
                    style={{ backgroundColor: i < currentStep ? ORANGE : '#E5E7EB' }}
                  />
                ))}
              </div>
              <p className="text-xs text-gray-400 text-right">
                {tr.auth.create.stepOf.replace('{current}', String(currentStep)).replace('{total}', String(totalSteps))} &middot; {tr.auth.create.stepLabels[currentStep - 1]}
              </p>
            </div>

            {/* Step Content — with enter + exit slide transition */}
            <div className="relative">
              {/* Exiting step (old) — absolutely positioned so it doesn't affect height while animating out */}
              {exitingStep !== null && (
                <div
                  key={`exit-${exitingStep}`}
                  className={`absolute inset-x-0 top-0 ${direction === 'forward' ? 'step-exit-forward' : 'step-exit-back'}`}
                  style={{ pointerEvents: 'none' }}
                >
                  {renderStep(exitingStep)}
                </div>
              )}
              {/* Entering step (new) — animates in */}
              <div
                key={`enter-${currentStep}`}
                className={direction === 'forward' ? 'step-enter-forward' : 'step-enter-back'}
              >
                {renderStep(currentStep)}
              </div>
            </div>

            {/* Navigation Buttons — larger touch targets on mobile */}
            {currentStep < 3 && (
              <div className="flex items-center justify-between mt-8 gap-3">
                <Button
                  variant="ghost"
                  onClick={handleBack}
                  disabled={currentStep === 1}
                  className="text-red-500 hover:text-red-600 hover:bg-transparent px-3 h-12 sm:h-11 disabled:opacity-30 active:scale-95 transition-transform"
                >
                  <ArrowLeft className="size-4 mr-1.5" />
                  <span className="text-[15px]">{tr.auth.create.back}</span>
                </Button>

                {currentStep === 2 ? (
                  <Button
                    onClick={handleSubmit}
                    disabled={!isStep2Valid || isSubmitting}
                    className="text-white px-6 sm:px-8 rounded-full h-12 sm:h-11 font-medium shadow-sm disabled:opacity-40 disabled:shadow-none transition-all duration-200 active:scale-95"
                    style={{ background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_DEEP})`, boxShadow: `0 4px 12px ${ORANGE_DEEP}33` }}
                  >
                    {isSubmitting ? (
                      <span className="flex items-center gap-2">
                        <svg className="animate-spin size-4" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        {tr.auth.create.submitting}
                      </span>
                    ) : (
                      <span className="flex items-center gap-2">
                        <span className="text-[15px]">{tr.auth.create.finish}</span>
                        <ArrowRight className="size-4" />
                      </span>
                    )}
                  </Button>
                ) : (
                  <Button
                    onClick={handleContinue}
                    disabled={!isStep1Valid}
                    className="text-white px-6 sm:px-8 rounded-full h-12 sm:h-11 font-medium shadow-sm disabled:opacity-40 disabled:shadow-none transition-all duration-200 active:scale-95"
                    style={{ background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_DEEP})`, boxShadow: `0 4px 12px ${ORANGE_DEEP}33` }}
                  >
                    <span className="text-[15px]">{tr.auth.create.next}</span>
                    <ArrowRight className="size-4 ml-1.5" />
                  </Button>
                )}
              </div>
            )}

            {/* Login link */}
            {currentStep < 3 && (
              <p className="text-center text-sm text-gray-400 mt-6">
                {tr.auth.create.hasAccount}{' '}
                <button
                  onClick={() => { window.location.href = '/admin/dashboard' }}
                  className="hover:underline font-medium"
                  style={{ color: ORANGE }}
                >
                  {tr.auth.create.goToManagePage}
                </button>
              </p>
            )}
          </div>
        </div>
      </main>

      <footer className="mt-auto py-5 text-center border-t border-gray-100">
        <p className="text-xs text-gray-400">
          © {new Date().getFullYear()} Tavola. {tr.auth.create.footerRights} · Made with{' '}
          <span style={{ color: ORANGE }}>♥</span> in Italia
        </p>
      </footer>
    </div>
  )
}

/* ─── Step 1: Tipo di locale ─── */
function StepOne({
  selectedType,
  setSelectedType,
  imageErrors,
  setImageErrors,
  customType,
  setCustomType,
}: {
  selectedType: string
  setSelectedType: (v: string) => void
  imageErrors: Record<string, boolean>
  setImageErrors: React.Dispatch<React.SetStateAction<Record<string, boolean>>>
  customType: string
  setCustomType: (v: string) => void
}) {
  const { tr } = useI18n()
  const [altroExpanded, setAltroExpanded] = useState(false)

  const handleTypeChange = (value: string) => {
    setSelectedType(value)
    if (value === 'altro') setAltroExpanded(true)
    else {
      setAltroExpanded(false)
      setCustomType('')
    }
  }

  return (
    <div>
      <Label className="text-sm text-gray-500 font-medium mb-4 block">{tr.auth.create.stepEstablishmentTitle}</Label>
      <RadioGroup
        value={selectedType}
        onValueChange={handleTypeChange}
        className="type-list-scroll space-y-2.5 max-h-[420px] overflow-y-auto pr-1.5"
      >
        {establishmentTypes.map((type, index) => {
          const isSelected = selectedType === type.id
          const label = tr.auth.create.types[type.id as keyof typeof tr.auth.create.types]
          return (
            <label
              key={type.id}
              className={`stagger-item group flex items-center gap-3.5 px-3.5 py-3.5 sm:py-3 rounded-xl cursor-pointer transition-all duration-200 border active:scale-[0.99] ${
                isSelected
                  ? 'border-[#FF6B00]/40 bg-[#FF6B00]/[0.05] shadow-[0_1px_3px_rgba(255,107,0,0.1)] type-item-selected'
                  : 'border-gray-200/80 hover:border-gray-300 hover:bg-gray-50/70'
              }`}
              style={{ minHeight: 56, animationDelay: `${Math.min(index, 8) * 40}ms` }}
            >
              {type.id === 'altro' ? (
                <div
                  className={`size-11 rounded-lg flex items-center justify-center shrink-0 transition-colors duration-200 ${
                    isSelected ? 'bg-[#FF6B00]/10' : 'bg-gray-100'
                  }`}
                >
                  <MoreHorizontal
                    className={`size-5 transition-colors duration-200 ${
                      isSelected ? 'text-[#FF6B00]' : 'text-gray-400'
                    }`}
                  />
                </div>
              ) : imageErrors[type.id] ? (
                <div className="size-11 rounded-lg bg-gray-100 flex items-center justify-center shrink-0">
                  <span className="text-lg">🍽️</span>
                </div>
              ) : (
                <div className="size-11 rounded-lg overflow-hidden shrink-0 bg-gray-100 ring-1 ring-black/5">
                  <img
                    src={type.image}
                    alt={label}
                    className="size-full object-cover"
                    onError={() => setImageErrors((prev) => ({ ...prev, [type.id]: true }))}
                  />
                </div>
              )}
              <span
                className={`flex-1 text-[15px] font-medium transition-colors duration-150 ${
                  isSelected ? 'text-[#FF3D00]' : 'text-gray-700'
                }`}
              >
                {label}
              </span>
              <RadioGroupItem
                value={type.id}
                className={`size-[18px] transition-all duration-200 ${
                  isSelected ? 'border-[#FF6B00]' : 'border-gray-300'
                }`}
              />
            </label>
          )
        })}
      </RadioGroup>

      <div
        className={`overflow-hidden transition-all duration-300 ease-out ${
          altroExpanded ? 'max-h-[120px] opacity-100 mt-3' : 'max-h-0 opacity-0 mt-0'
        }`}
      >
        <div className="space-y-1.5 pl-1">
          <Label htmlFor="custom-type" className="text-[13px] text-gray-600 font-medium">
            {tr.auth.create.customTypeLabel}
          </Label>
          <Input
            id="custom-type"
            placeholder={tr.auth.create.customTypePlaceholder}
            value={customType}
            onChange={(e) => setCustomType(e.target.value)}
            autoFocus
            className="h-12 sm:h-11 rounded-xl border-gray-200 focus-visible:border-[#FF6B00] focus-visible:ring-[#FF6B00]/20 text-[15px] transition-colors"
          />
        </div>
      </div>
    </div>
  )
}

/* ─── Step 2: Il tuo locale ─── */
function StepTwo({
  formData,
  setFormData,
  selectedType,
  imageErrors,
  customType,
  menuFile,
  setMenuFile,
}: {
  formData: { nomeLocale: string; citta: string; logoIcon: string }
  setFormData: (updater: (prev: typeof formData) => typeof formData) => void
  selectedType: string
  imageErrors: Record<string, boolean>
  customType: string
  menuFile: File | null
  setMenuFile: (f: File | null) => void
}) {
  const { tr } = useI18n()
  const update = (field: string, value: string) => setFormData((prev) => ({ ...prev, [field]: value }))
  const selected = establishmentTypes.find((t) => t.id === selectedType)
  const selectedLabel = selected ? tr.auth.create.types[selected.id as keyof typeof tr.auth.create.types] : undefined
  const displayLabel = selectedType === 'altro' ? customType : selectedLabel

  const [menuDragOver, setMenuDragOver] = useState(false)
  const [menuFileError, setMenuFileError] = useState<string | null>(null)

  // Stessi vincoli usati per l'import menu nella dashboard (MenuSection.tsx)
  const ALLOWED_MENU_TYPES = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  const MAX_MENU_BYTES = 15 * 1024 * 1024

  function handleMenuFileSelect(file: File | null) {
    if (!file) return
    if (!ALLOWED_MENU_TYPES.includes(file.type)) {
      setMenuFileError('Formato non supportato. Carica un PDF o un\'immagine (JPG, PNG, WEBP).')
      setMenuFile(null)
      return
    }
    if (file.size > MAX_MENU_BYTES) {
      setMenuFileError('Il file è troppo grande (max 15MB).')
      setMenuFile(null)
      return
    }
    setMenuFileError(null)
    setMenuFile(file)
  }

  return (
    <div className="space-y-5">
      <Label className="text-sm text-gray-500 font-medium block">{tr.auth.create.stepDetailsTitle}</Label>
      <div
        className="stagger-item flex items-center gap-3 px-4 py-3 rounded-xl bg-gradient-to-r from-gray-50 to-white border border-gray-100"
        style={{ animationDelay: '60ms' }}
      >
        {selected && selected.id !== 'altro' && !imageErrors[selected.id] && selected.image ? (
          <div className="size-10 rounded-lg overflow-hidden shrink-0 ring-1 ring-black/5">
            <img src={selected.image} alt={selectedLabel} className="size-full object-cover" />
          </div>
        ) : (
          <div className="size-10 rounded-lg bg-[#FF6B00]/10 flex items-center justify-center shrink-0">
            {selectedType === 'altro' ? (
              <MoreHorizontal className="size-5 text-[#FF6B00]" />
            ) : (
              <ChefHat className="size-5 text-[#FF6B00]" />
            )}
          </div>
        )}
        <div>
          <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">{tr.auth.create.selectedTypeLabel}</p>
          <p className="text-sm font-semibold text-gray-800">{displayLabel}</p>
        </div>
      </div>
      <div className="stagger-item space-y-1.5" style={{ animationDelay: '100ms' }}>
        <Label className="text-[13px] text-gray-600 font-medium">{tr.auth.create.logoLabel}</Label>
        <div className="grid grid-cols-5 sm:grid-cols-6 gap-2">
          {logoIcons.map((icon) => {
            const isSelected = formData.logoIcon === icon.id
            const Icon = icon.Icon
            return (
              <button
                key={icon.id}
                type="button"
                onClick={() => update('logoIcon', icon.id)}
                aria-label={icon.label}
                aria-pressed={isSelected}
                className={`flex items-center justify-center aspect-square rounded-xl border transition-all duration-200 active:scale-95 ${
                  isSelected
                    ? 'border-[#FF6B00] bg-[#FF6B00]/10'
                    : 'border-gray-200 bg-white hover:border-gray-300 hover:bg-gray-50'
                }`}
              >
                <Icon className="size-5" style={{ color: isSelected ? ORANGE : '#9CA3AF' }} />
              </button>
            )
          })}
        </div>
      </div>
      <div className="stagger-item space-y-1.5" style={{ animationDelay: '140ms' }}>
        <Label htmlFor="nomeLocale" className="text-[13px] text-gray-600 font-medium">{tr.auth.create.nameLabel}</Label>
        <Input
          id="nomeLocale"
          placeholder={tr.auth.create.namePlaceholder}
          value={formData.nomeLocale}
          onChange={(e) => update('nomeLocale', e.target.value)}
          className="h-12 sm:h-11 rounded-xl border-gray-200 focus-visible:border-[#FF6B00] focus-visible:ring-[#FF6B00]/20 text-[15px] transition-colors"
        />
      </div>
      <div className="stagger-item space-y-1.5" style={{ animationDelay: '220ms' }}>
        <Label htmlFor="citta" className="text-[13px] text-gray-600 font-medium">{tr.auth.create.cityLabel}</Label>
        <Input
          id="citta"
          placeholder={tr.auth.create.cityPlaceholder}
          value={formData.citta}
          onChange={(e) => update('citta', e.target.value)}
          className="h-12 sm:h-11 rounded-xl border-gray-200 focus-visible:border-[#FF6B00] focus-visible:ring-[#FF6B00]/20 text-[15px] transition-colors"
        />
      </div>
      <div className="stagger-item space-y-1.5" style={{ animationDelay: '260ms' }}>
        <div className="flex items-center gap-2">
          <Label className="text-[13px] text-gray-600 font-medium">Menu (PDF o foto)</Label>
          <span className="rounded-full bg-gray-100 px-2 py-0.5 text-[10.5px] font-medium text-gray-500">Opzionale</span>
        </div>
        <div
          onDragOver={(e) => { e.preventDefault(); setMenuDragOver(true) }}
          onDragLeave={() => setMenuDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setMenuDragOver(false)
            handleMenuFileSelect(e.dataTransfer.files?.[0] ?? null)
          }}
          className={`flex flex-col items-center justify-center gap-1.5 rounded-xl border-2 border-dashed px-4 py-5 text-center transition-colors ${
            menuDragOver ? 'border-[#FF6B00] bg-[#FF6B00]/5' : 'border-gray-200 bg-gray-50/60'
          }`}
        >
          {!menuFile ? (
            <>
              <UploadCloud className="size-5 text-gray-400" />
              <p className="text-[13px] text-gray-600">
                Trascina qui il menu, oppure{' '}
                <label className="cursor-pointer font-medium text-[#FF6B00] hover:underline">
                  scegli dal dispositivo
                  <input
                    type="file"
                    accept="application/pdf,.pdf,image/jpeg,image/png,image/webp"
                    className="hidden"
                    onChange={(e) => handleMenuFileSelect(e.target.files?.[0] ?? null)}
                  />
                </label>
              </p>
              <p className="text-[11px] text-gray-400">PDF, JPG, PNG o WEBP · max 15MB</p>
            </>
          ) : (
            <div className="flex w-full items-center gap-3 rounded-lg bg-white px-3 py-2.5 ring-1 ring-black/5">
              {menuFile.type === 'application/pdf' ? (
                <FileText className="size-5 shrink-0 text-gray-400" />
              ) : (
                <ImageIcon className="size-5 shrink-0 text-gray-400" />
              )}
              <span className="flex-1 truncate text-left text-[13px] text-gray-700">{menuFile.name}</span>
              <button
                type="button"
                onClick={() => { setMenuFile(null); setMenuFileError(null) }}
                className="rounded-full p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                aria-label="Rimuovi file"
              >
                <X className="size-4" />
              </button>
            </div>
          )}
        </div>
        {menuFileError && (
          <p className="text-[12px] text-red-600">{menuFileError}</p>
        )}
        {menuFile && (
          <div className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 ring-1 ring-amber-200/60">
            <AlertTriangle className="mt-0.5 size-3.5 shrink-0 text-amber-500" />
            <p className="text-[11.5px] leading-relaxed text-amber-800">
              I piatti vengono letti da un'intelligenza artificiale e possono esserci errori
              (nomi, prezzi o categorie imprecisi). Controlla sempre il menu dalla dashboard
              dopo la creazione, prima di pubblicarlo.
            </p>
          </div>
        )}
      </div>
      <div className="stagger-item pt-2" style={{ animationDelay: '300ms' }}>
        <p className="text-[12px] text-gray-400 leading-relaxed">
          {tr.auth.create.termsPrefix}{' '}
          <a href="#" className="hover:underline font-medium" style={{ color: ORANGE }}>{tr.auth.create.termsOfService}</a>{' '}
          {tr.auth.create.termsAnd}{' '}
          <a href="#" className="hover:underline font-medium" style={{ color: ORANGE }}>{tr.auth.create.privacyPolicy}</a>.
        </p>
      </div>
    </div>
  )
}

/* ─── Step 3: Success ─── */
function StepSuccess({
  selectedType,
  imageErrors,
  customType,
  formData,
  menuFile,
}: {
  selectedType: string
  imageErrors: Record<string, boolean>
  customType: string
  formData: { nomeLocale: string; citta: string; logoIcon: string }
  menuFile: File | null
}) {
  const { tr } = useI18n()
  const selected = establishmentTypes.find((t) => t.id === selectedType)
  const selectedLabel = selected ? tr.auth.create.types[selected.id as keyof typeof tr.auth.create.types] : undefined
  const displayLabel = selectedType === 'altro' ? customType : selectedLabel
  const [isCreating, setIsCreating] = useState(false)
  const [createError, setCreateError] = useState<string | null>(null)
  const [isLoggedIn, setIsLoggedIn] = useState<boolean | null>(null)
  const [menuStatus, setMenuStatus] = useState<'idle' | 'importing' | 'done' | 'failed'>('idle')
  const [menuStatusMessage, setMenuStatusMessage] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    supabase.auth.getUser().then(({ data }) => {
      if (!cancelled) setIsLoggedIn(!!data.user)
    })
    return () => {
      cancelled = true
    }
  }, [])

  const handleGoToDashboard = async () => {
    if (isCreating) return
    setIsCreating(true)
    setCreateError(null)
    try {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) {
        savePendingRestaurant({
          name: formData.nomeLocale,
          city: formData.citta,
          logoIcon: formData.logoIcon,
          establishmentType: selectedType,
          establishmentTypeCustom: customType,
        })
        // Conserva il file del menu così viene importato dopo la registrazione
        // (l'estrazione richiede un utente autenticato, quindi non può avvenire ora).
        if (menuFile) await savePendingMenuFile(menuFile)
        window.location.href = '/login?next=create-pending'
        return
      }

      const res = await fetch('/api/restaurants/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: formData.nomeLocale, city: formData.citta, logoIcon: formData.logoIcon, establishmentType: selectedType, establishmentTypeCustom: customType }),
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body.error || 'Errore durante la creazione del ristorante.')

      // La forma della risposta di /api/restaurants/create non è nota con certezza,
      // quindi proviamo tutte le forme plausibili invece di assumerne una sola.
      const newRestaurantId =
        body?.id ??
        body?.restaurant?.id ??
        body?.restaurantId ??
        body?.data?.id ??
        body?.data?.restaurant?.id ??
        null

      if (menuFile) {
        if (!newRestaurantId) {
          // Non troviamo un id valido nella risposta: non possiamo importare il menu.
          // Segnaliamo chiaramente invece di saltare in silenzio.
          console.error('[menu-import] Nessun restaurant id trovato nella risposta di /api/restaurants/create:', body)
          setMenuStatus('failed')
          setMenuStatusMessage('Ristorante creato, ma non è stato possibile importare il menu automaticamente (id ristorante non trovato). Puoi caricarlo dalla dashboard.')
        } else {
          // Stessa logica di import usata in MenuSection.tsx (dashboard admin),
          // centralizzata in importMenuFromFile.
          setMenuStatus('importing')
          const result = await importMenuFromFile(newRestaurantId, menuFile)
          if (result.created === 0) {
            setMenuStatus('failed')
            setMenuStatusMessage(result.error ?? 'Non è stato possibile leggere il menu. Puoi caricarlo dalla dashboard.')
          } else {
            setMenuStatus('done')
            setMenuStatusMessage(`${result.created} piatt${result.created === 1 ? 'o importato' : 'i importati'} dal menu.`)
          }
        }

        // Diamo un attimo per far leggere l'esito prima di uscire dalla pagina,
        // invece di saltare subito in dashboard senza che l'utente se ne accorga.
        await new Promise((resolve) => setTimeout(resolve, 1400))
      }

      window.location.href = '/admin/dashboard'
    } catch (err: any) {
      setCreateError(err.message)
      setIsCreating(false)
    }
  }

  return (
    <div className="flex flex-col items-center text-center py-6 sm:py-8">
      <div className="stagger-item relative mb-6" style={{ animationDelay: '60ms' }}>
        <div
          className="size-20 rounded-full flex items-center justify-center"
          style={{ background: `linear-gradient(135deg, ${GREEN}26, ${GREEN}0D)` }}
        >
          <CheckCircle2 className="size-11" style={{ color: GREEN }} strokeWidth={1.8} />
        </div>
        <div
          className="absolute -inset-2 rounded-full animate-ping"
          style={{ backgroundColor: `${GREEN}0D`, animationDuration: '2s', animationIterationCount: '3' }}
        />
      </div>
      <h2 className="stagger-item text-[24px] font-bold text-gray-900 mb-2" style={{ animationDelay: '160ms' }}>{tr.auth.create.successTitle}</h2>
      <p className="stagger-item text-[15px] text-gray-500 max-w-[320px] leading-relaxed mb-8" style={{ animationDelay: '240ms' }}>
        {tr.auth.create.successSubtitle}{' '}
        {displayLabel?.toLowerCase()}.
      </p>
      <div
        className="stagger-item w-full flex items-center gap-4 px-5 py-4 rounded-2xl bg-gradient-to-r from-gray-50 to-white border border-gray-100 mb-8 shadow-sm"
        style={{ animationDelay: '320ms' }}
      >
        {selected && selected.id !== 'altro' && !imageErrors[selected.id] && selected.image ? (
          <div className="size-14 rounded-xl overflow-hidden shrink-0 ring-1 ring-black/5 shadow-sm">
            <img src={selected.image} alt={selectedLabel} className="size-full object-cover" />
          </div>
        ) : (
          <div className="size-14 rounded-xl bg-[#FF6B00]/10 flex items-center justify-center shrink-0">
            {selectedType === 'altro' ? (
              <MoreHorizontal className="size-6 text-[#FF6B00]" />
            ) : (
              <ChefHat className="size-6 text-[#FF6B00]" />
            )}
          </div>
        )}
        <div className="text-left">
          <p className="text-[11px] text-gray-400 uppercase tracking-wider font-medium">{tr.auth.create.yourVenueLabel}</p>
          <p className="text-base font-semibold text-gray-800">{formData.nomeLocale}</p>
          <p className="text-sm text-gray-500">
            {displayLabel} · {tr.auth.create.venueAt} {formData.citta}
          </p>
        </div>
      </div>
      <div
        className="stagger-item mb-8 inline-flex items-center gap-2 rounded-full px-6 py-3 shadow-md"
        style={{ background: `linear-gradient(135deg, ${GREEN}, #16A34A)`, animationDelay: '360ms' }}
      >
        <Sparkles className="size-5 text-white" />
        <span className="text-[18px] sm:text-[20px] font-extrabold text-white tracking-tight">
          {tr.auth.create.trialBadge}
        </span>
      </div>
      {createError && (
        <p className="stagger-item text-sm text-red-500 mb-3" style={{ animationDelay: '380ms' }}>{createError}</p>
      )}
      {menuStatus === 'importing' && (
        <p className="stagger-item text-sm text-gray-500 mb-3">Sto leggendo il menu, un attimo…</p>
      )}
      {menuStatus === 'done' && menuStatusMessage && (
        <p className="stagger-item text-sm text-emerald-600 mb-3">{menuStatusMessage}</p>
      )}
      {menuStatus === 'failed' && menuStatusMessage && (
        <p className="stagger-item text-sm text-amber-600 mb-3">{menuStatusMessage}</p>
      )}
      <Button
        onClick={handleGoToDashboard}
        disabled={isCreating}
        className="stagger-item text-white px-10 rounded-full h-12 font-medium text-[15px] shadow-md transition-all duration-200 disabled:opacity-60"
        style={{ background: `linear-gradient(135deg, ${ORANGE}, ${ORANGE_DEEP})`, boxShadow: `0 6px 16px ${ORANGE_DEEP}33`, animationDelay: '400ms' }}
      >
        {isCreating
          ? (menuStatus === 'importing' ? 'Sto leggendo il menu…' : tr.auth.create.submitting)
          : isLoggedIn === false
            ? tr.auth.create.completeRegistration
            : tr.auth.create.goToDashboard}
        <ArrowRight className="size-4 ml-2" />
      </Button>
    </div>
  )
}