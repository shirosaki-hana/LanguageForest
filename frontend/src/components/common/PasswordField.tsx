import { useState } from 'react';
import { TextField, InputAdornment, IconButton, type TextFieldProps } from '@mui/material';
import { Visibility, VisibilityOff } from '@mui/icons-material';

type PasswordFieldProps = Omit<TextFieldProps, 'type' | 'InputProps'> & {
  value: string;
  onChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
};

export default function PasswordField({ value, onChange, ...props }: PasswordFieldProps) {
  const [showPassword, setShowPassword] = useState(false);

  return (
    <TextField
      {...props}
      type={showPassword ? 'text' : 'password'}
      value={value}
      onChange={onChange}
      InputProps={{
        endAdornment: (
          <InputAdornment position='end'>
            <IconButton aria-label='toggle password visibility' onClick={() => setShowPassword(!showPassword)} edge='end'>
              {showPassword ? <VisibilityOff /> : <Visibility />}
            </IconButton>
          </InputAdornment>
        ),
      }}
    />
  );
}
