
"use client";

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function RegisterRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Redirect all registration attempts to login page
    router.replace('/auth/login');
  }, [router]);

  return (
    <div className="container mx-auto flex items-center justify-center min-h-[80vh] px-6">
      <div className="glass p-10 rounded-[2.5rem] text-center">
        <p className="text-muted-foreground">Redirecting to login...</p>
      </div>
    </div>
  );
}
