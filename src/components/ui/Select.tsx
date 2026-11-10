import type { ReactNode } from 'react'

interface SelectOption {
  value: string
  label: string
  disabled?: boolean
}

interface SelectProps {
  value: string
  onChange: (e: React.ChangeEvent<HTMLSelectElement>) => void
  options: SelectOption[]
  label?: string
  disabled?: boolean
  className?: string
  id?: string
  name?: string
  placeholder?: string
}

export function Select({
  value,
  onChange,
  options,
  label,
  disabled = false,
  className = '',
  id,
  name,
  placeholder = 'Select an option',
}: SelectProps) {
  const selectId = id || name
  
  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={selectId}
          className="block text-sm text-gray-400 mb-1"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        name={name}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className={`w-full bg-gray-800 border border-gray-700 rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-accent transition-colors ${className}`}
      >
        {placeholder && (
          <option value="" disabled hidden>
            {placeholder}
          </option>
        )}
        {options.map(option => (
          <option 
            key={option.value}
            value={option.value}
            disabled={option.disabled}
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  )
}

export default Select
