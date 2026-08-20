import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, buildUrl, type Scheme } from "@shared/routes";
import { type SavedScheme, type Application } from "@shared/schema";
import { apiRequest } from "@/lib/queryClient";
import { getDeviceId } from "./use-profile";

export type SavedSchemeWithDetails = {
  saved: SavedScheme;
  scheme: Scheme;
};

export type ApplicationWithDetails = {
  app: Application;
  scheme: Scheme;
};

export function useSavedSchemes() {
  const deviceId = getDeviceId();
  return useQuery<SavedSchemeWithDetails[]>({
    queryKey: ["/api/saved-schemes", deviceId],
    queryFn: async () => {
      const url = new URL(buildUrl(api.savedSchemes.list.path), window.location.origin);
      url.searchParams.append("deviceId", deviceId);
      const res = await fetch(url.pathname + url.search);
      if (!res.ok) throw new Error("Failed to fetch saved schemes");
      return res.json();
    },
    enabled: !!deviceId,
  });
}

export function useSaveScheme() {
  const queryClient = useQueryClient();
  const deviceId = getDeviceId();
  
  return useMutation({
    mutationFn: async (schemeId: number) => {
      const res = await apiRequest("POST", api.savedSchemes.create.path, { deviceId, schemeId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-schemes", deviceId] });
    },
  });
}

export function useRemoveSavedScheme() {
  const queryClient = useQueryClient();
  const deviceId = getDeviceId();
  
  return useMutation({
    mutationFn: async (schemeId: number) => {
      const url = buildUrl(api.savedSchemes.remove.path, { schemeId });
      const res = await apiRequest("DELETE", `${url}?deviceId=${deviceId}`);
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/saved-schemes", deviceId] });
    },
  });
}

export function useApplications() {
  const deviceId = getDeviceId();
  return useQuery<ApplicationWithDetails[]>({
    queryKey: ["/api/applications", deviceId],
    queryFn: async () => {
      const url = new URL(buildUrl(api.applications.list.path), window.location.origin);
      url.searchParams.append("deviceId", deviceId);
      const res = await fetch(url.pathname + url.search);
      if (!res.ok) throw new Error("Failed to fetch applications");
      return res.json();
    },
    enabled: !!deviceId,
  });
}

export function useCreateApplication() {
  const queryClient = useQueryClient();
  const deviceId = getDeviceId();
  
  return useMutation({
    mutationFn: async (schemeId: number) => {
      const res = await apiRequest("POST", api.applications.create.path, { deviceId, schemeId });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications", deviceId] });
      queryClient.invalidateQueries({ queryKey: ["/api/saved-schemes", deviceId] });
    },
  });
}

export function useUpdateApplicationStatus() {
  const queryClient = useQueryClient();
  const deviceId = getDeviceId();
  
  return useMutation({
    mutationFn: async ({ id, status }: { id: number; status: string }) => {
      const url = buildUrl(api.applications.updateStatus.path, { id });
      const res = await apiRequest("PATCH", url, { deviceId, status });
      return await res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/applications", deviceId] });
    },
  });
}
