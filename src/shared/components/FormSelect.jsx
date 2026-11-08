import SearchableSelect from '@/shared/components/SearchableSelect'

function FormSelect({
  id,
  name,
  value,
  onChange,
  options = [],
  placeholder,
  disabled = false,
  clearable = true,
  className = '',
  'aria-invalid': ariaInvalid,
}) {
  return (
    <SearchableSelect
      id={id}
      name={name}
      value={value}
      onChange={onChange}
      options={options}
      placeholder={placeholder ?? 'Search…'}
      disabled={disabled}
      clearable={clearable}
      className={className}
      emptyMessage="No matches"
      aria-invalid={ariaInvalid}
    />
  )
}

export default FormSelect
