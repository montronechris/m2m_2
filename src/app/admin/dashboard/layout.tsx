// src/app/admin/dashboard/layout.tsx
// Passthrough layout (auth is mocked — no Supabase in this live demo).

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}
