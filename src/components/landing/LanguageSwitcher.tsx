'use client'

import { Globe, Check } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { LANGS, type Lang } from '@/lib/i18n/dictionary'
import { useI18n } from '@/components/i18n/I18nProvider'

export function LanguageSwitcher() {
  const { lang, setLang } = useI18n()
  const current = LANGS.find((l) => l.code === lang) ?? LANGS[0]

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1.5 rounded-full px-2.5 font-semibold text-ink/70 hover:text-ink"
          aria-label="Language"
        >
          <Globe className="h-4 w-4" />
          <span className="text-xs uppercase">{lang}</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="z-[200] w-40 rounded-xl">
        <DropdownMenuLabel className="text-xs text-ink/50">
          {current.label}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {LANGS.map((l) => (
          <DropdownMenuItem
            key={l.code}
            onClick={() => setLang(l.code as Lang)}
            className="cursor-pointer gap-2 rounded-lg"
          >
            <span className="grid h-5 w-6 place-items-center rounded-sm border border-ink/10 bg-white text-[10px] font-bold uppercase text-ink/70">
              {l.code === 'en' ? 'GB' : l.code.toUpperCase()}
            </span>
            <span className="flex-1">{l.label}</span>
            {l.code === lang && <Check className="h-4 w-4 text-brand-emerald" />}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
