import React, { useState } from 'react';
import ActionForm from './ActionForm';

function formatDate(dateStr) {
  const [y, m, d] = dateStr.split('-');
  const date = new Date(+y, +m - 1, +d);
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}

function getDueBadge(dueDate, done) {
  if (done) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const [y, m, d] = dueDate.split('-');
  const due = new Date(+y, +m - 1, +d);
  const diffDays = Math.round((due - today) / 86400000);

  if (diffDays < 0) return { label: 'Overdue', cls: 'badge-overdue' };
  if (diffDays === 0) return { label: 'Due today', cls: 'badge-today' };
  if (diffDays <= 2) return { label: `${diffDays}d left`, cls: 'badge-soon' };
  return null;
}

function getInitials(name) {
  return name
    .split(/\s+/)
    .slice(0, 2)
    .map(w => w[0]?.toUpperCase() || '')
    .join('');
}

export default function ActionCard({ action, onToggle, onDelete, onEdit }) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);

  const badge = getDueBadge(action.dueDate, action.done);

  function handleEdit(updates) {
    onEdit(action.id, updates);
    setEditing(false);
  }

  if (editing) {
    return (
      <div className="card editing">
        <ActionForm
          initial={{ title: action.title, owner: action.owner, dueDate: action.dueDate }}
          onAdd={handleEdit}
          onCancel={() => setEditing(false)}
        />
      </div>
    );
  }

  return (
    <div className={`card ${action.done ? 'done' : ''}`}>
      <div className="card-main">
        <button
          className={`checkbox ${action.done ? 'checked' : ''}`}
          onClick={() => onToggle(action.id)}
          aria-label={action.done ? 'Mark incomplete' : 'Mark complete'}
        >
          {action.done && (
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M3 8l3.5 3.5L13 4.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          )}
        </button>

        <div className="card-content">
          <p className="card-title">{action.title}</p>
          <div className="card-meta">
            <div className="owner-chip">
              <span className="avatar">{getInitials(action.owner)}</span>
              <span>{action.owner}</span>
            </div>
            <div className="due-info">
              <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg" width="13" height="13">
                <rect x="2" y="3" width="12" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M5 1v3M11 1v3M2 7h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <span>{formatDate(action.dueDate)}</span>
            </div>
            {badge && <span className={`badge ${badge.cls}`}>{badge.label}</span>}
          </div>
        </div>

        <div className="card-actions">
          <button
            className="icon-btn"
            onClick={() => setEditing(true)}
            aria-label="Edit action"
          >
            <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M11.5 2.5a1.414 1.414 0 012 2L5 13H3v-2L11.5 2.5z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
          </button>

          {confirmDelete ? (
            <div className="delete-confirm">
              <button className="btn btn-danger btn-sm" onClick={() => onDelete(action.id)}>
                Delete
              </button>
              <button className="btn btn-ghost btn-sm" onClick={() => setConfirmDelete(false)}>
                Cancel
              </button>
            </div>
          ) : (
            <button
              className="icon-btn icon-btn-danger"
              onClick={() => setConfirmDelete(true)}
              aria-label="Delete action"
            >
              <svg viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M3 4h10M6 4V2h4v2M5 4l.5 9h5L11 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
