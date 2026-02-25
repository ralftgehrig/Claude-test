import React, { useState } from 'react';
import { useActions } from './useActions';
import ActionForm from './ActionForm';
import ActionCard from './ActionCard';

const FILTERS = [
  { id: 'all', label: 'All' },
  { id: 'open', label: 'Open' },
  { id: 'done', label: 'Done' },
];

export default function App() {
  const { actions, addAction, toggleDone, deleteAction, editAction } = useActions();
  const [filter, setFilter] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = actions.filter(a => {
    if (filter === 'open' && a.done) return false;
    if (filter === 'done' && !a.done) return false;
    const q = search.toLowerCase();
    if (q && !a.title.toLowerCase().includes(q) && !a.owner.toLowerCase().includes(q)) return false;
    return true;
  });

  const openCount = actions.filter(a => !a.done).length;

  function handleAdd(action) {
    addAction(action);
    setShowForm(false);
  }

  return (
    <div className="app">
      <header className="app-header">
        <div className="header-top">
          <div>
            <h1 className="app-title">Action Tracker</h1>
            <p className="app-subtitle">
              {openCount === 0 && actions.length > 0
                ? 'All actions completed!'
                : `${openCount} open action${openCount !== 1 ? 's' : ''}`}
            </p>
          </div>
          <button
            className="btn btn-primary fab"
            onClick={() => setShowForm(v => !v)}
            aria-label="Add action"
          >
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="18" height="18">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <span>New Action</span>
          </button>
        </div>

        {showForm && (
          <div className="form-wrapper">
            <ActionForm onAdd={handleAdd} onCancel={() => setShowForm(false)} />
          </div>
        )}
      </header>

      <div className="app-body">
        <div className="controls">
          <div className="search-box">
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="16" height="16">
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
              <path d="M10.5 10.5L13 13" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              type="search"
              placeholder="Search actions or owners…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
            {search && (
              <button className="clear-search" onClick={() => setSearch('')} aria-label="Clear search">
                ×
              </button>
            )}
          </div>

          <div className="filter-tabs">
            {FILTERS.map(f => (
              <button
                key={f.id}
                className={`filter-tab ${filter === f.id ? 'active' : ''}`}
                onClick={() => setFilter(f.id)}
              >
                {f.label}
                {f.id === 'open' && openCount > 0 && (
                  <span className="count-pill">{openCount}</span>
                )}
              </button>
            ))}
          </div>
        </div>

        <div className="action-list">
          {filtered.length === 0 ? (
            <div className="empty-state">
              {actions.length === 0 ? (
                <>
                  <div className="empty-icon">📋</div>
                  <p className="empty-title">No actions yet</p>
                  <p className="empty-subtitle">Tap "New Action" to track your first meeting action</p>
                </>
              ) : (
                <>
                  <div className="empty-icon">🔍</div>
                  <p className="empty-title">No matching actions</p>
                  <p className="empty-subtitle">Try adjusting your search or filter</p>
                </>
              )}
            </div>
          ) : (
            filtered.map(action => (
              <ActionCard
                key={action.id}
                action={action}
                onToggle={toggleDone}
                onDelete={deleteAction}
                onEdit={editAction}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}
