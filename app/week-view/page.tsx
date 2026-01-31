'use client';

import { useRouter } from 'next/navigation';
import { WeekView } from '@/components/calendar/week-view';

export default function WeekViewPage() {
  const router = useRouter();
  
  const handleDayClick = (date: Date) => {
    // Navigate to calendar with the selected date
    router.push('/calendar');
  };

  return <WeekView onDayClick={handleDayClick} />;
}
