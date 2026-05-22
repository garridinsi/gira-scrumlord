// SPDX-License-Identifier: GPL-3.0-or-later
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { auth } from '../api/client';

export function useMe() {
  return useQuery({
    queryKey: ['auth', 'me'],
    queryFn: () => auth.me(),
    retry: false,
    staleTime: 5 * 60 * 1000,
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => auth.logout(),
    onSuccess: () => {
      queryClient.clear();
    },
  });
}
