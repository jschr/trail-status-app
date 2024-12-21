import { useNavigate } from 'react-router';
import { ModeToggle } from '@/components/mode-toggle';
import { Logo } from '@/components/logo';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';

export function Header({ children }: React.ComponentPropsWithoutRef<'div'>) {
  const navigate = useNavigate();
  return (
    <header className="flex h-16 shrink-0 items-center gap-4 border-b px-4">
      <Link to="/">
        <Logo className="w-7 h-7" />
      </Link>
      <div className="flex-1">{children}</div>
      <div className="flex flex-row gap-1 items-center">
        <ModeToggle />
        <Button
          variant="link"
          onClick={() => {
            localStorage.clear();
            navigate('/login');
          }}
        >
          Logout
        </Button>
      </div>
    </header>
  );
}
