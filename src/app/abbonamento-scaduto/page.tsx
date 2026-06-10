// src/app/abbonamento-scaduto/page.tsx

export default function AbbonamentoScaduto() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-950 text-white p-8">
      <div className="max-w-md text-center space-y-4">
        <div className="text-6xl">⏰</div>
        <h1 className="text-2xl font-bold">Abbonamento scaduto</h1>
        <p className="text-gray-400">
          Il tuo periodo di accesso è terminato. Contatta l'amministratore per rinnovare il piano.
        </p>
      </div>
    </div>
  )
}