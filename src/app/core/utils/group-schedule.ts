import { Group } from '../models/group.model';

export function getGroupScheduleParts(group: Pick<Group, 'schedule' | 'time'>) {
  const schedule = group.schedule.trim();
  const embeddedTime = schedule.match(/^(.*?)\s+(?:الساعة|الساعه)\s+(.+)$/);

  return {
    days: embeddedTime?.[1]?.trim() || schedule,
    time: group.time?.trim() || embeddedTime?.[2]?.trim() || 'يحدد مع المدرس',
  };
}
