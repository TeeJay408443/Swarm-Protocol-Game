interface InputProps {
  type?: 'text' | 'email' | 'password' | 'number' | 'search'
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  label?: string
  error?: string
  disabled?: boolean
  className?: string
  id?: string
  name?: string
}

export function Input({
  type = 'text',
  value,
  onChange,
  placeholder,
  label,
  error,
  disabled = false,
  className = '',
  id,
  name,
}: InputProps) {
  const inputId = id || name
  
  return (
    <div className="w-full">
      {label && (
        <label 
          htmlFor={inputId}
          className="block text-sm text-gray-400 mb-1"
        >
          {label}
        </label>
      )}
      <input
        id={inputId}
        name={name}
        type={type}
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full bg-gray-800 border ${error ? 'border-alert-red' : 'border-gray-700'} rounded px-4 py-2 text-white focus:outline-none focus:border-cyan-accent transition-colors ${className}`}
      />
      {error && (
        <p className="text-xs text-alert-red mt-1">{error}</p>
      )}
    </div>
  )
}

export default Input
