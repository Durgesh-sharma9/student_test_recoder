import CountryCodeSelect from './CountryCodeSelect';
import { parsePhone } from '@/utils/countryCodes';
import { Input } from '@/components/ui/input';

export default function PhoneInputField({
  value = '+91',
  onChange,
  placeholder = "e.g. 9876543210",
  className = "",
  inputClassName = "",
  required = false,
  disabled = false,
  id,
  name,
}) {
  const { countryCode, number } = parsePhone(value);

  const handleCodeChange = (newCode) => {
    onChange?.(newCode + number);
  };

  const handleNumberChange = (e) => {
    const cleanDigits = e.target.value.replace(/\D/g, '');
    onChange?.(countryCode + cleanDigits);
  };

  return (
    <div className={`flex gap-2 items-center ${className}`}>
      <CountryCodeSelect
        value={countryCode}
        onChange={handleCodeChange}
        disabled={disabled}
      />
      <Input
        id={id}
        name={name}
        type="tel"
        value={number}
        onChange={handleNumberChange}
        placeholder={placeholder}
        required={required}
        disabled={disabled}
        className={`flex-1 h-9 text-sm rounded-lg bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-sm ${inputClassName}`}
      />
    </div>
  );
}
