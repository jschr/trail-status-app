import { useState, useEffect } from 'react';
import api, { User } from '../api';

export default function useUser(): User | null {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    setUser(api.getUser());
  }, []);

  return user;
}
