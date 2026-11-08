import { useState } from 'react'
import { cn } from '@/shared/utils/cn'

function PasswordInput({ id, name, value, onChange, placeholder, autoComplete, ...rest }) {
  const [visible, setVisible] = useState(false)

  return (
    <div className={cn('relative flex items-center')}>
      <input
        id={id}
        name={name}
        type={visible ? 'text' : 'password'}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        autoComplete={autoComplete}
        className={cn(
          'w-full rounded-md border border-border bg-surface py-[0.6rem] pr-16 pl-[0.7rem] font-inherit text-[0.9rem] text-text transition-[border-color,box-shadow] duration-160',
          'focus:border-accent focus:shadow-[0_0_0_3px_rgba(217,119,6,0.28)] focus:outline-none',
        )}
        {...rest}
      />
      <button
        type="button"
        className={cn(
          'absolute right-2 cursor-pointer border-0 bg-transparent px-[0.4rem] py-[0.2rem] text-[0.75rem] font-semibold text-accent transition-colors duration-160',
          'hover:text-accent-hover',
        )}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? 'Hide password' : 'Show password'}
      >
        {visible ? 'Hide' : 'Show'}
      </button>
    </div>
  )
}

export default PasswordInput
