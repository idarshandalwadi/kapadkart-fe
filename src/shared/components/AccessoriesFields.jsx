import FormSelect from '@/shared/components/FormSelect'
import { FIELD_LIMITS } from '@/shared/constants/fieldLimits'

export const MOJDI_OPTIONS = [
  { value: 'Given', label: 'Given' },
  { value: 'Pending', label: 'Pending' },
  { value: 'N/A', label: 'N/A' },
]

function AccessoriesFields({ form, onChange, fieldErrors = {}, showHeading = true }) {
  const currentMojdi = String(form.mojdi ?? '').trim()
  const mojdiOptions =
    currentMojdi && !MOJDI_OPTIONS.some((option) => option.value === currentMojdi)
      ? [{ value: currentMojdi, label: currentMojdi }, ...MOJDI_OPTIONS]
      : MOJDI_OPTIONS

  return (
    <div className="form-field form-field-full overflow-visible">
      {showHeading && (
        <p className="m-0 text-[0.8rem] font-semibold tracking-[0.04em] text-text-secondary uppercase">
          Accessories
        </p>
      )}
      <div
        className={
          showHeading
            ? 'mt-2 grid grid-cols-1 gap-4 overflow-visible min-[560px]:grid-cols-2 min-[780px]:grid-cols-4'
            : 'grid grid-cols-1 gap-4 overflow-visible min-[560px]:grid-cols-2'
        }
      >
        <div className="form-field">
          <label htmlFor="choyani">Choyni</label>
          <input
            id="choyani"
            name="choyani"
            value={form.choyani}
            onChange={onChange}
            maxLength={FIELD_LIMITS.choyani}
            aria-invalid={Boolean(fieldErrors.choyani)}
          />
          {fieldErrors.choyani && <p className="field-error">{fieldErrors.choyani}</p>}
        </div>
        <div className="form-field">
          <label htmlFor="pant">Pant</label>
          <input
            id="pant"
            name="pant"
            value={form.pant}
            onChange={onChange}
            maxLength={FIELD_LIMITS.pant}
            aria-invalid={Boolean(fieldErrors.pant)}
          />
          {fieldErrors.pant && <p className="field-error">{fieldErrors.pant}</p>}
        </div>
        <div className="form-field">
          <label htmlFor="sol">Sholl</label>
          <input
            id="sol"
            name="sol"
            value={form.sol}
            onChange={onChange}
            maxLength={FIELD_LIMITS.sol}
            aria-invalid={Boolean(fieldErrors.sol)}
          />
          {fieldErrors.sol && <p className="field-error">{fieldErrors.sol}</p>}
        </div>
        <div className="form-field overflow-visible">
          <label htmlFor="mojdi">Mojdi / Shoe</label>
          <FormSelect
            id="mojdi"
            name="mojdi"
            value={form.mojdi || ''}
            onChange={onChange}
            placeholder="Select"
            options={mojdiOptions}
          />
        </div>
        <div className="form-field col-span-full">
          <label htmlFor="other_items">Other Items</label>
          <input
            id="other_items"
            name="other_items"
            value={form.other_items || ''}
            onChange={onChange}
            maxLength={FIELD_LIMITS.other_items}
            placeholder="custom/other items"
            aria-invalid={Boolean(fieldErrors.other_items)}
          />
          {fieldErrors.other_items && <p className="field-error">{fieldErrors.other_items}</p>}
        </div>
      </div>
    </div>
  )
}

export default AccessoriesFields
