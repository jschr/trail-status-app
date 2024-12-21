import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Card,
  CardHeader,
  CardContent,
  CardTitle,
  CardDescription,
} from '@/components/ui/card';
import { Instagram } from 'lucide-react';
import { Logo } from '@/components/logo';
import api from '@/api';

export function LoginForm({
  className,
  ...props
}: React.ComponentPropsWithoutRef<'div'>) {
  return (
    <div className={cn('flex flex-col gap-6', className)} {...props}>
      <Card>
        <CardHeader>
          <CardTitle className="text-2xl flex flex-row items-center gap-3">
            <Logo />
            <span className="flex-1">Trails Status App</span>
          </CardTitle>
          <CardDescription>
            Automatically open or close the trails by posting to Instagram.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form>
            <div className="flex flex-col gap-6">
              <Button type="submit" className="w-full" asChild>
                <a href={api.getAuthorizeUrl()}>
                  <Instagram />
                  Login with Instagram
                </a>
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
