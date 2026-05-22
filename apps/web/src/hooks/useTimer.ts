// SPDX-License-Identifier: GPL-3.0-or-later
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timers } from '../api/client';

export function useActiveTimer() {
  return useQuery({
    queryKey: ['timers', 'active'],
    queryFn: () => timers.active(),
    refetchInterval: 30_000, // poll every 30 seconds
    staleTime: 0,
  });
}

export function useStartTimer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (issueKey: string) => timers.start(issueKey),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['timers'] });
    },
  });
}

export function useStopTimer() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => timers.stop(),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['timers'] });
      void queryClient.invalidateQueries({ queryKey: ['worklogs'] });
    },
  });
}
