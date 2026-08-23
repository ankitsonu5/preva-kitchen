import { redirect } from 'next/navigation';

export default function LegacyGuestListPage() {
  redirect('/#newsletter');
}
