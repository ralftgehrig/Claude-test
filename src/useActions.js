import { useState, useEffect } from 'react';

const STORAGE_KEY = 'meeting-actions';

function loadActions() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
}

export function useActions() {
  const [actions, setActions] = useState(loadActions);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(actions));
  }, [actions]);

  function addAction(action) {
    setActions(prev => [
      { ...action, id: Date.now().toString(), done: false, createdAt: new Date().toISOString() },
      ...prev,
    ]);
  }

  function toggleDone(id) {
    setActions(prev =>
      prev.map(a => (a.id === id ? { ...a, done: !a.done } : a))
    );
  }

  function deleteAction(id) {
    setActions(prev => prev.filter(a => a.id !== id));
  }

  function editAction(id, updates) {
    setActions(prev =>
      prev.map(a => (a.id === id ? { ...a, ...updates } : a))
    );
  }

  return { actions, addAction, toggleDone, deleteAction, editAction };
}
