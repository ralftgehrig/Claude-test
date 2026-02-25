import React, { useState } from 'react';

const EMPTY = { title: '', owner: '', dueDate: '' };

export default function ActionForm({ onAdd, onCancel, initial }) {
  const [form, setForm] = useState(initial || EMPTY);
  const [errors, setErrors] = useState({});

  function set(field, value) {
    setForm(f => ({ ...f, [field]: value }));
    setErrors(e => ({ ...e, [field]: undefined }));
  }

  function validate() {
    const e = {};
    if (!form.title.trim()) e.title = 'Action is required';
    if (!form.owner.trim()) e.owner = 'Owner is required';
    if (!form.dueDate) e.dueDate = 'Due date is required';
    return e;
  }

  function submit(e) {
    e.preventDefault();
    const errs = validate();
    if (Object.keys(errs).length) {
      setErrors(errs);
      return;
    }
    onAdd({ title: form.title.trim(), owner: form.owner.trim(), dueDate: form.dueDate });
    setForm(EMPTY);
  }

  const today = new Date().toISOString().split('T')[0];

  return (
    <form className="action-form" onSubmit={submit} noValidate>
      <div className="form-group">
        <label htmlFor="title">Action</label>
        <input
          id="title"
          type="text"
          placeholder="What needs to be done?"
          value={form.title}
          onChange={e => set('title', e.target.value)}
          className={errors.title ? 'error' : ''}
          autoFocus
        />
        {errors.title && <span className="error-msg">{errors.title}</span>}
      </div>

      <div className="form-row">
        <div className="form-group">
          <label htmlFor="owner">Owner</label>
          <input
            id="owner"
            type="text"
            placeholder="Who is responsible?"
            value={form.owner}
            onChange={e => set('owner', e.target.value)}
            className={errors.owner ? 'error' : ''}
          />
          {errors.owner && <span className="error-msg">{errors.owner}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="dueDate">Due Date</label>
          <input
            id="dueDate"
            type="date"
            min={today}
            value={form.dueDate}
            onChange={e => set('dueDate', e.target.value)}
            className={errors.dueDate ? 'error' : ''}
          />
          {errors.dueDate && <span className="error-msg">{errors.dueDate}</span>}
        </div>
      </div>

      <div className="form-actions">
        {onCancel && (
          <button type="button" className="btn btn-ghost" onClick={onCancel}>
            Cancel
          </button>
        )}
        <button type="submit" className="btn btn-primary">
          {initial ? 'Save Changes' : 'Add Action'}
        </button>
      </div>
    </form>
  );
}
