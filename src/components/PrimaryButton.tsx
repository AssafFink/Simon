import type { ButtonHTMLAttributes } from 'react';
import './PrimaryButton.css';

export default function PrimaryButton(props: ButtonHTMLAttributes<HTMLButtonElement>) {
  return <button type="button" {...props} className="primary-button" />;
}
