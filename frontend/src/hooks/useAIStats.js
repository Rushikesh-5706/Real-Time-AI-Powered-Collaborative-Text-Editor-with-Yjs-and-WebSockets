import { useState, useCallback } from 'react';

export function useAIStats() {
  const [accepted, setAccepted] = useState(0);
  const [rejected, setRejected] = useState(0);

  const increment = useCallback((type) => {
    if (type === 'accepted') {
      setAccepted((n) => n + 1);
    } else if (type === 'rejected') {
      setRejected((n) => n + 1);
    }
  }, []);

  return { accepted, rejected, increment };
}
