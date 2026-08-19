'use client';

import { useEffect, useState } from 'react';

const KEY = 'wedding_session_id';

export function useSessionId() {
  const [sessionId, setSessionId] = useState('');

  useEffect(() => {
    let id = window.localStorage.getItem(KEY);
    if (!id) {
      id = crypto.randomUUID();
      window.localStorage.setItem(KEY, id);
    }
    setSessionId(id);
  }, []);

  return sessionId;
}
