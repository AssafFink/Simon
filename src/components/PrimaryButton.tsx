import type { ButtonHTMLAttributes, Ref } from 'react';
import './PrimaryButton.css';

type Props = ButtonHTMLAttributes<HTMLButtonElement> & { ref?: Ref<HTMLButtonElement> };

export default function PrimaryButton(props: Props) {
  return <button type="button" {...props} className="primary-button" />;
}
