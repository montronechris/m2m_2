// src/app/(client)/layout.tsx
"use client";

export default function ClientLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-1 w-full">
        {children}
      </main>
    </div>
  );
}