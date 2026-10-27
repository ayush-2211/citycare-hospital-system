// Editable list of medicines for a prescription. Props: items, onChange(newItems)
const EMPTY = { medicine: '', dosage: '', frequency: '', durationDays: '', instructions: '' };

export default function MedicineEditor({ items, onChange }) {
  const update = (i, field, value) => onChange(items.map((it, idx) => (idx === i ? { ...it, [field]: value } : it)));
  const remove = (i) => onChange(items.filter((_, idx) => idx !== i));

  return (
    <div className="medicines">
      {items.map((it, i) => (
        <div className="medicine-row" key={i}>
          <div className="med-name">
            <label htmlFor={`m-${i}`}>Medicine</label>
            <input id={`m-${i}`} value={it.medicine} onChange={(e) => update(i, 'medicine', e.target.value)} placeholder="Paracetamol 500 mg" />
          </div>
          <div>
            <label htmlFor={`d-${i}`}>Dosage</label>
            <input id={`d-${i}`} value={it.dosage} onChange={(e) => update(i, 'dosage', e.target.value)} placeholder="1 tablet" />
          </div>
          <div>
            <label htmlFor={`f-${i}`}>Frequency</label>
            <input id={`f-${i}`} value={it.frequency} onChange={(e) => update(i, 'frequency', e.target.value)} placeholder="Twice daily" />
          </div>
          <div className="med-days">
            <label htmlFor={`n-${i}`}>Days</label>
            <input id={`n-${i}`} type="number" min="1" max="365" value={it.durationDays} onChange={(e) => update(i, 'durationDays', e.target.value)} />
          </div>
          <div className="med-ins">
            <label htmlFor={`i-${i}`}>Instructions <span className="muted">(optional)</span></label>
            <input id={`i-${i}`} value={it.instructions || ''} onChange={(e) => update(i, 'instructions', e.target.value)} placeholder="After food" />
          </div>
          <button type="button" className="btn danger small med-remove" onClick={() => remove(i)} aria-label={`Remove medicine ${i + 1}`}>Remove</button>
        </div>
      ))}
      <button type="button" className="btn secondary small" onClick={() => onChange([...items, { ...EMPTY }])}>+ Add medicine</button>
    </div>
  );
}
