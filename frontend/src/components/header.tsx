import { ModeToggle } from '@/components/mode-toggle';
import { Logo } from '@/components/logo';
import { Link } from 'react-router';

export function Header({ children }: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b px-4">
      <Link to="/">
        <Logo className="w-7 h-7" />
      </Link>
      <div className="flex-1">{children}</div>
      <ModeToggle />
    </header>
  );
}
