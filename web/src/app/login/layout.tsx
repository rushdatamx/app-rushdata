// Login bypasses the app shell (sin sidebar/topbar).
export default function LoginLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
